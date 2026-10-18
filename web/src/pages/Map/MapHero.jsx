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
        </div>
      </div>
    </section>
  )
}

// Summary pill, above the map
export function MapStats({ shown, year }) {
  return (
    <div className="mp-stats">
      <span className="mp-pill"><b>{shown}</b> sightings shown · {year}</span>
    </div>
  )
}
