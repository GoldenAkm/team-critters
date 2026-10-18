import { useEffect, useRef, useState } from 'react'
import { species, cameras } from '../../components/data.js'
import { cameraById, cameraTotal, cameraTree } from './derive.js'

const TREE = cameraTree()
const ENV_TOGGLES = [['temp', 'Temperature', 'Water temperature'], ['oxygen', 'Oxygen', 'Dissolved oxygen']]

// The map's controls in one bar above the map and chart: the sightings count, species chips, the camera picker,
// the environmental layers (either, both or neither).
export default function FilterBar({
  shown, speciesOn, setSpeciesOn, speciesCounts, envOn, setEnvOn, cameraCounts, cameraId, onPickCamera, year,
}) {
  function toggleSpecies(id) {
    const next = new Set(speciesOn)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSpeciesOn(next)
  }

  return (
    <div className="filter-bar" aria-label="Map filters">
      <span className="mp-pill"><b>{shown}</b> sightings</span>

      <div className="pill-group" role="group" aria-label="Species">
        {species.map((s) => (
          <label key={s.id} className="mp-pill mp-pill--toggle" title={s.tag}>
            <input type="checkbox" checked={speciesOn.has(s.id)} onChange={() => toggleSpecies(s.id)} />
            {s.name}
            <span className="count">{speciesCounts[s.id] || 0}</span>
          </label>
        ))}
      </div>

      <CameraMenu cameraCounts={cameraCounts} cameraId={cameraId} onPick={onPickCamera} year={year} />

      <div className="pill-group" role="group" aria-label="Environmental data">
        {ENV_TOGGLES.map(([v, label, full]) => (
          <label key={v} className="mp-pill mp-pill--toggle" title={`Shade cameras by ${full.toLowerCase()}`}>
            <input type="checkbox" checked={envOn[v]} onChange={() => setEnvOn({ ...envOn, [v]: !envOn[v] })} />
            <i className={`env-swatch ${v}`} aria-hidden="true" />
            {label}
          </label>
        ))}
      </div>
    </div>
  )
}

// Camera picker: the region › area › camera tree with its own search, in a dropdown. Picking a camera zooms the
// map to it and shows its trends in the chart.
function CameraMenu({ cameraCounts, cameraId, onPick, year }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)

  // Close on a click outside or Escape
  useEffect(() => {
    if (!open) return
    const outside = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    const escape = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', escape)
    }
  }, [open])

  const q = search.trim().toLowerCase()
  const matches = (...texts) => !q || texts.some((t) => t.toLowerCase().includes(q))
  const tree = TREE.map((r) => ({
    ...r,
    cameras: r.cameras.filter((c) => matches(c.name, r.name)),
    areas: r.areas.map((a) => ({ ...a, cameras: a.cameras.filter((c) => matches(c.name, a.name, r.name)) }))
      .filter((a) => a.cameras.length),
  })).filter((r) => r.cameras.length || r.areas.length)

  const sum = (cams) => cams.reduce((s, c) => s + (cameraCounts[c.id] || 0), 0)

  const cameraRow = (c) => (
    <li key={c.id}>
      <button type="button" className="tree-row" aria-current={c.id === cameraId || undefined}
        onClick={() => { onPick(c.id); setOpen(false) }}>
        <span>{c.name}</span><span className="count">{cameraCounts[c.id] || 0}</span>
      </button>
    </li>
  )

  return (
    <div className="cam-menu" ref={ref}>
      <button type="button" className="mp-pill cam-menu__btn" aria-expanded={open} onClick={() => setOpen(!open)}>
        Camera: <b>{cameraId ? cameraById[cameraId].name : 'All in view'}</b>
      </button>
      {open && (
        <div className="cam-menu__panel">
          <div className="cam-menu__head">
            <strong>Camera locations</strong>
            <span title={`Underwater cameras recording in ${year}`}>{cameras.length} sites · {cameraTotal(year)} cameras</span>
          </div>
          <label className="search">
            <span className="visually-hidden">Search cameras</span>
            <input type="search" placeholder="Search cameras" value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
          <ul className="tree">
            {tree.map((r) => (
              <li key={r.name}>
                {/* Only regions/areas with sightings (or search matches) start open, to keep the list short */}
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
          {!tree.length && <p className="muted">No cameras match.</p>}
        </div>
      )}
    </div>
  )
}
