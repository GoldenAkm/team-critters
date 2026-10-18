import { species, sources, sightingsMeta, footageQualityAssessed } from '../../components/data.js'
import { STATUSES } from '../../components/status.js'
import SpeciesSymbol from '../../components/SpeciesSymbol.jsx'
import { cameraTree } from './derive.js'

const TREE = cameraTree()

export default function Sidebar({
  search, setSearch, speciesOn, setSpeciesOn, speciesCounts, statusOn, setStatusOn,
  envMode, setEnvMode, cameraCounts, onCameraClick, shownCount, onReset,
}) {
  const q = search.trim().toLowerCase()
  const matches = (...texts) => !q || texts.some((t) => t.toLowerCase().includes(q))

  const visibleSpecies = species.filter((s) => matches(s.name, s.sci, s.tag))
  const tree = TREE.map((r) => ({
    ...r,
    cameras: r.cameras.filter((c) => matches(c.name, r.name)),
    areas: r.areas.map((a) => ({ ...a, cameras: a.cameras.filter((c) => matches(c.name, a.name, r.name)) }))
      .filter((a) => a.cameras.length),
  })).filter((r) => r.cameras.length || r.areas.length)

  const sum = (cams) => cams.reduce((s, c) => s + (cameraCounts[c.id] || 0), 0)

  function toggleSpecies(id) {
    const next = new Set(speciesOn)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSpeciesOn(next)
  }

  const cameraRow = (c) => (
    <li key={c.id}>
      <button type="button" className="tree-row" onClick={() => onCameraClick(c.id)}>
        <span>{c.name}</span><span className="count">{cameraCounts[c.id] || 0}</span>
      </button>
    </li>
  )

  return (
    <aside className="sidebar" aria-label="Map filters">
      <header className="sidebar-head">
        <h1>Filters</h1>
        <p>Confirmed sightings at Ocean Networks Canada fixed cameras.</p>
      </header>

      <div className="sidebar-scroll">
        <label className="search">
          <span className="visually-hidden">Search species or camera</span>
          <input type="search" placeholder="Search species or camera" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>

        <section>
          <h2>Species detected</h2>
          {visibleSpecies.map((s) => (
            <label key={s.id} className="check-row">
              <input type="checkbox" checked={speciesOn.has(s.id)} onChange={() => toggleSpecies(s.id)} />
              <SpeciesSymbol shape={s.shape} />
              <span className="row-text"><strong>{s.name}</strong><small>{s.tag}</small></span>
              <span className="count">{speciesCounts[s.id] || 0}</span>
            </label>
          ))}
          {!visibleSpecies.length && <p className="muted">No species match.</p>}
        </section>

        <section>
          <h2>Identification status</h2>
          {STATUSES.map((st) => (
            <label key={st.id} className="check-row">
              <input type="checkbox" checked={statusOn[st.id]}
                onChange={() => setStatusOn({ ...statusOn, [st.id]: !statusOn[st.id] })} />
              <SpeciesSymbol shape="circle" status={st.id} />
              <span className="row-text"><strong>{st.label}</strong><small>{st.hint}</small></span>
            </label>
          ))}
        </section>

        <section>
          <h2>Environmental data</h2>
          <div role="radiogroup" aria-label="Environmental data">
            {[['off', 'Off'], ['temp', 'Temperature'], ['oxygen', 'Oxygen']].map(([v, label]) => (
              <label key={v} className="radio-row">
                <input type="radio" name="env" value={v} checked={envMode === v} onChange={() => setEnvMode(v)} />
                {label}
              </label>
            ))}
          </div>
        </section>

        <section>
          <h2>Camera locations</h2>
          <ul className="tree">
            {tree.map((r) => (
              <li key={r.name}>
                <details open>
                  <summary><span>{r.name}</span><span className="count">{sum([...r.cameras, ...r.areas.flatMap((a) => a.cameras)])}</span></summary>
                  <ul>
                    {r.areas.map((a) => (
                      <li key={a.name}>
                        <details open>
                          <summary><span>{a.name}</span><span className="count">{sum(a.cameras)}</span></summary>
                          <ul>{a.cameras.map(cameraRow)}</ul>
                        </details>
                      </li>
                    ))}
                    {r.cameras.map(cameraRow)}
                  </ul>
                </details>
              </li>
            ))}
          </ul>
          <div className="footage-legend" aria-label="Footage legend">
            <span><i className="dot-sample clear" /> {footageQualityAssessed ? 'Usable footage' : 'Footage recorded'}</span>
            {footageQualityAssessed && <span><i className="dot-sample murky" /> Murky</span>}
            <span><i className="dot-sample none" /> No footage</span>
          </div>
        </section>
      </div>

      <footer className="sidebar-foot">
        <span><strong>{shownCount}</strong> detections shown</span>
        <button type="button" className="link-btn" onClick={onReset}>Reset filters</button>
        <small className="sample-note">
          Real Ocean Networks Canada data ({sources.years.join(', ')}). Sightings are human-reviewed rockfish frames plus
          ONC annotations that pass an accuracy check; they are not model output yet.
        </small>
        <details className="sources">
          <summary>Data sources &amp; citations</summary>
          <ul>
            {sources.notes.map((n) => <li key={n}>{n}</li>)}
            <li>
              ONC annotations kept only if {sightingsMeta.rule}: {sightingsMeta.rulePrecision.confirmed} of {sightingsMeta.rulePrecision.checked} such
              rockfish annotations were confirmed by corrected labels, versus {sightingsMeta.baselinePrecision.confirmed} of {sightingsMeta.baselinePrecision.checked} overall.
              Lingcod annotations are unmeasured, so they stay in Needs review.
            </li>
          </ul>
          <ul>{sources.citations.map((c) => <li key={c.doi}>{c.citation}</li>)}</ul>
        </details>
      </footer>
    </aside>
  )
}
