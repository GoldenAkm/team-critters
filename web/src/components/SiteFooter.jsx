import styles from './SiteFooter.module.css'

export default function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <p>Machine Learning Species Identification · prototype</p>
      <p className={styles.credit}>
        Data: <a href="https://www.oceannetworks.ca/">Ocean Networks Canada</a>
      </p>
    </footer>
  )
}
