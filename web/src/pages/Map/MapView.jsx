import { useMemo, useState } from 'react'
import L from 'leaflet'
import { MapContainer, TileLayer, Marker, ZoomControl, useMapEvents } from 'react-leaflet'
import { species, cameras } from '../../components/data.js'
import { STATUS_LABEL } from '../../components/status.js'
import { speciesIconSvg } from '../../components/speciesIcon.js'
import { BUBBLE_GROUPS, BUBBLE_ZOOM, envAverage, envColor, envHaloPx, fmtEnv, footageSummary } from './derive.js'

const ALL_BOUNDS = L.latLngBounds(cameras.map((c) => [c.lat, c.lon]))
const FIT_OPTS = { paddingTopLeft: [40, 60], paddingBottomRight: [40, 150] }
const speciesById = Object.fromEntries(species.map((s) => [s.id, s]))
const STATUS_ORDER = ['identified', 'needs_review', 'uncertain']
const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]))

function ViewTracker({ onView }) {
  const map = useMapEvents({
    moveend: report,
    zoomend: report,
  })
  function report() {
    const b = map.getBounds()
    onView({ zoom: map.getZoom(), inView: cameras.filter((c) => b.contains([c.lat, c.lon])).map((c) => c.id) })
  }
  return null
}

function cameraIcon(c, { envMode, range, year }) {
  const foot = footageSummary(c.id, range, year)
  const notes = []
  let style = '', halo = ''
  if (envMode !== 'off') {
    const v = envAverage(c.id, envMode, range, year)
    style = `background:${envColor(envMode, v)}`
    const px = envHaloPx(envMode, v)
    if (px) halo = `<span class="cam-halo" style="width:${px * 2}px;height:${px * 2}px;background:${envColor(envMode, v)}"></span>`
    notes.push(fmtEnv(envMode, v))
  }
  if (foot.state === 'murky') notes.push(`murky ${foot.murkyPct}% of period`)
  if (foot.state === 'none') notes.push('no footage in period')
  return L.divIcon({
    className: 'cam-icon',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    html: `${halo}<span class="cam-dot foot-${foot.state}" style="${style}"></span>
      <span class="cam-label"><b>${esc(c.name)}</b>${notes.map((n) => `<small>${esc(n)}</small>`).join('')}</span>`,
  })
}

function detectionIcon(group, i, n) {
  const sp = speciesById[group.speciesId]
  const x = (i - (n - 1) / 2) * 38
  return L.divIcon({
    className: 'det-icon',
    iconSize: [36, 36],
    iconAnchor: [18 - x, 18 + 28],
    html: speciesIconSvg(sp.id, group.status, 36) + (group.count > 1 ? `<span class="det-badge">${group.count}</span>` : ''),
  })
}

// The count fills the circle; the region's name sits on a tag beside it, so it never has to squeeze inside.
// The two BC regions are close together, so their circles are nudged apart (px) and tagged above and below.
const BUBBLE_LAYOUT = { bc_north: { tag: 'above', nudge: [-6, -12] }, southern_bc: { tag: 'below', nudge: [6, 12] } }

function bubbleIcon(group, count) {
  const size = 38 + Math.min(20, Math.sqrt(count) * 3)
  const { tag = 'left', nudge: [dx, dy] = [0, 0] } = BUBBLE_LAYOUT[group.id] ?? {}
  return L.divIcon({
    className: 'bubble-icon',
    iconSize: [size, size],
    iconAnchor: [size / 2 - dx, size / 2 - dy],
    html: `<div class="bubble bubble--tag-${tag}${count ? '' : ' bubble--empty'}" style="width:${size}px;height:${size}px"><b>${count}</b><small>${esc(group.name)}</small></div>`,
  })
}

