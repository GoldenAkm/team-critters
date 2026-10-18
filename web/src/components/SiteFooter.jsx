import styles from './SiteFooter.module.css'

// Shown when a page doesn't list its own credits
const DEFAULT_CREDITS = [
  { label: 'Data', text: 'Ocean Networks Canada', href: 'https://www.oceannetworks.ca/' },
]

// credits: { label, text, href? } lines, shown in order. A page that lists its
// own credits should still include the ONC data line.
export default function SiteFooter({ credits = DEFAULT_CREDITS }) {
  return (
    <footer className={styles.footer}>
      <p className={styles.project}>Machine Learning Species Identification · prototype</p>
      <dl className={styles.credits}>
        {credits.map(({ label, text, href }) => (
          <div key={label} className={styles.creditRow}>
            <dt>{label}</dt>
            <dd>{href ? <a href={href}>{text}</a> : text}</dd>
          </div>
        ))}
      </dl>
    </footer>
  )
}
