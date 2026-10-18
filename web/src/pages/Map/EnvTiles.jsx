import { useMemo } from 'react'
import { WEEKS } from '../../components/data.js'
import { envSeries, fmtEnv } from './derive.js'
import { ONC } from '../../components/oncTheme.js'

const HYPOXIC = 2

function Sparkline({ values, range, hypoxic }) {
  const w = 120, h = 30
  const nums = values.filter((v) => v != null)
  if (!nums.length) return <svg width={w} height={h} aria-hidden="true" />
  const lo = Math.min(...nums, hypoxic ? 0 : Infinity), hi = Math.max(...nums, hypoxic ? HYPOXIC + 1 : -Infinity)
  const x = (i) => (i / (WEEKS - 1)) * w
  const y = (v) => h - 2 - ((v - lo) / (hi - lo || 1)) * (h - 4)
  let d = '', pen = false
  values.forEach((v, i) => {
    if (v == null) { pen = false; return }
    d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`
    pen = true
  })
  return (
    <svg width={w} height={h} aria-hidden="true">
      <rect x={x(range[0])} y={0} width={Math.max(2, x(range[1]) - x(range[0]))} height={h} fill="currentColor" opacity="0.12" />
      {hypoxic && <line x1={0} x2={w} y1={y(HYPOXIC)} y2={y(HYPOXIC)} stroke={ONC.red} strokeDasharray="3 2" />}
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

export default function EnvTiles({ envMode, setEnvMode, range, year, cameraIds }) {
  const temp = useMemo(() => envSeries(cameraIds, 'temp', year), [cameraIds, year])
  const oxygen = useMemo(() => envSeries(cameraIds, 'oxygen', year), [cameraIds, year])
  const avg = (arr) => {
    const vals = arr.slice(range[0], range[1] + 1).filter((v) => v != null)
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
  }

  const tiles = [
    { id: 'temp', label: 'Water temp', series: temp },
    { id: 'oxygen', label: 'Oxygen', series: oxygen },
  ]

  return (
    <div className="env-tiles">
      {tiles.map((t) => (
        <button key={t.id} type="button" className={`env-tile ${t.id} ${envMode === t.id ? 'active' : ''}`} aria-pressed={envMode === t.id}
          onClick={() => setEnvMode(envMode === t.id ? 'off' : t.id)}
          title={envMode === t.id ? 'Turn environmental layer off' : `Shade map by ${t.label.toLowerCase()}`}>
          <span className="env-tile-label">{t.label} <small>avg in view</small></span>
          <strong>{fmtEnv(t.id, avg(t.series))}</strong>
          <Sparkline values={t.series} range={range} hypoxic={t.id === 'oxygen'} />
          {t.id === 'oxygen' && <small className="hypoxic-note">dashed line: hypoxic below 2 mg/L</small>}
        </button>
      ))}
      {!cameraIds.length && <p className="muted">No cameras in view.</p>}
    </div>
  )
}
