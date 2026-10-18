// Placeholder until the landing page (teammate) lands. Safe to replace.
import AppHeader, { PAGES } from '../../shared/AppHeader.jsx'
import '../../shared/page.css'

const BLURBS = {
  map: 'See where rockfish were sighted at ONC fixed cameras, alongside water temperature, oxygen and footage availability.',
  'digital-fishers': 'Help check sightings the AI is unsure about, so only trustworthy observations reach the map.',
}

export default function LandingPage() {
  return (
    <div className="page">
      <AppHeader />
      <main className="page-main">
        <section className="page-hero">
          <span className="eyebrow">Hackathon prototype</span>
          <h1>Discover the marine life on Canada's ocean cameras</h1>
          <p>Critters uses Ocean Networks Canada footage to find and learn about coastal species, starting with rockfish.</p>
        </section>
        <div className="card-grid">
          {PAGES.map((p) => (
            <a key={p.id} className="link-card" href={p.href}>
              <h2>{p.label} →</h2>
              <p>{BLURBS[p.id]}</p>
            </a>
          ))}
        </div>
      </main>
    </div>
  )
}
