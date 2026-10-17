// Pulls real ONC data for the map into src/data/ (map-build.md §3 shapes):
//   cameras.json  – coordinates of each site's underwater camera (or sensor platform if no camera in the year)
//   env.json      – weekly mean water temperature (°C) and dissolved oxygen (mg/L)
//   footage.json  – weekly footage availability from the video archive (clarity is NOT assessed here)
//   sources.json  – ONC dataset citations + what each site was mapped to
// Detections stay as sample data (npm run sample-data -- --detections-only) until the model produces real ones.
//
// Run: npm run onc-data   (needs ONC_TOKEN in web/.env.local — never commit it, never prefix it with VITE_)
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const OUT = new URL('../src/data/', import.meta.url)
const API = 'https://data.oceannetworks.ca/api'
const YEAR = 2025
const WEEK_START = `${YEAR}-01-01`
const WEEKS = 52
const ML_TO_MG_O2 = 1.429 // ml/L -> mg/L for dissolved oxygen

const envFile = new URL('../.env.local', import.meta.url)
if (!process.env.ONC_TOKEN && existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*ONC_TOKEN\s*=\s*(.+?)\s*$/)
    if (m) process.env.ONC_TOKEN = m[1]
  }
}
const TOKEN = process.env.ONC_TOKEN
if (!TOKEN) { console.error('Missing ONC_TOKEN (set it in web/.env.local)'); process.exit(1) }

// Site -> ONC locations. Cameras are underwater platforms only (shore-station cameras are excluded).
// Chosen from /locations/tree + /deployments active in 2025. Re-check if the year changes.
const SITES = [
  { id: 'cambridge_bay', name: 'Cambridge Bay', region: 'Arctic', area: 'Arctic', onc: 'CBY', cams: ['CBYIP'], ctd: 'CBYIP', oxy: 'CBYIP' },
  { id: 'minas_passage', name: 'Minas Passage', region: 'Atlantic', area: 'Bay of Fundy', onc: 'MIN', cams: ['BFSS'], ctd: null, oxy: null },
  { id: 'conception_bay', name: 'Conception Bay', region: 'Atlantic', area: 'Atlantic', onc: 'AAEJB', cams: ['HRBIP'], ctd: 'HRBIP', oxy: 'HRBIP' },
  { id: 'chatham_sound', name: 'Chatham Sound', region: 'Pacific', area: 'BC North Coast', onc: 'JCMWR', cams: ['DIIP'], ctd: 'DIIP.C1', oxy: 'DIIP.O1' },
  { id: 'douglas_channel', name: 'Douglas Channel', region: 'Pacific', area: 'BC North Coast', onc: 'DC', cams: ['HBIP', 'KVIP'], ctd: 'HBIP', oxy: 'HBIP' },
  { id: 'barkley_canyon', name: 'Barkley Canyon', region: 'Pacific', area: 'Northeast Pacific Ocean', onc: 'BAC', cams: ['BACAX', 'BACUS', 'BACVP'], ctd: 'BACAX', oxy: 'BACAX' },
  { id: 'barkley_sound', name: 'Barkley Sound', region: 'Pacific', area: 'Northeast Pacific Ocean', onc: 'JATTD', cams: ['FGPPN'], ctd: 'FGPPN', oxy: 'FGPPN' },
  { id: 'cascadia_basin', name: 'Cascadia Basin', region: 'Pacific', area: 'Northeast Pacific Ocean', onc: 'CBN', cams: ['CBC27'], ctd: 'NC27', oxy: 'NC27' },
  { id: 'clayoquot_slope', name: 'Clayoquot Slope', region: 'Pacific', area: 'Northeast Pacific Ocean', onc: 'CQS', cams: ['NC89'], ctd: 'NC89', oxy: 'NC89' },
  { id: 'endeavour', name: 'Endeavour', region: 'Pacific', area: 'Northeast Pacific Ocean', onc: 'END', cams: ['KEMFT', 'KEMO'], ctd: 'ENEF', oxy: 'ENEF' },
  { id: 'discovery_passage', name: 'Discovery Passage', region: 'Pacific', area: 'Salish Sea', onc: 'DISC', cams: ['CRIP'], ctd: 'CRIP.C1', oxy: 'CRIP.O1' },
  { id: 'saanich_inlet', name: 'Saanich Inlet', region: 'Pacific', area: 'Salish Sea', onc: 'SAAN', cams: ['MBYIP'], ctd: 'PVIP.C1', oxy: 'PVIP.O2' },
  { id: 'strait_of_georgia', name: 'Strait of Georgia', region: 'Pacific', area: 'Salish Sea', onc: 'SOG', cams: ['SCVIP'], ctd: 'SCVIP', oxy: 'SCVIP' },
  { id: 'china_creek', name: 'China Creek', region: 'Pacific', area: 'Vancouver Island', onc: 'JAKOC', cams: ['CCIP'], ctd: 'CCIP', oxy: 'CCIP' },
]

