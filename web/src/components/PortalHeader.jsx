import { CircleHelp, LibraryBig, RadioTower } from 'lucide-react'
import oncLogo from '../assets/onc-logo.png'
import styles from './PortalHeader.module.css'

// Oceans 3.0 portal header, modelled on data.oceannetworks.ca: the ONC logo
// hangs below the bar on the left; help, documentation and system status
// buttons and Log In sit on the right.
const PORTAL_LINKS = [
  { label: 'Help and support', href: 'https://www.oceannetworks.ca/help/', Icon: CircleHelp },
  { label: 'Oceans 3.0 documentation', href: 'https://wiki.oceannetworks.ca/display/O2KB', Icon: LibraryBig },
  { label: 'System status', href: 'https://oceannetworkscanada.statuspage.io', Icon: RadioTower },
]

const LOG_IN_URL = 'https://data.oceannetworks.ca/Login?service=https://data.oceannetworks.ca'

export default function PortalHeader() {
  return (
    <header className={styles.header}>
      <a className={styles.logoLink} href="https://www.oceannetworks.ca/">
        <img className={styles.logo} src={oncLogo} alt="Ocean Networks Canada" />
      </a>
      <a className={styles.portalName} href="/">
        Ocean Networks Canada ML Species Identifier
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
  )
}
