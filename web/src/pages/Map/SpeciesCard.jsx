import { species, sightingsMeta } from '../../components/data.js'
import { STATUSES } from '../../components/status.js'
import SpeciesSymbol from './SpeciesSymbol.jsx'
import { cameraById, fmtDate } from './derive.js'

// Where a sighting's label came from, in plain words (build_sightings.py sets `source`)
function sourceText(d) {
  const p = sightingsMeta.rulePrecision
  if (d.source === 'team_review') return `Checked by our team${d.note ? `: ${d.note}` : ''}.`
  if (d.source === 'corrected_label') return 'Confirmed by the team\'s corrected training labels.'
  if (d.source === 'onc_annotation') {
    return d.speciesId === 'rockfish'
      ? `ONC SeaTube annotation, not individually checked. Similar annotations were right ${p.confirmed} of ${p.checked} times.`
      : 'ONC SeaTube annotation, not individually checked. Its accuracy has not been measured for this species.'
  }
  return d.confirmedBy === 'ai' ? 'Identified by the model.' : null
}

export default function SpeciesCard({ detection: d, count, onClose, onTrends }) {
  const sp = species.find((s) => s.id === d.speciesId)
  const cam = cameraById[d.cameraId]
  const st = STATUSES.find((s) => s.id === d.status)
  const when = fmtDate(new Date(d.timestamp), { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  const source = sourceText(d)

  return (
    <article className="species-card" aria-label={`${sp.name} sighting`}>
      <button type="button" className="close-btn" onClick={onClose} aria-label="Close">×</button>
      <div className="frame">
        {d.frameUrl ? <img src={d.frameUrl} alt={`ONC camera frame at ${cam.name}, ${when}`} /> : <span>Frame not available</span>}
        {d.box && <i className="frame-box" style={{ left: `${d.box.x * 100}%`, top: `${d.box.y * 100}%`, width: `${d.box.w * 100}%`, height: `${d.box.h * 100}%` }} />}
      </div>
      <header>
        <h2><SpeciesSymbol shape={sp.shape} status={d.status} /> {sp.name}</h2>
        <p className="sci">{d.taxon && d.taxon !== sp.sci ? `${sp.sci} · labelled ${d.taxon}` : sp.sci}</p>
        <span className="tag">{sp.tag}</span>
      </header>
      <p className={`status-badge status-${d.status}`}>
        <strong>{st.label}</strong>{d.confirmedBy === 'consensus' && ' · confirmed in Digital Fishers'} — {st.hint}
      </p>
      {source && <p className="source-note">{source}</p>}
      <p className="blurb">{sp.blurb}</p>
      <dl>
        <dt>Camera site</dt><dd>{cam.name}</dd>
        <dt>Area</dt><dd>{cam.area}, {cam.region}</dd>
        <dt>Latest</dt><dd>{when} UTC</dd>
        {d.count != null && <><dt>Fish counted</dt><dd>{d.count}</dd></>}
        {d.confidence != null && <><dt>Model confidence</dt><dd>{Math.round(d.confidence * 100)}%</dd></>}
        {count > 1 && <><dt>In this period</dt><dd>{count} sightings</dd></>}
      </dl>
      <div className="card-actions">
        <button type="button" className="btn primary" onClick={() => onTrends(cam.id)}>Temperature &amp; oxygen at {cam.name}</button>
        {d.clipUrl
          ? <a className="btn" href={d.clipUrl} target="_blank" rel="noreferrer">Watch source clip in SeaTube</a>
          : <button type="button" className="btn" disabled>Watch source clip (not linked yet)</button>}
      </div>
    </article>
  )
}
