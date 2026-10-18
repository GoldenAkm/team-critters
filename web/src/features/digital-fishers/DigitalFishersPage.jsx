// Digital Fishers 2.0: where people review sightings marked "Needs review". Starter page; the review flow is not built yet.
import AppHeader from '../../shared/AppHeader.jsx'
import { detections, species } from '../../shared/data.js'
import '../../shared/page.css'

export default function DigitalFishersPage() {
  const queue = detections.filter((d) => d.status === 'needs_review')
  const bySpecies = species.map((s) => ({ ...s, n: queue.filter((d) => d.speciesId === s.id).length })).filter((s) => s.n)

  return (
    <div className="page">
      <AppHeader active="digital-fishers" />
      <main className="page-main">
        <section className="page-hero">
          <span className="eyebrow">Coming soon</span>
          <h1>Digital Fishers 2.0</h1>
          <p>
            When a sighting isn't reliable enough to count, it lands here. People look at the camera frame and confirm or
            reject it, and confirmed sightings appear on the Interactive Map.
          </p>
        </section>
        <div className="card-grid">
          <div className="link-card">
            <div className="stat">{queue.length}</div>
            <div className="stat-label">sightings waiting for review</div>
            <p style={{ marginTop: 10 }}>{bySpecies.map((s) => `${s.n} ${s.name.toLowerCase()}`).join(', ')}</p>
          </div>
          <div className="link-card">
            <h2>How it will work</h2>
            <ol className="steps">
              <li>See the frame and the AI's guess</li>
              <li>Confirm, reject or skip</li>
              <li>Agreement from several people confirms it</li>
            </ol>
          </div>
          <a className="link-card" href="/map/">
            <h2>Interactive Map →</h2>
            <p>Turn on "Needs review" in the map filters to see where these sightings are.</p>
          </a>
        </div>
      </main>
    </div>
  )
}
