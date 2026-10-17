// Generates ILLUSTRATIVE sample data for the map in the shapes defined in map-build.md §3.
// Run: npm run sample-data. Replace the JSON in src/data/ with real ONC data when available.
// With --detections-only, keeps the real ONC cameras/env/footage (npm run onc-data) and only
// regenerates sample detections, so they follow real footage gaps and temperatures.
import { readFileSync, writeFileSync } from 'node:fs'

const OUT = new URL('../src/data/', import.meta.url)
const WEEK_START = '2025-01-01'
const WEEKS = 52

// Deterministic PRNG so the sample data is stable between runs
let seed = 20251017
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296)
const round = (v, d = 1) => Math.round(v * 10 ** d) / 10 ** d

const species = [
  {
    id: 'green_crab', name: 'European green crab', sci: 'Carcinus maenas', tag: 'Invasive', shape: 'square', model: 'green-crab',
    features: ['Five spines on each side of the shell edge, behind the eyes', 'Three rounded bumps between the eyes'],
    blurb: 'Invasive on both the Pacific and Atlantic coasts of Canada. Competes with native crabs and damages eelgrass habitat.',
  },
  {
    id: 'rockfish', name: 'Rockfish', sci: 'Sebastes spp.', tag: 'Some species at risk', shape: 'circle', model: 'rockfish',
    features: ['Spiny dorsal fin running most of the back', 'Large eyes and a bony ridge under each eye'],
    blurb: 'Long-lived fish that can take decades to mature. Several BC rockfish species are listed as at risk, so populations recover slowly from overfishing.',
  },
  {
    id: 'lingcod', name: 'Lingcod', sci: 'Ophiodon elongatus', tag: 'Species of interest', shape: 'triangle', model: 'lingcod',
    features: ['Long body with a large mouth and many sharp teeth', 'Mottled brown-grey colouring; one long continuous dorsal fin'],
    blurb: 'A top predator on rocky reefs. Not a true cod. Males guard egg masses in winter, which makes them sensitive to disturbance.',
  },
]

const cameras = [
  ['cambridge_bay', 'Cambridge Bay', 'Arctic', 'Arctic', 69.11, -105.06],
  ['minas_passage', 'Minas Passage', 'Atlantic', 'Bay of Fundy', 45.37, -64.40],
  ['conception_bay', 'Conception Bay', 'Atlantic', 'Atlantic', 47.50, -53.00],
  ['chatham_sound', 'Chatham Sound', 'Pacific', 'BC North Coast', 54.30, -130.40],
  ['douglas_channel', 'Douglas Channel', 'Pacific', 'BC North Coast', 53.70, -129.10],
  ['barkley_canyon', 'Barkley Canyon', 'Pacific', 'Northeast Pacific Ocean', 48.31, -126.06],
  ['barkley_sound', 'Barkley Sound', 'Pacific', 'Northeast Pacific Ocean', 48.85, -125.25],
  ['cascadia_basin', 'Cascadia Basin', 'Pacific', 'Northeast Pacific Ocean', 47.76, -127.76],
  ['clayoquot_slope', 'Clayoquot Slope', 'Pacific', 'Northeast Pacific Ocean', 48.67, -126.85],
  ['endeavour', 'Endeavour', 'Pacific', 'Northeast Pacific Ocean', 47.95, -129.10],
  ['discovery_passage', 'Discovery Passage', 'Pacific', 'Salish Sea', 50.04, -125.27],
  ['saanich_inlet', 'Saanich Inlet', 'Pacific', 'Salish Sea', 48.65, -123.49],
  ['strait_of_georgia', 'Strait of Georgia', 'Pacific', 'Salish Sea', 49.04, -123.42],
  ['china_creek', 'China Creek', 'Pacific', 'Vancouver Island', 49.20, -124.80],
].map(([id, name, region, area, lat, lon]) => ({ id, name, region, area, lat, lon }))

const DEEP = new Set(['barkley_canyon', 'cascadia_basin', 'clayoquot_slope', 'endeavour'])
const MURKY_SPRING_SUMMER = new Set(['saanich_inlet', 'strait_of_georgia', 'chatham_sound', 'douglas_channel', 'china_creek'])
const OUTAGES = { endeavour: [[20, 25]], cambridge_bay: [[0, 7], [46, 51]], barkley_sound: [[33, 35]] }

// Seasonal curve peaking late July (~week 29)
const season = (w) => (Math.cos(((w - 29) / WEEKS) * 2 * Math.PI) + 1) / 2

const DETECTIONS_ONLY = process.argv.includes('--detections-only')
const read = (name) => JSON.parse(readFileSync(new URL(name, OUT), 'utf8'))
const env = DETECTIONS_ONLY ? read('env.json') : { weekStart: WEEK_START, weeks: WEEKS, cameras: {} }
const footage = DETECTIONS_ONLY ? read('footage.json') : { weekStart: WEEK_START, weeks: WEEKS, cameras: {} }

