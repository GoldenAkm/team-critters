// Status words are fixed across the product: Identified, Uncertain, Needs review.
export const STATUS = {
  identified: { label: 'Identified', meaning: 'Key features visible; counted as confirmed.' },
  uncertain: { label: 'Uncertain', meaning: 'Not enough evidence; not counted.' },
  needs_review: { label: 'Needs review', meaning: 'Waiting for people to check.' },
};

const ALIASES = {
  identified: 'identified',
  uncertain: 'uncertain',
  'needs review': 'needs_review',
  needs_review: 'needs_review',
};

export function statusKey(value) {
  const key = ALIASES[String(value ?? '').trim().toLowerCase()];
  if (!key) throw new Error(`Unknown status: ${value}`);
  return key;
}

// Detections the AI could not settle; these are the ones people review.
export const REVIEWABLE = new Set(['uncertain', 'needs_review']);
