// Single loader for static data so real ONC data can replace the sample JSON without code changes.
import species from '../data/species.json'
import cameras from '../data/cameras.json'
import detections from '../data/detections.json'
import env from '../data/env.json'
import footage from '../data/footage.json'
import sources from '../data/sources.json'

export { species, cameras, detections, env, footage, sources }

// Real ONC archives tell us whether footage exists, not whether it was clear. Until the model
// rates clarity, "clear" only means "footage recorded" and murky weeks cannot be shown.
export const footageQualityAssessed = footage.qualityAssessed !== false

export const WEEK_MS = 7 * 86400000
export const weekStartMs = Date.parse(env.weekStart + 'T00:00:00Z')
export const WEEKS = env.weeks

export function weekOf(timestamp) {
  return Math.floor((Date.parse(timestamp) - weekStartMs) / WEEK_MS)
}

export function weekDate(w) {
  return new Date(weekStartMs + w * WEEK_MS)
}
