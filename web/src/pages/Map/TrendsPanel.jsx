import { useMemo, useState } from 'react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceArea, ReferenceLine } from 'recharts'
import { detections, yearData, footageQualityAssessed, weekOf, weekDate, WEEKS } from '../../components/data.js'
import { footageLabel } from '../../components/status.js'
import { MONTH_TICKS, cameraById, fmtDate, pearson } from './derive.js'
import { ONC } from '../../components/oncTheme.js'

const X_DOMAIN = [-0.5, WEEKS - 0.5]

// The chart's three lines, in legend order. Temperature and oxygen share the left axis (their values overlap);
// sightings have the right one. A week with no footage is a gap in the sightings line, not a drop to zero, so a
// gap never reads as the fish leaving. Sightings also get a dot every week (marker), which tells their line from
// oxygen's without relying on colour and sets zero-sighting weeks apart from those gaps.
const LINES = [
  { key: 'temp', label: 'Water temperature (°C)', color: ONC.orange, axis: 'env', missing: 'no data here', value: (r) => r.temp },
  { key: 'oxygen', label: 'Dissolved oxygen (mg/L)', color: ONC.blue, axis: 'env', missing: 'no data here', value: (r) => r.oxygen },
  {
    key: 'sightings', label: 'Sightings per week (current filters)', color: ONC.tealDark, axis: 'sightings', marker: true,
    missing: 'no footage here', value: (r) => (r.footage === 'none' ? null : r.sightings),
  },
]
const NICE_STEPS = [1, 2, 3, 4, 5, 8, 10, 15, 20, 25, 50, 100]

const swatch = ({ color, marker }) => <i className={marker ? 'lg-line lg-line--dot' : 'lg-line'} style={{ '--c': color }} />

function WeekTooltip({ active, payload, year }) {
  if (!active || !payload?.length) return null
  const r = payload[0].payload
  const [temp, oxygen, sightings] = LINES
  return (
    <div className="chart-tip">
      <strong>Week of {fmtDate(weekDate(r.w, year))}</strong>
      <span>{swatch(temp)}Temp: {r.temp == null ? 'no data' : `${r.temp} °C`}</span>
      <span>{swatch(oxygen)}Oxygen: {r.oxygen == null ? 'no data' : `${r.oxygen} mg/L`}</span>
      <span>{swatch(sightings)}Sightings: {r.footage === 'none' ? 'no footage' : r.sightings}</span>
      <span>{footageLabel(r.footage, footageQualityAssessed)}</span>
    </div>
  )
}

