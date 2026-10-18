import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import { species, cameras, detections, WEEKS, DEFAULT_YEAR } from '../../shared/data.js'
import { BUBBLE_GROUPS, BUBBLE_ZOOM, countBy, filterDetections } from './derive.js'
import Sidebar from './Sidebar.jsx'
import MapView from './MapView.jsx'
import Timeline from './Timeline.jsx'
import EnvTiles from './EnvTiles.jsx'
import SpeciesCard from './SpeciesCard.jsx'
import TrendsPanel from './TrendsPanel.jsx'
import AppHeader from '../../shared/AppHeader.jsx'
import './map.css'

const FULL_YEAR = [0, WEEKS - 1]
const DEFAULT_STATUS = { identified: true, uncertain: false, needs_review: false }
const PLAY_WINDOW = 4

export default function MapPage() {
  const [speciesOn, setSpeciesOn] = useState(() => new Set(species.map((s) => s.id)))
  const [statusOn, setStatusOn] = useState(DEFAULT_STATUS)
  const [envMode, setEnvMode] = useState('off')
  const [year, setYear] = useState(DEFAULT_YEAR)
  const [range, setRange] = useState(FULL_YEAR)
  const [playing, setPlaying] = useState(false)
  const [search, setSearch] = useState('')
  const [card, setCard] = useState(null) // { detection, count }
  const [trendsCameraId, setTrendsCameraId] = useState(null)
  const [view, setView] = useState({ zoom: 3, inView: cameras.map((c) => c.id) })
  const mapRef = useRef(null)

  const filtered = useMemo(
    () => filterDetections(detections, { speciesOn, statusOn, range, year }),
    [speciesOn, statusOn, range, year],
  )
  // Species counts ignore the species filter itself so unchecked species still show what they'd add.
  const speciesCounts = useMemo(
    () => countBy(filterDetections(detections, { speciesOn: new Set(species.map((s) => s.id)), statusOn, range, year }), 'speciesId'),
    [statusOn, range, year],
  )
  const cameraCounts = useMemo(() => countBy(filtered, 'cameraId'), [filtered])

  const areaName = useMemo(() => {
    if (view.zoom < BUBBLE_ZOOM) return null
    const groups = BUBBLE_GROUPS.filter((g) => g.cameraIds.some((id) => view.inView.includes(id)))
    return groups.length === 1 ? groups[0].name : null
  }, [view])

  // Play: slide the period forward one week at a time
  useEffect(() => {
    if (!playing) return
    const t = setInterval(() => {
      setRange(([a, b]) => {
        if (b >= WEEKS - 1) { setPlaying(false); return [a, b] }
        return [a + 1, b + 1]
      })
    }, 700)
    return () => clearInterval(t)
  }, [playing])

  function togglePlay() {
    if (playing) return setPlaying(false)
    if (range[1] - range[0] >= WEEKS - 1 || range[1] >= WEEKS - 1) setRange([0, PLAY_WINDOW - 1])
    setPlaying(true)
  }

  function openCamera(cameraId) {
    const c = cameras.find((x) => x.id === cameraId)
    // Keep the camera in the upper part of the map so the trends drawer doesn't cover it
    const drawer = Math.min(520, window.innerHeight * 0.6)
    mapRef.current?.flyToBounds(L.latLng(c.lat, c.lon).toBounds(30000), { paddingBottomRight: [0, drawer], maxZoom: 8, duration: 0.8 })
    setTrendsCameraId(cameraId)
  }

  function resetFilters() {
    setSpeciesOn(new Set(species.map((s) => s.id)))
    setStatusOn(DEFAULT_STATUS)
    setEnvMode('off')
    setRange(FULL_YEAR)
    setYear(DEFAULT_YEAR)
    setPlaying(false)
    setSearch('')
  }

  return (
    <div className="map-shell">
      <AppHeader active="map" />
      <div className="map-page">
        <Sidebar
          search={search} setSearch={setSearch}
          speciesOn={speciesOn} setSpeciesOn={setSpeciesOn} speciesCounts={speciesCounts}
          statusOn={statusOn} setStatusOn={setStatusOn}
          envMode={envMode} setEnvMode={setEnvMode}
          cameraCounts={cameraCounts} onCameraClick={openCamera}
          shownCount={filtered.length} onReset={resetFilters}
        />
        <main className="map-main" aria-label="Map of ONC camera sites">
          <MapView
            mapRef={mapRef}
            filtered={filtered} cameraCounts={cameraCounts}
            envMode={envMode} range={range} year={year}
            areaName={areaName}
            onView={setView}
            onMarkerClick={(detection, count) => setCard({ detection, count })}
            onCameraClick={openCamera}
          />
          {envMode !== 'off' && (
            <EnvTiles envMode={envMode} setEnvMode={setEnvMode} range={range} year={year} cameraIds={view.inView} />
          )}
          {card && (
            <SpeciesCard
              {...card}
              onClose={() => setCard(null)}
              onTrends={(id) => { openCamera(id); setCard(null) }}
            />
          )}
          <div className="map-bottom">
            {trendsCameraId && (
              <TrendsPanel
                cameraId={trendsCameraId} speciesOn={speciesOn} statusOn={statusOn} range={range} year={year}
                onClose={() => setTrendsCameraId(null)}
              />
            )}
            <Timeline
              range={range} year={year}
              setYear={(y) => { setPlaying(false); setCard(null); setYear(y) }}
              setRange={(r) => { setPlaying(false); setRange(r) }}
              playing={playing} onTogglePlay={togglePlay}
              areaName={areaName} cameraIds={view.inView}
            />
          </div>
        </main>
      </div>
    </div>
  )
}
