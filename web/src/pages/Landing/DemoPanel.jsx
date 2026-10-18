import { PlayIcon } from 'lucide-react'
import styles from './DemoPanel.module.css'

// Featured demo video placeholder. Planned to become the live Identify panel
// (still ONC frame, Identify button, box and status drawn on the frame), so
// it keeps the 16:9 frame.
export default function DemoPanel() {
  return (
    <figure className={`media-placeholder ${styles.panel}`}>
      <span className={styles.play} aria-hidden="true">
        <PlayIcon size={28} strokeWidth={1.5} />
      </span>
      <figcaption className={styles.caption}>
        <span className={styles.captionTitle}>Featured demo video</span>
        <span className={styles.captionMeta}>ONC footage → AI identification · coming soon</span>
      </figcaption>
    </figure>
  )
}
