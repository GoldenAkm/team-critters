import styles from './SiteFooter.module.css'

// Shown when a page doesn't list its own credits
const DEFAULT_CREDITS = [
  { label: 'Data', text: 'Ocean Networks Canada', href: 'https://www.oceannetworks.ca/' },
]

// credits: { label, text, href? } lines, shown in order. A page that lists its
// own credits should still include the ONC data line.
// tone: 'deep' (the landing page's seafloor colours) or 'sea' (the Interactive
// Map's wave-line colours)
// children: more notes under the credits, such as a page's data sources
export default function SiteFooter({ credits = DEFAULT_CREDITS, tone = 'deep', children }) {
  return (
    <footer className={`${styles.footer} ${tone === 'sea' ? styles.sea : ''}`}>
      <p className={styles.project}>Machine Learning Species Identification</p>
      <dl className={styles.credits}>
        {credits.map(({ label, text, href }) => (
          <div key={label} className={styles.creditRow}>
            <dt>{label}</dt>
            <dd>{href ? <a href={href}>{text}</a> : text}</dd>
          </div>
        ))}
      </dl>
      {children}
    </footer>
  )
}