const citations = new Map()

async function get(path, params) {
  const qs = new URLSearchParams({ ...params, token: TOKEN })
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`${API}/${path}?${qs}`)
    if (res.ok) {
      // ONC emits bare NaN for missing samples, which is not valid JSON
      const body = JSON.parse((await res.text()).replace(/\bNaN\b/g, 'null'))
      for (const c of body.citations || []) if (c.doi) citations.set(c.doi, c.citation)
      return body
    }
    if (attempt >= 3 || (res.status < 500 && res.status !== 429)) {
      const text = (await res.text()).replaceAll(TOKEN, '***')
      throw new Error(`${path} ${res.status}: ${text.slice(0, 300)}`)
    }
    await new Promise((r) => setTimeout(r, 2000 * attempt))
  }
}

const startMs = Date.parse(WEEK_START + 'T00:00:00Z')
const weekIndex = (iso) => Math.floor((Date.parse(iso) - startMs) / (7 * 86400000))
const range = { dateFrom: `${YEAR}-01-01T00:00:00.000Z`, dateTo: `${YEAR}-12-31T23:59:59.999Z` }

// Daily means from ONC, then averaged per week. Returns 52 values or nulls.
async function weekly(locationCode, deviceCategoryCode, propertyCode, preferSensor) {
  const empty = Array(WEEKS).fill(null)
  if (!locationCode) return { values: empty, unit: null }
  let body
  try {
    body = await get('scalardata/location', { locationCode, deviceCategoryCode, propertyCode, ...range, resamplePeriod: 86400, resampleType: 'avg', rowLimit: 100000 })
  } catch (e) {
    console.warn(`  ! ${locationCode} ${deviceCategoryCode}/${propertyCode}: ${e.message}`)
    return { values: empty, unit: null }
  }
  const sensors = (body.sensorData || []).filter((s) => s.propertyCode === propertyCode)
  const s = sensors.find((x) => x.sensorCode === preferSensor) || sensors[0]
  if (!s) return { values: empty, unit: null }
  const sum = Array(WEEKS).fill(0), n = Array(WEEKS).fill(0)
  s.data.sampleTimes.forEach((t, i) => {
    const w = weekIndex(t), v = s.data.values[i]
    if (w < 0 || w >= WEEKS || v == null || Number.isNaN(v)) return
    sum[w] += v; n[w]++
  })
  return { values: sum.map((v, w) => (n[w] ? v / n[w] : null)), unit: s.unitOfMeasure, sensorCode: s.sensorCode }
}

function toMgL(v, unit) {
  if (v == null) return null
  if (unit === 'ml/l') return v * ML_TO_MG_O2
  if (unit === 'mg/l' || unit === 'mg/L') return v
  if (unit === 'umol/kg' || unit === 'µmol/kg') return v * 0.032 * 1.025
  throw new Error(`Unhandled oxygen unit: ${unit}`)
}

