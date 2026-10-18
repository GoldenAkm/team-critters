import { useState } from 'react'
import { species, sightingsMeta } from '../../components/data.js'
import { STATUSES } from '../../components/status.js'
import SpeciesSymbol from './SpeciesSymbol.jsx'
import { cameraById, camerasAt, fmtDate } from './derive.js'
import ModelCheck from './ModelCheck.jsx'

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
  const [modelBox, setModelBox] = useState(null)

  return (
    <article className="species-card" aria-label={`${sp.name} sighting`}>
      <button type="button" className="close-btn" onClick={onClose} aria-label="Close">×</button>
      <div className="frame">
        {d.frameUrl ? <img src={d.frameUrl} alt={`ONC camera frame at ${cam.name}, ${when}`} /> : <span>Frame not available</span>}
        {d.box && <i className="frame-box" style={{ left: `${d.box.x * 100}%`, top: `${d.box.y * 100}%`, width: `${d.box.w * 100}%`, height: `${d.box.h * 100}%` }} />}
        {modelBox && (
          <i className="frame-box frame-box--model" style={{ left: `${modelBox.x * 100}%`, top: `${modelBox.y * 100}%`, width: `${modelBox.w * 100}%`, height: `${modelBox.h * 100}%` }}>
            <span>AI model</span>
          </i>
        )}
      </div>
      {/* Who it is, how sure we are (status, then where the label came from), what it is, then the record */}
      <header>
        <h2><SpeciesSymbol species={sp.id} status={d.status} size={36} /> {sp.name}</h2>
        <div className="sci-row">
          <p className="sci">{sp.sci}</p>
          <span className="tag">{sp.tag}</span>
        </div>
      </header>
      <div className={`status-badge status-${d.status}`}>
        <strong>{st.label}{d.confirmedBy === 'consensus' && ' · confirmed in Digital Fishers'}</strong>
        <span>{st.hint}</span>
        {source && <span className="status-source">{source}</span>}
      </div>
      <section className="card-about">
        <h3>About {sp.name.toLowerCase()}</h3>
        <p>{sp.blurb}</p>
      </section>
      <dl>
        {d.taxon && d.taxon !== sp.sci && <><dt>Labelled as</dt><dd><i>{d.taxon}</i></dd></>}
        <dt>Camera site</dt><dd>{cam.name}</dd>
        <dt>Area</dt><dd>{cam.area}, {cam.region}</dd>
        {camerasAt(cam.id, d.timestamp.slice(0, 4)).length > 1 && (
          <><dt>Cameras</dt><dd>{camerasAt(cam.id, d.timestamp.slice(0, 4)).join(', ')}</dd></>
        )}
        <dt>Latest</dt><dd>{when} UTC</dd>
        {d.count != null && <><dt>Fish counted</dt><dd>{d.count}</dd></>}
        {d.confidence != null && <><dt>Model confidence</dt><dd>{Math.round(d.confidence * 100)}%</dd></>}
        {count > 1 && <><dt>In this period</dt><dd>{count} {d.status === 'identified' ? 'sightings' : 'detections'}</dd></>}
      </dl>
      <ModelCheck detection={d} onBox={setModelBox} />
      <div className="card-actions">
        <button type="button" className="btn primary" onClick={() => onTrends(cam.id)}>Temperature &amp; oxygen at {cam.name}</button>
        {d.clipUrl
          ? <a className="btn" href={d.clipUrl} target="_blank" rel="noreferrer">Watch source clip in SeaTube</a>
          : <button type="button" className="btn" disabled>Watch source clip (not linked yet)</button>}
      </div>
    </article>
  )
}
