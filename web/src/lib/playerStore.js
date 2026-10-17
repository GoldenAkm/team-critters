// Pure state transitions for the shared player record. The Marine collection reads the same store.
export const STORAGE_KEY = 'critters.player.v1';

export function emptyPlayer() {
  return { points: 0, reviewed: 0, matched: 0, collected: {}, pending: {}, missions: {}, confirmations: [] };
}

export function collect(state, speciesId, cameraId, date) {
  if (state.collected[speciesId]) return addSighting(state, speciesId, cameraId);
  const { [speciesId]: _, ...pending } = state.pending;
  return {
    ...state,
    pending,
    collected: { ...state.collected, [speciesId]: { firstAt: cameraId, date, sightings: 1, cameras: [cameraId] } },
  };
}

export function addSighting(state, speciesId, cameraId) {
  const entry = state.collected[speciesId];
  if (!entry) return state;
  const cameras = cameraId && !entry.cameras?.includes(cameraId) ? [...(entry.cameras ?? []), cameraId] : entry.cameras;
  return { ...state, collected: { ...state.collected, [speciesId]: { ...entry, sightings: entry.sightings + 1, cameras } } };
}

export function addPoints(state, n) {
  return { ...state, points: state.points + n };
}

// matched: the answer agreed with a completed consensus (what the leaderboard ranks by).
export function markReviewed(state, missionId, matched = false) {
  const missions = missionId ? { ...state.missions, [missionId]: (state.missions[missionId] ?? 0) + 1 } : state.missions;
  return { ...state, reviewed: state.reviewed + 1, matched: state.matched + (matched ? 1 : 0), missions };
}

export function markPending(state, speciesId, clipId) {
  if (state.collected[speciesId]) return state;
  const list = state.pending[speciesId] ?? [];
  if (list.includes(clipId)) return state;
  return { ...state, pending: { ...state.pending, [speciesId]: [...list, clipId] } };
}

export function addConfirmation(state, detection) {
  return { ...state, confirmations: [...state.confirmations.filter((d) => d.id !== detection.id), detection] };
}

export function parsePlayer(json) {
  try {
    return { ...emptyPlayer(), ...JSON.parse(json) };
  } catch {
    return emptyPlayer();
  }
}