export default function MapView({ mapRef, filtered, cameraCounts, envMode, range, year, areaName, onView, onMarkerClick, onCameraClick }) {
  const [zoom, setZoom] = useState(3)
  // Zoom of the starting view (every camera in view); "Zoom out" shows only when closer than this
  const [homeZoom, setHomeZoom] = useState(3)
  const [tilesFailed, setTilesFailed] = useState(false)
  const showBubbles = zoom < BUBBLE_ZOOM

  // One marker per camera + species + status, carrying the latest detection in the period.
  const groupsByCamera = useMemo(() => {
    const out = {}
    for (const d of filtered) {
      const key = `${d.speciesId}|${d.status}`
      const list = (out[d.cameraId] ||= {})
      const g = (list[key] ||= { speciesId: d.speciesId, status: d.status, count: 0, latest: d })
      g.count++
      if (d.timestamp > g.latest.timestamp) g.latest = d
    }
    const speciesOrder = species.map((s) => s.id)
    return Object.fromEntries(Object.entries(out).map(([cam, groups]) => [cam, Object.values(groups).sort((a, b) =>
      speciesOrder.indexOf(a.speciesId) - speciesOrder.indexOf(b.speciesId) || STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status))]))
  }, [filtered])

  const camIcons = useMemo(() => Object.fromEntries(cameras.map((c) =>
    [c.id, cameraIcon(c, { envMode, range, year })])), [envMode, range, year])

  return (
    <div className="map-wrap">
      <MapContainer
        ref={mapRef}
        bounds={ALL_BOUNDS}
        boundsOptions={FIT_OPTS}
        zoomControl={false}
        worldCopyJump
        minZoom={2}
        maxZoom={12}
        className="leaflet-map"
        whenReady={(e) => { setZoom(e.target.getZoom()); setHomeZoom(e.target.getZoom()) }}
      >
        <ZoomControl position="topright" />
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}"
          attribution="Tiles &copy; Esri &mdash; Sources: GEBCO, NOAA, CHS, OSU, UNH, CSUMB, National Geographic, DeLorme, NAVTEQ, and Esri"
          maxNativeZoom={10}
          maxZoom={12}
          eventHandlers={{ tileerror: () => setTilesFailed(true) }}
        />
        <ViewTracker onView={(v) => { setZoom(v.zoom); onView(v) }} />

        {showBubbles && BUBBLE_GROUPS.map((g) => {
          const count = g.cameraIds.reduce((s, id) => s + (cameraCounts[id] || 0), 0)
          return (
            <Marker key={g.id} position={g.center} icon={bubbleIcon(g, count)}
              title={`${g.name}: ${count} detections. Zoom in`}
              eventHandlers={{ click: () => mapRef.current?.flyToBounds(g.bounds, { ...FIT_OPTS, maxZoom: 8, duration: 0.8 }) }} />
          )
        })}

        {!showBubbles && cameras.map((c) => (
          <Marker key={c.id} position={[c.lat, c.lon]} icon={camIcons[c.id]} title={`${c.name}: open site trends`}
            eventHandlers={{ click: () => onCameraClick(c.id) }} />
        ))}

        {!showBubbles && cameras.flatMap((c) => {
          const groups = groupsByCamera[c.id] || []
          return groups.map((g, i) => (
            <Marker key={`${c.id}-${g.speciesId}-${g.status}`} position={[c.lat, c.lon]} zIndexOffset={500}
              icon={detectionIcon(g, i, groups.length)}
              title={`${speciesById[g.speciesId].name}, ${STATUS_LABEL[g.status]} at ${c.name} (${g.count})`}
              eventHandlers={{ click: () => onMarkerClick(g.latest, g.count) }} />
          ))
        })}
      </MapContainer>

      <nav className="map-toolbar" aria-label="Map location">
        <button type="button" className="crumb" onClick={() => mapRef.current?.flyToBounds(ALL_BOUNDS, { ...FIT_OPTS, duration: 0.8 })}>
          All regions
        </button>
        {areaName && <span className="crumb-sep">› {areaName}</span>}
        {zoom > homeZoom && (
          <button type="button" className="fit-btn" onClick={() => mapRef.current?.flyToBounds(ALL_BOUNDS, { ...FIT_OPTS, duration: 0.8 })}>
            Zoom out
          </button>
        )}
      </nav>
      {tilesFailed && <p className="tiles-note" role="status">Map background unavailable offline. Camera positions are still accurate.</p>}
    </div>
  )
}
