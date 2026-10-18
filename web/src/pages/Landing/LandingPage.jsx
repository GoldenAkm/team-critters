import { ArrowRight, MapIcon, ScanEye } from 'lucide-react'
import PortalHeader from '../../components/PortalHeader.jsx'
import SiteFooter from '../../components/SiteFooter.jsx'
import DemoPanel from './DemoPanel.jsx'
import InfoCards from './InfoCards.jsx'
import OceanBackground from './OceanBackground.jsx'
import styles from './LandingPage.module.css'

const CREDITS = [
  {
    label: 'Top photo',
    text: 'Blue Rockfish in a Kelp Forest: Chad King/NOAA, Monterey Bay National Marine Sanctuary (public domain)',
  },
  { label: 'Data', text: 'Ocean Networks Canada', href: 'https://www.oceannetworks.ca/' },
  {
    label: 'Jellyfish and deep-sea photos',
    text: 'Ocean Networks Canada',
    href: 'https://ibase.oceannetworks.ca/',
  },
]

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
    description: "Help settle the frames the AI couldn't decide on.",
  },
]

export default function LandingPage() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <OceanBackground />
      <PortalHeader breadcrumb={['Oceans 3.0', 'Machine Learning Species Identification']} />

      <main id="main" className={styles.main}>
        <header className={styles.hero}>
          <h1 className={styles.title}>Machine Learning Species Identification</h1>
          {/* On wider screens each phrase gets its own line (see .tagline), and
              ONC's name never splits across lines */}
          <p className={styles.tagline}>
            <span>
              Discovering marine life through Ocean&nbsp;Networks&nbsp;Canada's underwater footage,
            </span>{' '}
            <span>using machine learning to transform ocean observations</span>{' '}
            <span>into meaningful insights for research and conservation.</span>
          </p>
        </header>

        <DemoPanel />

        <section className={`${styles.section} ${styles.intro}`} aria-labelledby="intro-heading">
          <p className={styles.eyebrow}>About</p>
          <h2 id="intro-heading" className={styles.introHeading}>
            Machine learning guided by evidence
          </h2>
          <p className={styles.introText}>
            Ocean Networks Canada's underwater cameras offer a window into the diverse marine life
            inhabiting Canada's coastal ecosystems. Digital Fisher explores how machine learning can
            transform underwater footage into meaningful insights about marine biodiversity and
            wildlife activity.
          </p>
          <p className={styles.introText}>
            Our approach prioritizes reliable observations over assumptions. Potential wildlife
            sightings are evaluated using visual evidence, while uncertain identifications are
            flagged for human review rather than automatically counted.
          </p>
          <p className={styles.introText}>
            Explore marine wildlife observations, contribute to species identification, and discover
            how technology can support ocean research, biodiversity monitoring, and marine
            conservation.
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

      <SiteFooter credits={CREDITS} />
    </>
  )
}
