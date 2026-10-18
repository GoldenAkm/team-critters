import { useEffect, useMemo, useRef, useState } from 'react'
import { species, cameras, detections, WEEKS, DEFAULT_YEAR } from '../../components/data.js'
import { BUBBLE_GROUPS, BUBBLE_ZOOM, countBy, filterDetections } from './derive.js'
import FilterBar from './FilterBar.jsx'
import MapView from './MapView.jsx'
import Timeline from './Timeline.jsx'
import SpeciesCard from './SpeciesCard.jsx'
import TrendsPanel from './TrendsPanel.jsx'
import AppHeader from '../../components/AppHeader.jsx'
import SiteFooter from '../../components/SiteFooter.jsx'
import MapHero from './MapHero.jsx'
import OceanWaves, { OCEAN_LOOK } from './OceanWaves.jsx'
import DataNote from './DataNote.jsx'
import './map.css'

const FULL_YEAR = [0, WEEKS - 1]
// Only Identified detections count as sightings and show on the map
const COUNTED = { identified: true, uncertain: false, needs_review: false }
const ENV_OFF = { temp: false, oxygen: false }
const PLAY_WINDOW = 4
const CREDITS = [
  {
    label: 'Top photo',
    text: 'Sandstone bluffs northwest of Port Renfrew, British Columbia: Roy Luck, via Wikimedia Commons, CC BY 2.0 (cropped and sharpened)',
    href: 'https://creativecommons.org/licenses/by/2.0/',
  },
  { label: 'Data', text: 'Ocean Networks Canada', href: 'https://www.oceannetworks.ca/' },
  { label: 'Map tiles', text: 'Esri; sources: GEBCO, NOAA, CHS, National Geographic and others' },
]

export default function MapPage() {
  const [speciesOn, setSpeciesOn] = useState(() => new Set(species.map((s) => s.id)))
  const [envOn, setEnvOn] = useState(ENV_OFF)
  const [year, setYear] = useState(DEFAULT_YEAR)
  const [range, setRange] = useState(FULL_YEAR)
  const [playing, setPlaying] = useState(false)
  const [card, setCard] = useState(null) // { detection, count }
  // The chart beside the map shows this camera, or the cameras in view when null
  const [trendsCameraId, setTrendsCameraId] = useState(null)
  const [view, setView] = useState({ zoom: 3, inView: cameras.map((c) => c.id) })
  const mapRef = useRef(null)

  const filtered = useMemo(
    () => filterDetections(detections, { speciesOn, statusOn: COUNTED, range, year }),
    [speciesOn, range, year],
  )
  // Species counts ignore the species filter itself so unchecked species still show what they'd add.
  const speciesCounts = useMemo(
    () => countBy(filterDetections(detections, { speciesOn: new Set(species.map((s) => s.id)), statusOn: COUNTED, range, year }), 'speciesId'),
    [range, year],
  )
  const cameraCounts = useMemo(() => countBy(filtered, 'cameraId'), [filtered])
  // The latest sighting at each camera in the period, opened in the species card when its camera is clicked
  const latestByCamera = useMemo(() => {
    const out = {}
    for (const d of filtered) if (!out[d.cameraId] || d.timestamp > out[d.cameraId].timestamp) out[d.cameraId] = d
    return out
  }, [filtered])

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
    mapRef.current?.flyTo([c.lat, c.lon], 8, { duration: 0.8 })
    setTrendsCameraId(cameraId)
  }

  return (
    <>
      <a className="skip-link" href="#main">Skip to main content</a>
      {/* The hero's photo runs up behind the header's strip */}
      <AppHeader active="map" band="transparent" />
      <main id="main" className="mp-page" data-ocean={OCEAN_LOOK}>
        <OceanWaves />
        <MapHero />

        <div className="mp-body">
          <FilterBar
            shown={filtered.length}
            speciesOn={speciesOn} setSpeciesOn={setSpeciesOn} speciesCounts={speciesCounts}
            envOn={envOn} setEnvOn={setEnvOn}
            cameraCounts={cameraCounts} cameraId={trendsCameraId} onPickCamera={openCamera}
            year={year}
          />
          {/* Map and chart side by side, sharing the timeline underneath */}
          <section className="mp-card mp-frame" aria-label="Map of ONC camera sites with trends">
            <div className="mp-frame__top">
              <div className="map-main">
                <MapView
                  mapRef={mapRef}
                  cameraCounts={cameraCounts}
                  envOn={envOn} range={range} year={year}
                  areaName={areaName}
                  onView={setView}
                  onCameraClick={(id) => { setCard({ detection: latestByCamera[id], count: cameraCounts[id] }); setTrendsCameraId(id) }}
                />
                {card && (
                  <SpeciesCard
                    key={card.detection.id}
                    {...card}
                    onClose={() => setCard(null)}
                    onTrends={(id) => { openCamera(id); setCard(null) }}
                  />
                )}
              </div>
              <TrendsPanel
                cameraId={trendsCameraId} cameraIds={view.inView} areaName={areaName}
                onBackToArea={() => setTrendsCameraId(null)}
                speciesOn={speciesOn} statusOn={COUNTED} range={range} year={year}
              />
            </div>
            <Timeline
              range={range} year={year}
              setYear={(y) => { setPlaying(false); setCard(null); setYear(y) }}
              setRange={(r) => { setPlaying(false); setRange(r) }}
              playing={playing} onTogglePlay={togglePlay}
              areaName={areaName} cameraIds={view.inView}
            />
          </section>
        </div>
      </main>
      <SiteFooter credits={CREDITS} tone="sea">
        <DataNote />
      </SiteFooter>
    </>
  )
}
