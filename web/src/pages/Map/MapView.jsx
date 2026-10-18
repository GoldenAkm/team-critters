import { useMemo, useState } from 'react'
import L from 'leaflet'
import { MapContainer, TileLayer, Marker, ZoomControl, useMapEvents } from 'react-leaflet'
import { cameras } from '../../components/data.js'
import { BUBBLE_GROUPS, BUBBLE_ZOOM, envAverage, envColor, envHaloPx, fmtEnv } from './derive.js'

const ALL_BOUNDS = L.latLngBounds(cameras.map((c) => [c.lat, c.lon]))
// One fixed position per camera: react-leaflet moves a marker whenever it gets a new position array, which also
// moves its open tag and pans the map, so a new array on every render loops through the map's move events.
const NO_DATA = envColor('temp', null)
const CAM_POS = Object.fromEntries(cameras.map((c) => [c.id, [c.lat, c.lon]]))
const FIT_OPTS = { paddingTopLeft: [40, 60], paddingBottomRight: [40, 150] }
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

// Each environmental measure that is on shades the dot (split in half when both are on) and adds a halo sized by its value
function cameraIcon(c, count, { envOn, range, year }) {
  const notes = []
  const shades = []
  let halo = ''
  for (const m of ['temp', 'oxygen'].filter((m) => envOn[m])) {
    const v = envAverage(c.id, m, range, year)
    const colour = envColor(m, v)
    shades.push(colour)
    const px = envHaloPx(m, v)
    if (px) halo += `<span class="cam-halo" style="width:${px * 2}px;height:${px * 2}px;background:color-mix(in srgb, ${colour} 22%, transparent);border-color:${colour}"></span>`
    notes.push(fmtEnv(m, v))
  }
  // On a shaded dot the camera glyph turns white, except on the light grey of "no data"
  const glyph = shades.length && !shades.every((s) => s === NO_DATA) ? ';--glyph:#fff' : ''
  const style = (shades.length === 2 ? `background:linear-gradient(90deg, ${shades[0]} 50%, ${shades[1]} 50%)`
    : shades.length ? `background:${shades[0]}` : '') + glyph
  return L.divIcon({
    className: 'cam-icon',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    html: `${halo}<span class="cam-dot" style="${style}"></span>${count ? `<span class="cam-count">${count}</span>` : ''}
      <span class="cam-label"><b>${esc(c.name)}</b>${notes.map((n) => `<small>${esc(n)}</small>`).join('')}</span>`,
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

export default function MapView({ mapRef, cameraCounts, envOn, range, year, areaName, onView, onCameraClick }) {
  const [zoom, setZoom] = useState(3)
  // Zoom of the starting view (every camera in view); "Zoom out" shows only when closer than this
  const [homeZoom, setHomeZoom] = useState(3)
  const [tilesFailed, setTilesFailed] = useState(false)
  const showBubbles = zoom < BUBBLE_ZOOM

  const camIcons = useMemo(() => Object.fromEntries(cameras.map((c) =>
    [c.id, cameraIcon(c, cameraCounts[c.id] || 0, { envOn, range, year })])), [cameraCounts, envOn, range, year])

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
          // Cameras with sightings open the latest one in the species card; empty cameras aren't clickable for now
          cameraCounts[c.id]
            ? <Marker key={c.id} position={CAM_POS[c.id]} icon={camIcons[c.id]} title={`${c.name}: ${cameraCounts[c.id]} sightings`}
                eventHandlers={{ click: () => onCameraClick(c.id) }} />
            : <Marker key={c.id} position={CAM_POS[c.id]} icon={camIcons[c.id]} interactive={false} />
        ))}

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
