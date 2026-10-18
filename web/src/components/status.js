// Shared status vocabulary (map-build.md §3). Move/merge once src/shared ownership is agreed.
export const STATUSES = [
  { id: 'identified', label: 'Identified', hint: 'Enough visual evidence. Counted as a sighting.' },
  { id: 'uncertain', label: 'Uncertain', hint: 'Not enough evidence. Never counted as confirmed.' },
  { id: 'needs_review', label: 'Needs review', hint: 'Waiting for people in Digital Fishers 2.0.' },
]

export const STATUS_LABEL = Object.fromEntries(STATUSES.map((s) => [s.id, s.label]))

export const FOOTAGE_LABEL = { clear: 'Clear footage', murky: 'Murky footage', none: 'No footage' }

export function footageLabel(state, qualityAssessed) {
  return state === 'clear' && !qualityAssessed ? 'Footage recorded (clarity not assessed)' : FOOTAGE_LABEL[state]
}