const round1 = (v) => (v == null ? null : Math.round(v * 10) / 10)

async function locationInfo(code) {
  const [loc] = await get('locations', { locationCode: code })
  return loc
}

const cameras = [], env = { weekStart: WEEK_START, weeks: WEEKS, cameras: {} }
const footage = { weekStart: WEEK_START, weeks: WEEKS, qualityAssessed: false, cameras: {} }
const mapping = []

for (const site of SITES) {
  process.stdout.write(`${site.name}… `)
  const loc = await locationInfo(site.cams[0] || site.ctd)

  // Footage: any underwater camera at the site recorded at least one clip that week
  const clips = Array(WEEKS).fill(0)
  for (const cam of site.cams) {
    try {
      const body = await get('archivefile/location', { locationCode: cam, deviceCategoryCode: 'VIDEOCAM', fileExtension: 'mp4', ...range })
      for (const f of body.files || []) {
        const m = f.match(/_(\d{8}T\d{6})/)
        if (!m) continue
        const iso = m[1].replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/, '$1-$2-$3T$4:$5:$6Z')
        const w = weekIndex(iso)
        if (w >= 0 && w < WEEKS) clips[w]++
      }
    } catch (e) {
      // 127 = no camera deployed at this location during the year: that is real "no footage", not a failure
      if (!e.message.includes('"errorCode": 127')) console.warn(`\n  ! ${cam} archive: ${e.message}`)
    }
  }
  // 'clear' here only means footage exists; clarity is not assessed (footage.qualityAssessed = false)
  footage.cameras[site.id] = clips.map((n) => (n > 0 ? 'clear' : 'none'))

  const temp = await weekly(site.ctd, 'CTD', 'seawatertemperature')
  const oxy = await weekly(site.oxy, 'OXYSENSOR', 'oxygen', 'oxygen_corrected')
  env.cameras[site.id] = {
    tempC: temp.values.map(round1),
    oxygenMgL: oxy.values.map((v) => round1(toMgL(v, oxy.unit))),
  }

  cameras.push({
    id: site.id, name: site.name, region: site.region, area: site.area,
    lat: Math.round(loc.lat * 1e4) / 1e4, lon: Math.round(loc.lon * 1e4) / 1e4,
    oncLocationCode: site.onc,
  })
  mapping.push({
    cameraId: site.id, oncSite: site.onc, cameraLocations: site.cams, coordinatesFrom: loc.locationCode,
    temperatureFrom: site.ctd, oxygenFrom: site.oxy, oxygenSensor: oxy.sensorCode ?? null, oxygenUnitConverted: oxy.unit,
    weeksWithFootage: clips.filter((n) => n > 0).length, clips: clips.reduce((a, b) => a + b, 0),
    weeksWithTemp: temp.values.filter((v) => v != null).length, weeksWithOxygen: oxy.values.filter((v) => v != null).length,
  })
  const last = mapping.at(-1)
  console.log(`footage ${last.weeksWithFootage}/52 wk, temp ${last.weeksWithTemp}/52, oxygen ${last.weeksWithOxygen}/52`)
}

const write = (name, data) => writeFileSync(new URL(name, OUT), JSON.stringify(data, null, 2) + '\n')
write('cameras.json', cameras)
write('env.json', env)
write('footage.json', footage)
write('sources.json', {
  fetchedAt: new Date().toISOString(), year: YEAR, api: 'Ocean Networks Canada Oceans 3.0 API',
  notes: [
    'Temperature and oxygen are weekly means of ONC daily averages (resamplePeriod=86400, avg).',
    'Oxygen converted from ml/L to mg/L (x1.429).',
    'Footage = at least one archived underwater video clip that week; clarity is not assessed.',
  ],
  sites: mapping,
  citations: [...citations].map(([doi, citation]) => ({ doi, citation })),
})
console.log(`Wrote cameras/env/footage/sources with ${citations.size} dataset citations`)
