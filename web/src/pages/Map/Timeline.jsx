import { useMemo } from 'react'
import { WEEKS, YEARS, footageQualityAssessed } from '../../components/data.js'
import { MONTH_TICKS, footageStrip, periodLabel } from './derive.js'

export default function Timeline({ range, setRange, year, setYear, playing, onTogglePlay, areaName, cameraIds }) {
  const strip = useMemo(() => footageStrip(cameraIds, year), [cameraIds, year])
  const weeks = range[1] - range[0] + 1
  const pct = (w) => `${(w / WEEKS) * 100}%`

  return (
    <section className="timeline" aria-label="Time period">
      <div className="tl-head">
        <button type="button" className="play-btn" onClick={onTogglePlay} aria-label={playing ? 'Pause' : 'Play through the year'}>
          {playing ? '❚❚' : '▶'}
        </button>
        <div className="tl-label">
          <strong>{periodLabel(range, year)}, {year}</strong>
          <small>{weeks} week{weeks === 1 ? '' : 's'} · {areaName || 'All camera sites'}</small>
        </div>
        <label className="year-select">
          <span className="visually-hidden">Year</span>
          <select value={year} onChange={(e) => setYear(+e.target.value)}>
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>
        <button type="button" className="link-btn" onClick={() => setRange([0, WEEKS - 1])} disabled={weeks === WEEKS}>
          Whole year
        </button>
      </div>

      <div className="tl-track">
        <div className="tl-selected" style={{ left: pct(range[0]), width: pct(weeks) }} />
        <input type="range" min={0} max={WEEKS - 1} value={range[0]} aria-label="Period start week"
          aria-valuetext={periodLabel([range[0], range[0]], year)}
          onChange={(e) => setRange([Math.min(+e.target.value, range[1]), range[1]])} />
        <input type="range" min={0} max={WEEKS - 1} value={range[1]} aria-label="Period end week"
          aria-valuetext={periodLabel([range[1], range[1]], year)}
          onChange={(e) => setRange([range[0], Math.max(+e.target.value, range[0])])} />
      </div>

      <div className="tl-strip" role="img"
        aria-label={`${footageQualityAssessed ? 'Usable' : 'Recorded'} footage per week for cameras in view: darker means more cameras had footage, blank means none`}>
        {strip.map((v, w) => (
          <span key={w} className={v == null ? 'none' : ''} style={v == null ? undefined : { opacity: 0.15 + 0.85 * v }}
            title={v == null ? 'No footage' : `${Math.round(v * 100)}% of cameras in view had ${footageQualityAssessed ? 'clear ' : ''}footage`} />
        ))}
      </div>

      <div className="tl-months" aria-hidden="true">
        {MONTH_TICKS.map((m) => <span key={m.label} style={{ left: pct(m.w) }}>{m.label}</span>)}
      </div>
    </section>
  )
}
