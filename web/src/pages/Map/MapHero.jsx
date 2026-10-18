// Page hero, same pattern as Digital Fishers 2.0: deep-ocean band, title, summary pills, four reading steps.
const STEPS = [
  ['Choose a time', 'Pick a year, then drag the timeline to any period.'],
  ['Confirmed only', 'Unsure sightings stay hidden unless you turn them on.'],
  ["Gaps aren't absence", 'Dotted cameras and hatched weeks had no footage to look at.'],
  ['Click a camera', 'See its temperature, oxygen and sightings over the year.'],
]

export default function MapHero({ shown, year, camerasWithSightings, cameraCount, reviewCount }) {
  return (
    <section className="mp-hero" aria-labelledby="mp-title">
      <div className="mp-hero__inner">
        <div className="mp-hero__top">
          <div className="mp-hero__text">
            <span className="mp-eyebrow">Ocean Networks Canada · fixed cameras</span>
            <h1 id="mp-title">Interactive Map</h1>
            <p>
              Where rockfish were seen on ONC&apos;s underwater cameras, alongside water temperature, oxygen and how
              much footage there was to look at.
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
        <ol className="mp-steps" aria-label="How to read the map">
          {STEPS.map(([title, text], i) => (
            <li key={title}>
              <span className="mp-steps__n">{i + 1}</span>
              <div>
                <strong>{title}</strong>
                <p>{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