// A week with gaps on both sides has no line to draw, so it gets a dot instead of vanishing
function lonePoints(rows, { value, color }) {
  return ({ cx, cy, index }) => {
    const alone = value(rows[index]) != null && value(rows[index - 1] ?? {}) == null && value(rows[index + 1] ?? {}) == null
    return alone ? <circle key={index} cx={cx} cy={cy} r={2.5} fill={color} /> : null
  }
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

export default function TrendsPanel({ ref, cameraId, speciesOn, statusOn, range, year }) {
  const [shown, setShown] = useState({ temp: true, oxygen: true, sightings: true })
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

  // A line is drawn when it's switched on and has data at this camera; each axis shows only with a line on it
  const hasData = Object.fromEntries(LINES.map((l) => [l.key, rows.some((r) => l.value(r) != null)]))
  const drawn = Object.fromEntries(LINES.map((l) => [l.key, shown[l.key] && hasData[l.key]]))
  const envShown = drawn.temp || drawn.oxygen
  // With oxygen drawn, the left axis reaches 0 so the hypoxic line (2 mg/L) is always on it
  const envDomain = drawn.oxygen ? [(min) => Math.min(0, Math.floor(min)), 'auto'] : ['auto', 'auto']
  // Sightings axis: four even steps, with headroom above the busiest week so its line doesn't run along the top
  const peak = Math.max(0, ...rows.filter((r) => r.footage !== 'none').map((r) => r.sightings))
  const step = NICE_STEPS.find((s) => 4 * s >= peak * 1.15) ?? Math.ceil((peak * 1.15) / 4)

  return (
    <section ref={ref} className="mp-card trends" aria-label={`Site trends for ${cam.name}`}>
      <header className="trends-head">
        <h2>{cam.name} <small>{cam.area} · weekly, {year}</small></h2>
        <div className="trends-controls">
          <label>Range <select disabled defaultValue="year"><option value="year">12 months</option></select></label>
          <button type="button" className="link-btn" onClick={download}>Download this data</button>
        </div>
      </header>
      <p className="trends-hint">Click another camera on the map, or under Camera locations, to see its trends.</p>

      {/* Colour legend; each entry also shows or hides its line */}
      <fieldset className="trend-legend">
        <legend className="visually-hidden">Lines on the chart</legend>
        {LINES.map((l) => (
          <label key={l.key}>
            <input type="checkbox" checked={shown[l.key]} onChange={() => setShown({ ...shown, [l.key]: !shown[l.key] })} />
            {swatch(l)}
            {l.label}
            {!hasData[l.key] && <span className="muted">· {l.missing}</span>}
          </label>
        ))}
      </fieldset>

      <div className="trend-axes" aria-hidden="true">
        <span>{envShown && '°C · mg/L'}</span>
        <span>{drawn.sightings && 'Sightings'}</span>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={rows} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
          {/* Background: murky weeks shaded, no-footage weeks hatched, selected period outlined */}
          <defs>
            <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="6" height="6" fill="#fff" />
              <line x1="0" y1="0" x2="0" y2="6" stroke="#999999" strokeWidth="2" />
            </pattern>
          </defs>
          {rows.filter((r) => r.footage !== 'clear').map((r) => (
            <ReferenceArea key={`f${r.w}`} yAxisId="env" x1={r.w - 0.5} x2={r.w + 0.5} ifOverflow="hidden" strokeOpacity={0}
              fill={r.footage === 'none' ? 'url(#hatch)' : '#dfe6ea'} fillOpacity={r.footage === 'none' ? 1 : 0.8} />
          ))}
          <ReferenceArea yAxisId="env" x1={range[0] - 0.5} x2={range[1] + 0.5} fill="none" stroke={ONC.teal} strokeWidth={1.5} />

          <XAxis dataKey="w" type="number" domain={X_DOMAIN} ticks={MONTH_TICKS.map((m) => m.w)}
            tickFormatter={(w) => MONTH_TICKS.find((m) => m.w === w)?.label ?? ''} tick={{ fontSize: 11 }} />
          <YAxis yAxisId="env" width={34} tick={{ fontSize: 11 }} domain={envDomain} hide={!envShown} />
          <YAxis yAxisId="sightings" orientation="right" width={30} domain={[0, 4 * step]} ticks={[0, 1, 2, 3, 4].map((i) => i * step)}
            tick={{ fontSize: 11, fill: ONC.tealDark }} hide={!drawn.sightings} />
          <Tooltip content={<WeekTooltip year={year} />} />
          {/* Separate conditionals, not a fragment: recharts 2 does not look inside fragments under React 19 */}
          {drawn.oxygen && (
            <ReferenceLine yAxisId="env" y={2} stroke={ONC.red} strokeDasharray="4 3"
              label={{ value: 'hypoxic below 2 mg/L', position: 'insideTopRight', fontSize: 10, fill: ONC.red }} />
          )}
          {LINES.filter((l) => drawn[l.key]).map((l) => (
            <Line key={l.key} yAxisId={l.axis} dataKey={l.value} name={l.label} stroke={l.color} strokeWidth={2}
              dot={l.marker ? { r: 2.5, fill: l.color, strokeWidth: 0 } : lonePoints(rows, l)}
              connectNulls={false} isAnimationActive={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>

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
