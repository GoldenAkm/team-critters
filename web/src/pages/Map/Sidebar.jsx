import { species, cameras, footageQualityAssessed } from '../../components/data.js'
import { STATUSES } from '../../components/status.js'
import SpeciesSymbol from './SpeciesSymbol.jsx'
import { cameraTree } from './derive.js'

const TREE = cameraTree()

export default function Sidebar({
  search, setSearch, speciesOn, setSpeciesOn, speciesCounts, statusOn, setStatusOn,
  envMode, setEnvMode, cameraCounts, onCameraClick, onReset,
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
    <aside className="mp-side" aria-label="Map filters">
      <section className="mp-panel">
        <div className="mp-panel__head">
          <h3>Species</h3>
          <button type="button" className="link-btn" onClick={onReset}>Reset filters</button>
        </div>
        <label className="search">
          <span className="visually-hidden">Search species or camera</span>
          <input type="search" placeholder="Search species or camera" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <div>
          {visibleSpecies.map((s) => (
            <label key={s.id} className="check-row">
              <input type="checkbox" checked={speciesOn.has(s.id)} onChange={() => toggleSpecies(s.id)} />
              <SpeciesSymbol species={s.id} />
              <span className="row-text"><strong>{s.name}</strong><small>{s.tag}</small></span>
              <span className="count">{speciesCounts[s.id] || 0}</span>
            </label>
          ))}
          {!visibleSpecies.length && <p className="muted">No species match.</p>}
        </div>
      </section>

      <section className="mp-panel">
        <h3>Identification status</h3>
        <div>
          {STATUSES.map((st) => (
            <label key={st.id} className="check-row">
              <input type="checkbox" checked={statusOn[st.id]}
                onChange={() => setStatusOn({ ...statusOn, [st.id]: !statusOn[st.id] })} />
              <SpeciesSymbol species="rockfish" status={st.id} />
              <span className="row-text"><strong>{st.label}</strong><small>{st.hint}</small></span>
            </label>
          ))}
        </div>
      </section>

      <section className="mp-panel">
        <h3>Environmental data</h3>
        <div className="segmented" role="radiogroup" aria-label="Environmental data">
          {[['off', 'Off'], ['temp', 'Temperature'], ['oxygen', 'Oxygen']].map(([v, label]) => (
            <label key={v} className="radio-row">
              <input type="radio" name="env" value={v} checked={envMode === v} onChange={() => setEnvMode(v)} />
              {label}
            </label>
          ))}
        </div>
      </section>

      <section className="mp-panel">
        <div className="mp-panel__head">
          <h3>Camera locations</h3>
          <span className="mp-panel__count">{cameras.length} cameras</span>
        </div>
        <ul className="tree">
          {tree.map((r) => (
            <li key={r.name}>
              {/* Only regions/areas with sightings (or search matches) start open, to keep the panel short */}
              <details open={Boolean(q) || sum([...r.cameras, ...r.areas.flatMap((a) => a.cameras)]) > 0}>
                <summary><span>{r.name}</span><span className="count">{sum([...r.cameras, ...r.areas.flatMap((a) => a.cameras)])}</span></summary>
                <ul>
                  {r.areas.map((a) => (
                    <li key={a.name}>
                      <details open={Boolean(q) || sum(a.cameras) > 0}>
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

    </aside>
  )
}
