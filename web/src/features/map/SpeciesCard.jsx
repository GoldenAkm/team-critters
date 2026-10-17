import { Link } from 'react-router-dom'
import { species } from '../../shared/data.js'
import { STATUSES } from '../../shared/status.js'
import SpeciesSymbol from '../../shared/SpeciesSymbol.jsx'
import { cameraById, fmtDate } from './derive.js'

export default function SpeciesCard({ detection: d, count, onClose, onTrends }) {
  const sp = species.find((s) => s.id === d.speciesId)
  const cam = cameraById[d.cameraId]
  const st = STATUSES.find((s) => s.id === d.status)
  const when = fmtDate(new Date(d.timestamp), { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <article className="species-card" aria-label={`${sp.name} detection`}>
      <button type="button" className="close-btn" onClick={onClose} aria-label="Close">×</button>
      <div className="frame" aria-label="Video frame placeholder">
        {d.frameUrl ? <img src={d.frameUrl} alt={`Frame showing ${sp.name}`} /> : <span>Frame not available</span>}
        {d.box && <i className="frame-box" style={{ left: `${d.box.x * 100}%`, top: `${d.box.y * 100}%`, width: `${d.box.w * 100}%`, height: `${d.box.h * 100}%` }} />}
      </div>
      <header>
        <h2><SpeciesSymbol shape={sp.shape} status={d.status} /> {sp.name}</h2>
        <p className="sci">{sp.sci}</p>
        <span className="tag">{sp.tag}</span>
      </header>
      <p className={`status-badge status-${d.status}`}>
        <strong>{st.label}</strong>{d.confirmedBy === 'consensus' && ' · confirmed in Digital Fishers'} — {st.hint}
      </p>
      <p className="blurb">{sp.blurb}</p>
      <dl>
        <dt>Camera site</dt><dd>{cam.name}</dd>
        <dt>Area</dt><dd>{cam.area}, {cam.region}</dd>
        <dt>Latest</dt><dd>{when} UTC</dd>
        <dt>Model confidence</dt><dd>{Math.round(d.confidence * 100)}%</dd>
        {count > 1 && <><dt>In this period</dt><dd>{count} detections</dd></>}
      </dl>
      <div className="card-actions">
        <Link className="btn primary" to={`/pokedex/${sp.id}`}>Open species profile</Link>
        <button type="button" className="btn" onClick={() => onTrends(cam.id)}>Temperature &amp; oxygen at {cam.name}</button>
        {d.clipUrl
          ? <a className="btn" href={d.clipUrl} target="_blank" rel="noreferrer">Watch source clip</a>
          : <button type="button" className="btn" disabled>Watch source clip (not linked yet)</button>}
      </div>
    </article>
  )
}
