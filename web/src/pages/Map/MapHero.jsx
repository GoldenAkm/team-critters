// Page hero: title and summary pills over a coastline photo (see .mp-hero in map.css).
export default function MapHero({ shown, year, camerasWithSightings, cameraCount, reviewCount }) {
  return (
    <section className="mp-hero" aria-labelledby="mp-title">
      <div className="mp-hero__inner">
        <div className="mp-hero__top">
          <div className="mp-hero__text">
            <h1 id="mp-title">Interactive Map</h1>
            <p>
              Explore observations of coastal marine species from Ocean Networks Canada&apos;s fixed underwater
              cameras, alongside water temperature, dissolved oxygen and footage availability.
            </p>
          </div>
          <div className="mp-hero__actions">
            <span className="mp-pill"><b>{shown}</b> sightings shown · {year}</span>
            <span className="mp-pill"><b>{camerasWithSightings}</b> of {cameraCount} cameras</span>
            <a className="mp-pill mp-pill--link" href="/digital-fishers/">
              Help review <b>{reviewCount}</b> unsure
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
