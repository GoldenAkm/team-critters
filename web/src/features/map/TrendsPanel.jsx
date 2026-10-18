import { useMemo, useState } from 'react'
import { ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, ReferenceArea, ReferenceLine } from 'recharts'
import { detections, yearData, footageQualityAssessed, weekOf, weekDate, WEEKS } from '../../shared/data.js'
import { footageLabel } from '../../shared/status.js'
import { MONTH_TICKS, cameraById, fmtDate, pearson } from './derive.js'
import { ONC } from '../../shared/oncTheme.js'

const SYNC = 'site-trends'
const X_DOMAIN = [-0.5, WEEKS - 0.5]

function WeekTooltip({ active, payload, year }) {
  if (!active || !payload?.length) return null
  const r = payload[0].payload
  return (
    <div className="chart-tip">
      <strong>Week of {fmtDate(weekDate(r.w, year))}</strong>
      <span>Temp: {r.temp == null ? 'no data' : `${r.temp} °C`}</span>
      <span>Oxygen: {r.oxygen == null ? 'no data' : `${r.oxygen} mg/L`}</span>
      <span>Sightings: {r.footage === 'none' ? 'no footage' : r.sightings}</span>
      <span>{footageLabel(r.footage, footageQualityAssessed)}</span>
    </div>
  )
}

function summarize(rows) {
  const clear = rows.filter((r) => r.footage === 'clear')
  const murky = rows.filter((r) => r.footage === 'murky').length
  const none = rows.filter((r) => r.footage === 'none').length
  const usable = footageQualityAssessed ? 'clear-footage weeks' : 'weeks with footage'
  const basis = `Based on ${clear.length} ${usable}; ${footageQualityAssessed ? `${murky} murky and ` : ''}${none} no-footage weeks left out.`
  if (!clear.some((r) => r.sightings > 0)) return `No sightings in ${usable} for the current filters. ${basis}`
  const parts = []
  for (const [key, warm, cold] of [['temp', 'warmer', 'cooler'], ['oxygen', 'higher-oxygen', 'lower-oxygen']]) {
    const pts = clear.filter((r) => r[key] != null)
    const r = pearson(pts.map((p) => p[key]), pts.map((p) => p.sightings))
    if (r == null) continue
    if (r > 0.3) parts.push(`Sightings were higher in ${warm} weeks.`)
    else if (r < -0.3) parts.push(`Sightings were higher in ${cold} weeks.`)
    else parts.push(`No clear link between ${key === 'temp' ? 'temperature' : 'oxygen'} and sightings.`)
  }
  return `${parts.join(' ')} ${basis}`
}

