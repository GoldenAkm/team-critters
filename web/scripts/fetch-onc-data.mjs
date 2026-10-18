// Pulls real ONC data for the map into src/data/ (map-build.md §3 shapes, one env/footage file per year):
//   cameras.json         – coordinates of each site's underwater camera
//   env/<year>.json      – weekly mean water temperature (°C) and dissolved oxygen (mg/L)
//   footage/<year>.json  – weekly footage availability from the video archive (clarity is NOT assessed)
//   sources.json         – ONC dataset citations + which ONC locations each site/year was built from
// Years default to those that have sightings in detections.json (built by scripts/build_sightings.py).
//
// Run: npm run onc-data [-- 2024 2025]   (needs ONC_TOKEN in web/.env.local — never commit it, never prefix it with VITE_)
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'

const OUT = new URL('../src/data/', import.meta.url)
const API = 'https://data.oceannetworks.ca/api'
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

const argYears = process.argv.slice(2).map(Number).filter(Boolean)
const YEARS = argYears.length ? argYears : [...new Set(
  JSON.parse(readFileSync(new URL('detections.json', OUT), 'utf8')).map((d) => +d.timestamp.slice(0, 4)),
)].sort()

// Site -> ONC site code, plus preferred sensor locations (tried first; other sensors at the site are fallbacks).
// Cameras are found per year from deployments; shore-station cameras (*SS) are excluded.
const SITES = [
  { id: 'cambridge_bay', name: 'Cambridge Bay', region: 'Arctic', area: 'Arctic', onc: 'CBY', ctd: ['CBYIP'], oxy: ['CBYIP'] },
  { id: 'minas_passage', name: 'Minas Passage', region: 'Atlantic', area: 'Bay of Fundy', onc: 'MIN', ctd: [], oxy: [] },
  { id: 'conception_bay', name: 'Conception Bay', region: 'Atlantic', area: 'Atlantic', onc: 'AAEJB', ctd: ['HRBIP'], oxy: ['HRBIP'] },
  { id: 'chatham_sound', name: 'Chatham Sound', region: 'Pacific', area: 'BC North Coast', onc: 'JCMWR', ctd: ['DIIP.C1'], oxy: ['DIIP.O1'] },
  { id: 'douglas_channel', name: 'Douglas Channel', region: 'Pacific', area: 'BC North Coast', onc: 'DC', ctd: ['HBIP'], oxy: ['HBIP'] },
  { id: 'barkley_canyon', name: 'Barkley Canyon', region: 'Pacific', area: 'Northeast Pacific Ocean', onc: 'BAC', ctd: ['BACAX'], oxy: ['BACAX'] },
  { id: 'barkley_sound', name: 'Barkley Sound', region: 'Pacific', area: 'Northeast Pacific Ocean', onc: 'JATTD', ctd: ['FGPPN'], oxy: ['FGPPN'] },
  { id: 'cascadia_basin', name: 'Cascadia Basin', region: 'Pacific', area: 'Northeast Pacific Ocean', onc: 'CBN', ctd: ['NC27'], oxy: ['NC27'] },
  { id: 'clayoquot_slope', name: 'Clayoquot Slope', region: 'Pacific', area: 'Northeast Pacific Ocean', onc: 'CQS', ctd: ['NC89'], oxy: ['NC89'] },
  { id: 'endeavour', name: 'Endeavour', region: 'Pacific', area: 'Northeast Pacific Ocean', onc: 'END', ctd: ['ENEF'], oxy: ['ENEF'] },
  { id: 'discovery_passage', name: 'Discovery Passage', region: 'Pacific', area: 'Salish Sea', onc: 'DISC', ctd: ['CRIP.C1'], oxy: ['CRIP.O1'] },
  { id: 'saanich_inlet', name: 'Saanich Inlet', region: 'Pacific', area: 'Salish Sea', onc: 'SAAN', ctd: ['PVIP.C1'], oxy: ['PVIP.O2'] },
  { id: 'strait_of_georgia', name: 'Strait of Georgia', region: 'Pacific', area: 'Salish Sea', onc: 'SOG', ctd: ['SCVIP'], oxy: ['SCVIP'] },
  { id: 'china_creek', name: 'China Creek', region: 'Pacific', area: 'Vancouver Island', onc: 'JAKOC', ctd: ['CCIP'], oxy: ['CCIP'] },
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

// Which site each ONC location belongs to, and its name, from the full location tree
const siteOf = {}
const nameOf = {}
const siteCodes = new Set(SITES.map((s) => s.onc))
;(function walk(nodes, site) {
  for (const n of nodes) {
    const s = siteCodes.has(n.locationCode) ? n.locationCode : site
    siteOf[n.locationCode] = s
    nameOf[n.locationCode] = n.locationName
    walk(n.children || [], s)
  }
})(await get('locations/tree', {}), null)

const deployments = {}
for (const cat of ['VIDEOCAM', 'CTD', 'OXYSENSOR']) deployments[cat] = await get('deployments', { deviceCategoryCode: cat })

const activeIn = (d, year) => d.begin < `${year + 1}-01-01` && (d.end == null || d.end > `${year}-01-01`)
function locationsAt(cat, site, year, exclude) {
  return [...new Set(deployments[cat]
    .filter((d) => siteOf[d.locationCode] === site.onc && activeIn(d, year) && !exclude(d.locationCode))
    .map((d) => d.locationCode))]
}
const isShore = (code) => /SS$/.test(code)
const isMobile = (code) => /^CF\d/.test(code) // ferry / community-fisher casts, not fixed sensors

function toMgL(v, unit) {
  if (v == null) return null
  if (unit === 'ml/l') return v * ML_TO_MG_O2
  if (unit === 'mg/l' || unit === 'mg/L') return v
  if (unit === 'umol/kg' || unit === 'µmol/kg') return v * 0.032 * 1.025
  throw new Error(`Unhandled oxygen unit: ${unit}`)
}
const round1 = (v) => (v == null ? null : Math.round(v * 10) / 10)

async function yearData(year) {
  const startMs = Date.parse(`${year}-01-01T00:00:00Z`)
  const weekIndex = (iso) => Math.floor((Date.parse(iso) - startMs) / (7 * 86400000))
  const range = { dateFrom: `${year}-01-01T00:00:00.000Z`, dateTo: `${year}-12-31T23:59:59.999Z` }

  // Daily means from ONC, averaged per week. Tries each candidate location until one has data.
  async function weekly(candidates, deviceCategoryCode, propertyCode, preferSensor) {
    for (const locationCode of candidates) {
      let body
      try {
        body = await get('scalardata/location', { locationCode, deviceCategoryCode, propertyCode, ...range, resamplePeriod: 86400, resampleType: 'avg', rowLimit: 100000 })
      } catch (e) {
        if (!e.message.includes('"errorCode": 127')) console.warn(`\n  ! ${locationCode} ${deviceCategoryCode}: ${e.message}`)
        continue
      }
      const sensors = (body.sensorData || []).filter((s) => s.propertyCode === propertyCode)
      const s = sensors.find((x) => x.sensorCode === preferSensor) || sensors[0]
      if (!s) continue
      const sum = Array(WEEKS).fill(0), n = Array(WEEKS).fill(0)
      s.data.sampleTimes.forEach((t, i) => {
        const w = weekIndex(t), v = s.data.values[i]
        if (w < 0 || w >= WEEKS || v == null) return
        sum[w] += v; n[w]++
      })
      if (n.some(Boolean)) return { values: sum.map((v, w) => (n[w] ? v / n[w] : null)), unit: s.unitOfMeasure, locationCode, sensorCode: s.sensorCode }
    }
    return { values: Array(WEEKS).fill(null), unit: null, locationCode: null }
  }

  const env = { weekStart: `${year}-01-01`, weeks: WEEKS, cameras: {} }
  const footage = { weekStart: `${year}-01-01`, weeks: WEEKS, qualityAssessed: false, cameras: {} }
  const mapping = []

  for (const site of SITES) {
    process.stdout.write(`${year} ${site.name}… `)
    const cams = locationsAt('VIDEOCAM', site, year, isShore)
    const clips = Array(WEEKS).fill(0)
    for (const cam of cams) {
      try {
        const body = await get('archivefile/location', { locationCode: cam, deviceCategoryCode: 'VIDEOCAM', fileExtension: 'mp4', ...range })
        for (const f of body.files || []) {
          const m = f.match(/_(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/)
          if (!m) continue
          const w = weekIndex(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`)
          if (w >= 0 && w < WEEKS) clips[w]++
        }
      } catch (e) {
        if (!e.message.includes('"errorCode": 127')) console.warn(`\n  ! ${cam} archive: ${e.message}`)
      }
    }
    // 'clear' here only means footage exists; clarity is not assessed (footage.qualityAssessed = false)
    footage.cameras[site.id] = clips.map((n) => (n > 0 ? 'clear' : 'none'))

    const fallback = (cat, preferred) => [...new Set([...preferred, ...locationsAt(cat, site, year, (c) => isShore(c) || isMobile(c))])]
    const temp = await weekly(fallback('CTD', site.ctd), 'CTD', 'seawatertemperature')
    const oxy = await weekly(fallback('OXYSENSOR', site.oxy), 'OXYSENSOR', 'oxygen', 'oxygen_corrected')
    env.cameras[site.id] = {
      tempC: temp.values.map(round1),
      oxygenMgL: oxy.values.map((v) => round1(toMgL(v, oxy.unit))),
    }
    const row = {
      cameraId: site.id, cameraLocations: cams, temperatureFrom: temp.locationCode, oxygenFrom: oxy.locationCode,
      oxygenUnitConverted: oxy.unit, weeksWithFootage: clips.filter(Boolean).length, clips: clips.reduce((a, b) => a + b, 0),
      weeksWithTemp: temp.values.filter((v) => v != null).length, weeksWithOxygen: oxy.values.filter((v) => v != null).length,
    }
    mapping.push(row)
    console.log(`cams [${cams.join(', ')}] footage ${row.weeksWithFootage}/52, temp ${row.weeksWithTemp}/52, oxygen ${row.weeksWithOxygen}/52`)
  }
  return { env, footage, mapping }
}

const write = (name, data) => writeFileSync(new URL(name, OUT), JSON.stringify(data, null, 2) + '\n')
mkdirSync(new URL('env/', OUT), { recursive: true })
mkdirSync(new URL('footage/', OUT), { recursive: true })

const perYear = {}
for (const year of YEARS) {
  const { env, footage, mapping } = await yearData(year)
  write(`env/${year}.json`, env)
  write(`footage/${year}.json`, footage)
  perYear[year] = mapping
}

// Camera coordinates: the most recent underwater camera at each site (any year)
const cameras = []
for (const site of SITES) {
  // Prefer underwater cameras; fall back to a shore-station camera (Minas Passage only ever had one)
  const deps = deployments.VIDEOCAM.filter((d) => siteOf[d.locationCode] === site.onc)
    .sort((a, b) => isShore(a.locationCode) - isShore(b.locationCode) || (b.end ?? '9999').localeCompare(a.end ?? '9999'))
  const code = deps[0]?.locationCode || site.ctd[0] || site.onc
  const [loc] = await get('locations', { locationCode: code })
  cameras.push({
    id: site.id, name: site.name, region: site.region, area: site.area,
    lat: Math.round(loc.lat * 1e4) / 1e4, lon: Math.round(loc.lon * 1e4) / 1e4, oncLocationCode: site.onc,
  })
}
write('cameras.json', cameras)
write('sources.json', {
  fetchedAt: new Date().toISOString(), years: YEARS, api: 'Ocean Networks Canada Oceans 3.0 API',
  notes: [
    'Temperature and oxygen are weekly means of ONC daily averages (resamplePeriod=86400, avg).',
    'Oxygen converted from ml/L to mg/L (x1.429).',
    'Footage = at least one archived underwater video clip that week; clarity is not assessed.',
    'Sightings: team-reviewed and corrected rockfish labels, plus ONC SeaTube annotations that pass an accuracy rule (see sightings_meta.json).',
  ],
  sitesByYear: perYear,
  // Names of the underwater camera locations listed in sitesByYear (shown in each camera site's tag)
  cameraLocationNames: Object.fromEntries(Object.values(perYear).flat().flatMap((r) => r.cameraLocations).map((c) => [c, nameOf[c]])),
  citations: [...citations].map(([doi, citation]) => ({ doi, citation })),
})
console.log(`Wrote ${YEARS.join(', ')} with ${citations.size} dataset citations`)
