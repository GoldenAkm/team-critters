// Frames the Interactive Map sent to Digital Fishers after the rockfish model said Needs review or Uncertain.
// Stored in this browser only (localStorage) until there is a shared backend; Digital Fishers shows them first.
// Each entry holds a raw detection (same fields as public/data/detections.json) and its review clip.

const KEY = 'critters.reviewQueue.v1';

export function readReviewQueue() {
  try {
    const items = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

export function isQueued(id) {
  return readReviewQueue().some((item) => item.detection.id === id);
}

// Returns true if it was added (false if it was already there or storage is unavailable).
export function addToReviewQueue({ detection, clip }) {
  try {
    const items = readReviewQueue();
    if (items.some((item) => item.detection.id === detection.id)) return false;
    localStorage.setItem(KEY, JSON.stringify([{ detection, clip, addedAt: new Date().toISOString() }, ...items]));
    return true;
  } catch {
    return false;
  }
}