export default function TrendsPanel({ cameraId, speciesOn, statusOn, range, year, onClose }) {
  const [showTemp, setShowTemp] = useState(true)
  const [showOxygen, setShowOxygen] = useState(true)
  const cam = cameraById[cameraId]

  const rows = useMemo(() => {
    const sightings = Array(WEEKS).fill(0)
    for (const d of detections) {
      if (d.cameraId !== cameraId || !speciesOn.has(d.speciesId) || !statusOn[d.status]) continue
      const w = weekOf(d.timestamp, year)
      if (w >= 0) sightings[w]++
    }
    const { env, footage } = yearData(year)
    return Array.from({ length: WEEKS }, (_, w) => ({
      w,
      temp: env.cameras[cameraId]?.tempC[w] ?? null,
      oxygen: env.cameras[cameraId]?.oxygenMgL[w] ?? null,
      sightings: sightings[w],
      footage: footage.cameras[cameraId]?.[w] || 'none',
    }))
  }, [cameraId, speciesOn, statusOn, year])

  const summary = useMemo(() => summarize(rows), [rows])

  function download() {
    const csv = ['week_start,temp_c,oxygen_mg_l,sightings,footage',
      ...rows.map((r) => [weekDate(r.w, year).toISOString().slice(0, 10), r.temp ?? '', r.oxygen ?? '', r.sightings, r.footage].join(','))].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `${cameraId}_${year}_weekly.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  // Shared background for all three charts: murky shaded, no footage hatched, selected period outlined.
  const background = [
    <defs key="defs">
      <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="6" height="6" fill="#fff" />
        <line x1="0" y1="0" x2="0" y2="6" stroke="#999999" strokeWidth="2" />
      </pattern>
    </defs>,
    ...rows.filter((r) => r.footage !== 'clear').map((r) => (
      <ReferenceArea key={`f${r.w}`} x1={r.w - 0.5} x2={r.w + 0.5} ifOverflow="hidden" strokeOpacity={0}
        fill={r.footage === 'none' ? 'url(#hatch)' : '#dfe6ea'} fillOpacity={r.footage === 'none' ? 1 : 0.8} />
    )),
    <ReferenceArea key="sel" x1={range[0] - 0.5} x2={range[1] + 0.5} fill="none" stroke={ONC.teal} strokeWidth={1.5} />,
  ]

  const xAxis = (show) => (
    <XAxis dataKey="w" type="number" domain={X_DOMAIN} ticks={MONTH_TICKS.map((m) => m.w)} hide={!show}
      tickFormatter={(w) => MONTH_TICKS.find((m) => m.w === w)?.label ?? ''} tick={{ fontSize: 11 }} />
  )
  const margin = { top: 6, right: 12, bottom: 0, left: 0 }
  const charts = [
    showTemp && { key: 'temp', title: 'Water temperature (°C)', h: 70 },
    showOxygen && { key: 'oxygen', title: 'Dissolved oxygen (mg/L)', h: 70 },
    { key: 'sightings', title: 'Sightings per week (current filters)', h: 80 },
  ].filter(Boolean)

  return (
    <section className="trends" aria-label={`Site trends for ${cam.name}`}>
      <header className="trends-head">
        <h2>{cam.name} <small>{cam.area} · weekly, {year}</small></h2>
        <div className="trends-controls">
          <label><input type="checkbox" checked={showTemp} onChange={() => setShowTemp(!showTemp)} /> Temperature</label>
          <label><input type="checkbox" checked={showOxygen} onChange={() => setShowOxygen(!showOxygen)} /> Oxygen</label>
          <label>Range <select disabled defaultValue="year"><option value="year">12 months</option></select></label>
          <button type="button" className="link-btn" onClick={download}>Download this data</button>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close site trends">×</button>
        </div>
      </header>

      <div className="trends-charts">
        {charts.map((c, i) => (
          <div key={c.key} className="trend-chart">
            <h3>{c.title}</h3>
            <ResponsiveContainer width="100%" height={c.h + (i === charts.length - 1 ? 20 : 0)}>
              <ComposedChart data={rows} syncId={SYNC} margin={margin}>
                {background}
                {xAxis(i === charts.length - 1)}
                <YAxis width={34} tick={{ fontSize: 11 }} allowDecimals={c.key !== 'sightings'}
                  domain={c.key === 'oxygen' ? [0, 'auto'] : ['auto', 'auto']} />
                <Tooltip content={<WeekTooltip year={year} />} />
                {c.key === 'temp' && <Line dataKey="temp" stroke={ONC.orange} dot={false} strokeWidth={2} connectNulls={false} isAnimationActive={false} />}
                {c.key === 'oxygen' && <>
                  <ReferenceLine y={2} stroke={ONC.red} strokeDasharray="4 3"
                    label={{ value: 'hypoxic below 2 mg/L', position: 'insideTopRight', fontSize: 10, fill: ONC.red }} />
                  <Line dataKey="oxygen" stroke={ONC.blue} dot={false} strokeWidth={2} connectNulls={false} isAnimationActive={false} />
                </>}
                {c.key === 'sightings' && <Bar dataKey="sightings" fill={ONC.tealDark} isAnimationActive={false} />}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>

      <div className="trends-foot">
        <div className="trends-legend" aria-label="Chart legend">
          {footageQualityAssessed && <span><i className="lg murky" /> Murky footage</span>}
          <span><i className="lg none" /> No footage</span>
          <span><i className="lg sel" /> Selected period</span>
        </div>
        <p className="summary">{summary}</p>
        <p className="caveat">Patterns here are correlations, not proof of cause.</p>
      </div>
    </section>
  )
}
