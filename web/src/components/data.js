// Single loader for static data so real ONC data can replace the JSON without code changes.
// env/<year>.json and footage/<year>.json each follow the map-build.md §3 shapes for one year.
import species from '../data/species.json'
import cameras from '../data/cameras.json'
import detections from '../data/detections.json'
import sources from '../data/sources.json'
import sightingsMeta from '../data/sightings_meta.json'

const envFiles = import.meta.glob('../data/env/*.json', { eager: true, import: 'default' })
const footageFiles = import.meta.glob('../data/footage/*.json', { eager: true, import: 'default' })
const yearOf = (path) => +path.match(/(\d{4})\.json$/)[1]

const byYear = {}
for (const [path, env] of Object.entries(envFiles)) byYear[yearOf(path)] = { env }
for (const [path, footage] of Object.entries(footageFiles)) (byYear[yearOf(path)] ||= {}).footage = footage

export const YEARS = Object.keys(byYear).map(Number).sort()
export const WEEK_MS = 7 * 86400000
export const WEEKS = 52

for (const y of YEARS) byYear[y].weekStartMs = Date.parse(byYear[y].env.weekStart + 'T00:00:00Z')

export function yearData(year) {
  return byYear[year]
}

// Default to the year with the most identified sightings
export const DEFAULT_YEAR = YEARS.reduce((best, y) => {
  const n = (yr) => detections.filter((d) => d.status === 'identified' && +d.timestamp.slice(0, 4) === yr).length
  return n(y) > n(best) ? y : best
}, YEARS[YEARS.length - 1])

export { species, cameras, detections, sources, sightingsMeta }

// Real ONC archives tell us whether footage exists, not whether it was clear. Until the model
// rates clarity, "clear" only means "footage recorded" and murky weeks cannot be shown.
export const footageQualityAssessed = Object.values(byYear).every((y) => y.footage?.qualityAssessed !== false)

// Week index within `year`, or -1 if the timestamp is in another year. Dec 30/31 fold into the last week.
export function weekOf(timestamp, year) {
  if (+timestamp.slice(0, 4) !== year) return -1
  return Math.min(WEEKS - 1, Math.floor((Date.parse(timestamp) - byYear[year].weekStartMs) / WEEK_MS))
}

export function weekDate(w, year) {
  return new Date(byYear[year].weekStartMs + w * WEEK_MS)
}
