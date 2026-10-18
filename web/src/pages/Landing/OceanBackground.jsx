import { useEffect, useRef } from 'react'
import styles from './OceanBackground.module.css'

// Fixed background that "dives" as you scroll: sunlit kelp forest at the top,
// open midwater in the middle, deep seafloor at the bottom. Scroll progress
// (0 at the top, 1 at the bottom) is passed to CSS as --depth.
export default function OceanBackground() {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    let frame = 0

    const update = () => {
      frame = 0
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight
      const depth = maxScroll > 0 ? Math.min(window.scrollY / maxScroll, 1) : 0
      el.style.setProperty('--depth', depth.toFixed(3))
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
    }
  }, [])

  return (
    <div ref={ref} className={styles.ocean} aria-hidden="true">
      <div className={`${styles.layer} ${styles.surface}`} />
      <div className={`${styles.layer} ${styles.midwater}`} />
      <div className={`${styles.layer} ${styles.deep}`} />
      <div className={styles.shade} />
    </div>
  )
}
