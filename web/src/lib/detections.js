import { statusKey } from './status.js';

// The ONLY place that knows the raw detection format. The model pipeline
// (and the future /identify endpoint) emits records like:
//   { species, camera, timestamp, status: "Needs review", confidence, box, clipUrl?, frameUrl?, model? }
// `model` is the rockfish model's result JSON as returned (see rockfishModel.js and modelReadout.js).
// Everything else in the app works with the normalized shape returned here.
export function normalizeDetection(raw) {
  return {
    id: String(raw.id),
    speciesId: raw.speciesId ?? raw.species,
    cameraId: raw.cameraId ?? raw.camera,
    timestamp: raw.timestamp,
    status: statusKey(raw.status),
    confidence: Number(raw.confidence),
    box: normalizeBox(raw.box),
    clipUrl: raw.clipUrl ?? null,
    frameUrl: raw.frameUrl ?? null,
    confirmedBy: raw.confirmedBy ?? null,
    model: raw.model ?? null,
  };
}

// Box is fractions of frame width/height (0–1). Accept [x, y, w, h] too.
function normalizeBox(box) {
  if (!box) return null;
  const [x, y, w, h] = Array.isArray(box) ? box : [box.x, box.y, box.w, box.h];
  return { x, y, w, h };
}

// How a clip that reached agreement is handed to the map.
export function toConfirmedDetection(detection) {
  return { ...detection, status: 'identified', confirmedBy: 'consensus' };
}
