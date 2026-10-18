// Site header shared by every page. Tabs are plain links: each page is its own directory/HTML document.
import oncLogo from '../assets/onc-logo.png'
import './AppHeader.css'

const PAGES = [
  { id: 'map', href: '/map/', label: 'Interactive Map' },
  { id: 'digital-fishers', href: '/digital-fishers/', label: 'Digital Fishers 2.0' },
]

export default function AppHeader({ active }) {
  return (
    <header className="app-header">
      <a href="/" className="brand" aria-label="Critters home">
        <img className="brand-mark" src={oncLogo} alt="" width="40" height="40" />
        <span className="brand-text">
          <b>Critters</b>
          <small>with Ocean Networks Canada data</small>
        </span>
      </a>
      <nav className="app-tabs" aria-label="Main">
        {PAGES.map((p) => (
          <a key={p.id} href={p.href} className={`tab${active === p.id ? ' active' : ''}`} aria-current={active === p.id ? 'page' : undefined}>
            {p.label}
          </a>
        ))}
      </nav>
      <a className="app-ext" href="https://data.oceannetworks.ca/SeaTube" target="_blank" rel="noreferrer">
        SeaTube <span aria-hidden="true">↗</span>
      </a>
    </header>
  )
}
