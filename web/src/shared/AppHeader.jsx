// Site header shared by every page. Tabs are plain links: each page is its own directory/HTML document.
import './AppHeader.css'

export const PAGES = [
  { id: 'map', href: '/map/', label: 'Interactive Map' },
  { id: 'digital-fishers', href: '/digital-fishers/', label: 'Digital Fishers 2.0' },
]

export default function AppHeader({ active }) {
  return (
    <header className="app-header">
      <a href="/" className="brand" aria-label="Critters home">
        <span className="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 32 32" width="22" height="22">
            <path d="M5 16c4-6 10-8 15-6 2.5 1 4.5 3 6 6-1.5 3-3.5 5-6 6-5 2-11 0-15-6Zm-2-5 4 5-4 5" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
            <circle cx="21" cy="14.5" r="1.6" fill="#fff" />
          </svg>
        </span>
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
