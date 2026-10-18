import { ArrowRight, MapIcon, ScanEye } from 'lucide-react'
import PortalHeader from '../../components/PortalHeader.jsx'
import SiteFooter from '../../components/SiteFooter.jsx'
import DemoPanel from './DemoPanel.jsx'
import InfoCards from './InfoCards.jsx'
import OceanBackground from './OceanBackground.jsx'
import styles from './LandingPage.module.css'

const FEATURES = [
  {
    title: 'Interactive Map',
    href: '/map',
    Icon: MapIcon,
    description:
      'Confirmed rockfish sightings at ONC fixed cameras over time, with water temperature and dissolved oxygen.',
  },
  {
    title: 'Digital Fishers 2.0',
    href: '/digital-fishers',
    Icon: ScanEye,
    description: "Help settle the AI's unsure detections and build your Marine collection.",
  },
]

export default function LandingPage() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <OceanBackground />
      <PortalHeader />

      <main id="main" className={styles.main}>
        <nav aria-label="Breadcrumb">
          <ol className={styles.breadcrumb}>
            <li>Oceans 3.0</li>
            <li aria-current="page">Machine Learning Species Identification</li>
          </ol>
        </nav>

        <header className={styles.hero}>
          <h1 className={styles.title}>Machine Learning Species Identification</h1>
          <p className={styles.tagline}>
            Finding rockfish in Ocean Networks Canada footage, and counting only what the evidence
            supports.
          </p>
        </header>

        <DemoPanel />

        <section className={`${styles.section} ${styles.intro}`} aria-labelledby="intro-heading">
          <p className={styles.eyebrow}>About</p>
          <h2 id="intro-heading" className={styles.introHeading}>
            An AI that knows when it isn't sure
          </h2>
          <p className={styles.introText}>
            Ocean Networks Canada's fixed underwater cameras regularly record life on the coastal
            seafloor. Our AI identifier scans that footage for rockfish and counts a sighting only
            when the visual evidence backs it up. Anything it's unsure about goes to people to check
            instead of into the data.
          </p>
          <p className={styles.introText}>
            Explore where rockfish turn up over time, help settle the AI's unsure calls, and learn
            why rockfish matter for conservation on the BC coast.
          </p>
        </section>

        <section className={styles.section} aria-labelledby="explore-heading">
          <h2 id="explore-heading" className={styles.eyebrow}>
            Explore
          </h2>
          <ul className={styles.grid}>
            {FEATURES.map(({ title, href, Icon, description }) => (
              <li key={title}>
                <a className={styles.featureCard} href={href}>
                  <Icon className={styles.featureIcon} size={30} strokeWidth={1.5} aria-hidden="true" />
                  <h3 className={styles.featureTitle}>{title}</h3>
                  <p className={styles.featureText}>{description}</p>
                  <span className={styles.featureCta}>
                    Open <ArrowRight size={16} aria-hidden="true" />
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <InfoCards />
      </main>

      <SiteFooter />
    </>
  )
}
