import styles from './DemoPanel.module.css'

const VIDEO = `${import.meta.env.BASE_URL}videos/fish-species-detector.mp4`

// Featured demo video: the fish species detector running on ONC footage. Planned to become the live Identify
// panel (still ONC frame, Identify button, box and status drawn on the frame), so it keeps the 16:9 frame.
// Plays on a loop by itself; browsers only allow that when muted (the controls can unmute it). Not for visitors
// who asked for reduced motion: they get the first frame and press play.
const AUTOPLAY = !window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function DemoPanel() {
  return (
    <figure className={styles.panel}>
      <video className={styles.video} src={VIDEO} controls playsInline loop muted autoPlay={AUTOPLAY} preload="auto">
        <a href={VIDEO}>Download the demo video</a>
      </video>
      <figcaption className={styles.caption}>
        <span className={styles.captionTitle}>Featured demo video</span>
        <span className={styles.captionMeta}>ONC footage → AI identification</span>
      </figcaption>
    </figure>
  )
}
