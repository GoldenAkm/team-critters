import { normalizeDetection } from './detections.js';
import { REVIEWABLE } from './status.js';
import { readReviewQueue } from './reviewQueue.js';

const BASE = `${import.meta.env.BASE_URL}data/`;

async function getJson(name) {
  const res = await fetch(`${BASE}${name}`);
  if (!res.ok) throw new Error(`Could not load ${name} (${res.status})`);
  return res.json();
}

// Loads everything the review page needs and joins clips to their detection,
// species and camera. Swap the JSON files for real output; this stays the same.
export async function loadReviewData() {
  const [speciesFile, camerasFile, detectionsFile, clipsFile] = await Promise.all([
    getJson('species.json'),
    getJson('cameras.json'),
    getJson('detections.json'),
    getJson('reviewClips.json'),
  ]);

  // Frames the Interactive Map sent here after the rockfish model said "Needs review" come first.
  const queued = readReviewQueue();
  const rawDetections = [...queued.map((q) => q.detection), ...detectionsFile.detections];
  const rawClips = [...queued.map((q) => q.clip), ...clipsFile.clips];

  const species = speciesFile.species;
  const speciesById = Object.fromEntries(species.map((s) => [s.id, s]));
  const camerasById = Object.fromEntries(camerasFile.cameras.map((c) => [c.id, c]));
  const detectionsById = Object.fromEntries(
    rawDetections.map((d) => {
      const n = normalizeDetection(d);
      return [n.id, n];
    }),
  );

  const clips = rawClips
    .map((clip) => {
      const detection = detectionsById[clip.detectionId];
      if (!detection || !REVIEWABLE.has(detection.status)) return null;
      const sp = speciesById[detection.speciesId];
      return {
        ...clip,
        detection,
        species: sp,
        camera: camerasById[detection.cameraId],
        question: clip.question ?? `Is the highlighted animal a ${sp.name.toLowerCase()}?`,
        lookAlikes: clip.lookAlikes.map((l) =>
          speciesById[l] ? { id: l, name: speciesById[l].name } : { id: null, name: l },
        ),
      };
    })
    .filter(Boolean);

  return {
    species,
    speciesById,
    camerasById,
    clips,
    missions: Object.fromEntries((clipsFile.missions ?? []).map((m) => [m.id, m])),
    comingSoonSlots: speciesFile.comingSoonSlots ?? 0,
  };
}
