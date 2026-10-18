// Page hero: title and summary over a coastline photo (see .mp-hero in map.css).
export default function MapHero() {
  return (
    <section className="mp-hero" aria-labelledby="mp-title">
      <div className="mp-hero__inner">
        <div className="mp-hero__text">
          <h1 id="mp-title">Interactive Map</h1>
          <p>
            Explore observations of coastal marine species from Ocean Networks Canada&apos;s fixed underwater
            cameras, alongside water temperature, dissolved oxygen and footage availability.
          </p>
          <a className="mp-hero__cta" href="/digital-fishers/">Help review unsure sightings in Digital Fishers 2.0 →</a>
        </div>
      </div>
    </section>
  )
}

