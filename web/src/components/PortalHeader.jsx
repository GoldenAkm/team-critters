import { CircleHelp, LibraryBig, RadioTower } from 'lucide-react'
import oncLogo from '../assets/onc-logo.png'
import styles from './PortalHeader.module.css'

// Oceans 3.0 portal header, modelled on data.oceannetworks.ca: the ONC logo
// hangs below the bar on the left, beside "Ocean Networks Canada" and the
// page's name; help, documentation and system status buttons and Log In sit
// on the right. The page's breadcrumb sits just under the bar, beside the logo.
// Every page uses it (the map and Digital Fishers through AppHeader).
const PORTAL_LINKS = [
  { label: 'Help and support', href: 'https://www.oceannetworks.ca/help/', Icon: CircleHelp },
  { label: 'Oceans 3.0 documentation', href: 'https://wiki.oceannetworks.ca/display/O2KB', Icon: LibraryBig },
  { label: 'System status', href: 'https://oceannetworkscanada.statuspage.io', Icon: RadioTower },
]

const LOG_IN_URL = 'https://data.oceannetworks.ca/Login?service=https://data.oceannetworks.ca'

// name: the page's name, shown after "Ocean Networks Canada". On every page
//   the title links to the landing page.
// breadcrumb: from the portal down to this page. Each item is a label, or
//   { label, href } to make it a link, e.g.
//   ['Oceans 3.0', { label: 'Machine Learning Species Identification', href: '/' }, 'Interactive Map']
// band: background for the strip under the bar, on pages whose banner starts
//   right below it: the banner's colour, or 'transparent' over a photo banner.
//   The landing page, with its full-page photo, leaves it out.
export default function PortalHeader({ name = 'ML Species Identifier', breadcrumb = [], band }) {
  return (
    <div
      className={band ? `${styles.top} ${styles.band}` : styles.top}
      style={band ? { '--band': band } : undefined}
    >
      <header className={styles.header}>
        <a className={styles.logoLink} href="https://www.oceannetworks.ca/">
          <img className={styles.logo} src={oncLogo} alt="Ocean Networks Canada" />
        </a>
        {/* Non-breaking spaces keep the page name on one line when the title wraps */}
        <a className={styles.portalName} href="/">
          {`Ocean Networks Canada ${name.replaceAll(' ', ' ')}`}
        </a>
        <nav aria-label="Oceans 3.0">
          <ul className={styles.actions}>
            {PORTAL_LINKS.map(({ label, href, Icon }) => (
              <li key={label}>
                <a className={styles.iconLink} href={href} aria-label={label} title={label}>
                  <Icon size={24} strokeWidth={1.75} aria-hidden="true" />
                </a>
              </li>
            ))}
            <li>
              <a className={styles.logIn} href={LOG_IN_URL}>
                Log In
              </a>
            </li>
          </ul>
        </nav>
      </header>

      {breadcrumb.length > 0 && (
        <nav className={styles.breadcrumbNav} aria-label="Breadcrumb">
          <ol className={styles.breadcrumb}>
            {breadcrumb.map((item, i) => {
              const crumb = typeof item === 'string' ? { label: item } : item
              return (
                <li key={crumb.label} aria-current={i === breadcrumb.length - 1 ? 'page' : undefined}>
                  {crumb.href ? <a href={crumb.href}>{crumb.label}</a> : crumb.label}
                </li>
              )
            })}
          </ol>
        </nav>
      )}
    </div>
  )
}
