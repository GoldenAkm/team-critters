import { useSyncExternalStore } from 'react';
import * as store from './playerStore.js';

// Shared player state (localStorage). Digital Fishers writes; the Marine collection reads.
let state = load();
const listeners = new Set();

function load() {
  try {
    return store.parsePlayer(localStorage.getItem(store.STORAGE_KEY));
  } catch {
    return store.emptyPlayer();
  }
}

function update(fn) {
  state = fn(state);
  try {
    localStorage.setItem(store.STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private mode or blocked storage: keep going in memory.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const actions = {
  collect: (speciesId, cameraId, date = new Date().toISOString().slice(0, 10)) =>
    update((s) => store.collect(s, speciesId, cameraId, date)),
  addSighting: (speciesId, cameraId) => update((s) => store.addSighting(s, speciesId, cameraId)),
  addPoints: (n) => update((s) => store.addPoints(s, n)),
  markReviewed: (missionId, matched) => update((s) => store.markReviewed(s, missionId, matched)),
  markPending: (speciesId, clipId) => update((s) => store.markPending(s, speciesId, clipId)),
  addConfirmation: (detection) => update((s) => store.addConfirmation(s, detection)),
  reset: () => update(() => store.emptyPlayer()),
};

export function useCollection() {
  const player = useSyncExternalStore(subscribe, () => state);
  return { player, ...actions };
}
