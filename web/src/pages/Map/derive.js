// Pure helpers that turn the static data + current filters into what the map shows.
import { cameras, sources, yearData, weekOf, weekDate, WEEKS } from '../../components/data.js'
import { ONC } from '../../components/oncTheme.js'

export const cameraById = Object.fromEntries(cameras.map((c) => [c.id, c]))

// Area bubbles shown at low zoom (map-build.md §5.1)
export const BUBBLE_GROUPS = [
  { id: 'bc_north', name: 'BC North Coast', match: (c) => c.area === 'BC North Coast' },
  { id: 'southern_bc', name: 'Southern BC', match: (c) => c.region === 'Pacific' && c.area !== 'BC North Coast' },
  { id: 'arctic', name: 'Arctic', match: (c) => c.region === 'Arctic' },
  { id: 'atlantic', name: 'Atlantic', match: (c) => c.region === 'Atlantic' },
].map((g) => {
  const members = cameras.filter(g.match)
  const lat = members.reduce((s, c) => s + c.lat, 0) / members.length
  const lon = members.reduce((s, c) => s + c.lon, 0) / members.length
  return { ...g, cameraIds: members.map((c) => c.id), center: [lat, lon], bounds: members.map((c) => [c.lat, c.lon]) }
})

export const BUBBLE_ZOOM = 5

// Each map dot is an ONC camera site; a site can have several underwater cameras (fetch-onc-data.mjs lists them
// per year). Names drop ONC's " Underwater Network" suffix, e.g. "Hartley Bay".
export function camerasAt(siteId, year) {
  const row = sources.sitesByYear[year]?.find((r) => r.cameraId === siteId)
  return (row?.cameraLocations || []).map((c) => (sources.cameraLocationNames?.[c] || c).replace(/ Underwater Network$/, ''))
}
export const cameraTotal = (year) => (sources.sitesByYear[year] || []).reduce((n, r) => n + r.cameraLocations.length, 0)

// Region › area › camera tree; an area named like its region is collapsed into the region.
export function cameraTree() {
  const regions = []
  for (const c of cameras) {
    let r = regions.find((x) => x.name === c.region)
    if (!r) regions.push((r = { name: c.region, areas: [], cameras: [] }))
    if (c.area === c.region) { r.cameras.push(c); continue }
    let a = r.areas.find((x) => x.name === c.area)
    if (!a) r.areas.push((a = { name: c.area, cameras: [] }))
    a.cameras.push(c)
  }
  return regions
}

export function filterDetections(detections, { speciesOn, statusOn, range, year }) {
  return detections.filter((d) => {
    const w = weekOf(d.timestamp, year)
    return speciesOn.has(d.speciesId) && statusOn[d.status] && w >= range[0] && w <= range[1]
  })
}

export function countBy(list, key) {
  const out = {}
  for (const x of list) out[x[key]] = (out[x[key]] || 0) + 1
  return out
}

export function envAverage(cameraId, measure, range, year) {
  const arr = yearData(year).env.cameras[cameraId]?.[measure === 'temp' ? 'tempC' : 'oxygenMgL'] || []
  let sum = 0, n = 0
  for (let w = range[0]; w <= range[1]; w++) if (arr[w] != null) { sum += arr[w]; n++ }
  return n ? sum / n : null
}

// Weekly mean across a set of cameras (for the readout-tile sparklines)
export function envSeries(cameraIds, measure, year) {
  const key = measure === 'temp' ? 'tempC' : 'oxygenMgL'
  const env = yearData(year).env
  return Array.from({ length: WEEKS }, (_, w) => {
    const vals = cameraIds.map((id) => env.cameras[id]?.[key][w]).filter((v) => v != null)
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
  })
}

// Per week: share of cameras in view with clear footage, or null when none had any footage.
export function footageStrip(cameraIds, year) {
  const footage = yearData(year).footage
  return Array.from({ length: WEEKS }, (_, w) => {
    const states = cameraIds.map((id) => footage.cameras[id]?.[w] || 'none')
    if (!states.length || states.every((s) => s === 'none')) return null
    return states.filter((s) => s === 'clear').length / states.length
  })
}

export function fmtDate(d, opts = { month: 'short', day: 'numeric' }) {
  return d.toLocaleDateString('en-CA', { timeZone: 'UTC', ...opts })
}

export function periodLabel(range, year) {
  const end = new Date(weekDate(range[1], year).getTime() + 6 * 86400000)
  return `${fmtDate(weekDate(range[0], year))} – ${fmtDate(end)}`
}

// Week index of the first week of each month, for axis labels (every year's weeks start on Jan 1).
export const MONTH_TICKS = Array.from({ length: 12 }, (_, m) => {
  const d = Date.UTC(2025, m, 1)
  return { w: Math.round((d - Date.UTC(2025, 0, 1)) / (7 * 86400000)), label: fmtDate(new Date(d), { month: 'short' }) }
})

// Colour ramps for the environmental layer (value is always printed too, never colour alone).
export function envColor(measure, v) {
  if (v == null) return '#cccccc'
  const t = measure === 'temp' ? clamp((v + 2) / 16) : clamp(v / 10)
  // ONC SeaTube accents — temp: cold blue -> warm orange; oxygen: low red -> high blue
  const [a, b] = measure === 'temp' ? [hexRgb(ONC.blue), hexRgb(ONC.orange)] : [hexRgb(ONC.red), hexRgb(ONC.blue)]
  const c = a.map((x, i) => Math.round(x + (b[i] - x) * t))
  return `rgb(${c.join(',')})`
}

export function envHaloPx(measure, v) {
  if (v == null) return 0
  return 14 + 22 * (measure === 'temp' ? clamp((v + 2) / 16) : clamp(v / 10))
}

export const fmtEnv = (measure, v) => (v == null ? 'no data' : measure === 'temp' ? `${v.toFixed(1)} °C` : `${v.toFixed(1)} mg/L`)

const clamp = (t) => Math.min(1, Math.max(0, t))
const hexRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