for (const c of DETECTIONS_ONLY ? [] : cameras) {
  let base, amp, oxBase, oxAmp
  if (DEEP.has(c.id)) [base, amp, oxBase, oxAmp] = [2 + rand() * 2, 0.6, 0.6 + rand() * 0.8, 0.3]
  else if (c.id === 'cambridge_bay') [base, amp, oxBase, oxAmp] = [-1.5, 4, 8.5, -1]
  else if (c.region === 'Atlantic') [base, amp, oxBase, oxAmp] = [1, 12, 9, -2.5]
  else [base, amp, oxBase, oxAmp] = [7, 5 + rand() * 1.5, 8.5, -3]

  const tempC = [], oxygenMgL = [], fs = []
  for (let w = 0; w < WEEKS; w++) {
    const s = season(w)
    let ox = oxBase + oxAmp * s + (rand() - 0.5) * 0.4
    // Saanich Inlet: seasonal hypoxia in late summer / fall
    if (c.id === 'saanich_inlet') ox = 6.5 - 5.2 * Math.exp(-(((w - 38) / 6) ** 2)) + (rand() - 0.5) * 0.4

    let f = 'clear'
    const r = rand()
    if (MURKY_SPRING_SUMMER.has(c.id) && w >= 13 && w <= 34) f = r < 0.55 ? 'murky' : 'clear'
    else if (c.id === 'minas_passage') f = r < 0.6 ? 'murky' : 'clear'
    else if (r < 0.08) f = 'murky'
    if ((OUTAGES[c.id] || []).some(([a, b]) => w >= a && w <= b)) f = 'none'

    const sensorGap = f === 'none' && rand() < 0.5
    tempC.push(sensorGap ? null : round(base + amp * s + (rand() - 0.5) * 0.6))
    oxygenMgL.push(sensorGap ? null : round(Math.max(0.2, ox)))
    fs.push(f)
  }
  env.cameras[c.id] = { tempC, oxygenMgL }
  footage.cameras[c.id] = fs
}

// Which species occur where (placeholder — real occurrence is an open item)
const occurrence = {
  green_crab: { barkley_sound: 0.35, china_creek: 0.3, minas_passage: 0.25, conception_bay: 0.2 },
  rockfish: { saanich_inlet: 0.4, strait_of_georgia: 0.35, discovery_passage: 0.3, barkley_sound: 0.25, chatham_sound: 0.25, douglas_channel: 0.2, barkley_canyon: 0.15 },
  lingcod: { strait_of_georgia: 0.25, discovery_passage: 0.3, saanich_inlet: 0.2, chatham_sound: 0.15 },
}

const detections = []
const start = Date.parse(WEEK_START + 'T00:00:00Z')
for (const [speciesId, sites] of Object.entries(occurrence)) {
  for (const [cameraId, p] of Object.entries(sites)) {
    for (let w = 0; w < WEEKS; w++) {
      const f = footage.cameras[cameraId][w]
      if (f === 'none') continue // no footage, no detections — never absence
      const temp = env.cameras[cameraId].tempC[w]
      const warm = temp == null ? 0.5 : Math.min(1, Math.max(0, (temp - 2) / 10))
      const lambda = p * (f === 'murky' ? 0.35 : 1) * (0.4 + 1.2 * warm)
      let n = 0
      while (rand() < lambda / (n + 1) && n < 4) n++
      for (let i = 0; i < n; i++) {
        const r = rand()
        const murky = f === 'murky'
        const status = r < (murky ? 0.45 : 0.75) ? 'identified' : r < (murky ? 0.7 : 0.88) ? 'needs_review' : 'uncertain'
        const confidence = status === 'identified' ? 0.82 + rand() * 0.16 : status === 'needs_review' ? 0.55 + rand() * 0.25 : 0.25 + rand() * 0.3
        const t = new Date(start + (w * 7 + rand() * 7) * 86400000)
        t.setUTCSeconds(0, 0)
        const bw = 0.12 + rand() * 0.14, bh = 0.12 + rand() * 0.14
        detections.push({
          id: '', speciesId, cameraId,
          timestamp: t.toISOString().replace('.000Z', 'Z'),
          status, confidence: round(confidence, 2),
          box: { x: round(rand() * (1 - bw), 2), y: round(rand() * (1 - bh), 2), w: round(bw, 2), h: round(bh, 2) },
          clipUrl: null, frameUrl: null,
          confirmedBy: status === 'identified' ? (rand() < 0.2 ? 'consensus' : 'ai') : null,
        })
      }
    }
  }
}
detections.sort((a, b) => a.timestamp.localeCompare(b.timestamp)).forEach((d, i) => (d.id = 'd' + (i + 1)))

const write = (name, data) => writeFileSync(new URL(name, OUT), JSON.stringify(data, null, 2) + '\n')
write('species.json', species)
write('detections.json', detections)
if (!DETECTIONS_ONLY) {
  write('cameras.json', cameras)
  write('env.json', env)
  write('footage.json', footage)
}
console.log(`Wrote ${species.length} species, ${detections.length} detections${DETECTIONS_ONLY ? '' : `, ${cameras.length} cameras, env, footage`}`)
