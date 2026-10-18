import { useEffect, useRef } from 'react'
import { startOceanWaves } from './oceanWaves.js'
import { startOceanCaustics } from './oceanCaustics.js'

// The map page's ocean background has two looks; change this one word to switch.
//   'realistic': sunlight caustics, light shafts and particles (oceanCaustics.js)
//   'clean': calm wave lines with light glints that curl around slow eddies (oceanWaves.js)
// Without WebGL, 'realistic' falls back to 'clean' wave lines.
export const OCEAN_LOOK = 'clean'

export default function OceanWaves() {
  const ref = useRef(null)
  useEffect(() => {
    const canvas = ref.current
    return (OCEAN_LOOK === 'realistic' && startOceanCaustics(canvas)) || startOceanWaves(canvas)
  }, [])
  return <canvas ref={ref} className="mp-waves" aria-hidden="true" />
}
