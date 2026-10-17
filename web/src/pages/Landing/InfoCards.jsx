import { ArrowUpRight, ImageIcon } from 'lucide-react'
import styles from './InfoCards.module.css'

// "Learn more" cards at the bottom of the landing page. Each links to an
// existing outside information page. URLs and pictures still to be added.
// Green crab is educational only: it isn't in the ONC data and the AI
// doesn't detect it.
const INFO_CARDS = [
  {
    tag: 'Invasive species',
    title: 'European green crab',
    href: '#',
    description:
      "An invasive crab on both of Canada's coasts, and why spotting it early matters. It isn't in this ONC footage, so the AI doesn't look for it.",
  },
  {
    tag: 'Conservation',
    title: 'Rockfish conservation',
    href: '#',
    description:
      'Why some BC rockfish species are at risk, and how long-term camera monitoring can help.',
  },
]

export default function InfoCards() {
  return (
    <section className={styles.section} aria-labelledby="learn-heading">
      <h2 id="learn-heading" className={styles.eyebrow}>
        Learn more
      </h2>
      <ul className={styles.grid}>
        {INFO_CARDS.map(({ tag, title, href, description }) => (
          <li key={title}>
            <a className={styles.card} href={href}>
              <div className={`media-placeholder ${styles.image}`} aria-hidden="true">
                <ImageIcon size={28} strokeWidth={1.25} />
              </div>
              <div className={styles.body}>
                <p className={styles.tag}>{tag}</p>
                <h3 className={styles.title}>
                  {title} <ArrowUpRight size={18} aria-hidden="true" />
                </h3>
                <p className={styles.text}>{description}</p>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
