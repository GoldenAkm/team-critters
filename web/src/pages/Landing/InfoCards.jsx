import { ArrowUpRight, ImageIcon } from 'lucide-react'
import styles from './InfoCards.module.css'

// "Learn more" cards at the bottom of the landing page. Each links to an
// existing outside information page. URLs still to be added.
// `image` is the picture link; leave it '' to show the placeholder box.
// `credit` is shown as a line of text under the picture.
// Green crab is educational only: it isn't in the ONC data and the AI
// doesn't detect it.
const INFO_CARDS = [
  {
    tag: 'Invasive species',
    title: 'European green crab',
    href: '#',
    image: '/images/green_crab_card.jpg',
    imageAlt: 'European green crab',
    credit: 'Photo: Weyenbergh Jacky / PublicDomainPictures.net',
    description:
      "Read about this invasive crab on Canada's coasts. A tool like ours could be trained to spot it early and help researchers stop its spread.",
  },
  {
    tag: 'Conservation',
    title: 'Rockfish conservation',
    href: '#',
    image: '/images/copper_rockfish_card.jpg',
    imageAlt: 'Copper rockfish',
    credit: 'Photo: Chad King / NOAA MBNMS (Wikimedia Commons)',
    description:
      'Read why slow-growing rockfish are at risk. Our tool may help show whether conservation efforts are working and numbers are rising.',
  },
]

export default function InfoCards() {
  return (
    <section className={styles.section} aria-labelledby="learn-heading">
      <h2 id="learn-heading" className={styles.eyebrow}>
        Learn more
      </h2>
      <ul className={styles.grid}>
        {INFO_CARDS.map(({ tag, title, href, image, imageAlt, credit, description }) => (
          <li key={title}>
            <a className={styles.card} href={href}>
              {image ? (
                <figure className={styles.figure}>
                  <img className={`${styles.image} ${styles.photo}`} src={image} alt={imageAlt} />
                  {credit && <figcaption className={styles.credit}>{credit}</figcaption>}
                </figure>
              ) : (
                <div className={`media-placeholder ${styles.image}`} aria-hidden="true">
                  <ImageIcon size={28} strokeWidth={1.25} />
                </div>
              )}
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
