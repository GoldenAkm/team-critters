import { useEffect, useRef } from 'react'
import { startOceanEffects } from './oceanEffects.js'
import styles from './OceanBackground.module.css'

// How far down the page each photo fades in, from start to end (0 is the top
// of the page, 1 the bottom)
const MIDWATER_FADE = [0.15, 0.4]
const DEEP_FADE = [0.55, 0.8]

const fadeIn = (depth, [start, end]) => Math.min(Math.max((depth - start) / (end - start), 0), 1)

// Fixed background that "dives" as you scroll: sunlit kelp forest at the top,
// open midwater in the middle, deep seafloor at the bottom. Each photo has its
// own moving effect (sunbeams, bubbles, marine snow) drawn by oceanEffects.js.
export default function OceanBackground() {
  const ref = useRef(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    const el = ref.current
    const effects = startOceanEffects(canvasRef.current)
    let frame = 0

    const update = () => {
      frame = 0
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight
      const depth = maxScroll > 0 ? Math.min(window.scrollY / maxScroll, 1) : 0
      const midwater = fadeIn(depth, MIDWATER_FADE)
      const deep = fadeIn(depth, DEEP_FADE)
      el.style.setProperty('--midwater', midwater.toFixed(3))
      el.style.setProperty('--deep', deep.toFixed(3))
      effects.setMix(
        { sunbeams: 1 - midwater, bubbles: midwater * (1 - deep), snow: deep },
        window.scrollY,
      )
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      effects.stop()
    }
  }, [])

  return (
    <div ref={ref} className={styles.ocean} aria-hidden="true">
      <div className={`${styles.layer} ${styles.surface}`} />
      <div className={`${styles.layer} ${styles.midwater}`} />
      <div className={`${styles.layer} ${styles.deep}`} />
      <div className={styles.shade} />
      <canvas ref={canvasRef} className={styles.effects} />
    </div>
  )
}
