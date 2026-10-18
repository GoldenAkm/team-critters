export default function SessionComplete({ stats, onRestart }) {
  return (
    <section className="session-complete" aria-labelledby="session-title">
      <div className="session-complete__tick" aria-hidden="true">✓</div>
      <h2 id="session-title">Session complete</h2>
      <dl className="stats">
        <div><dt>Frames reviewed</dt><dd className="mono">{stats.reviewed}</dd></div>
        <div className="stats__placeholder"><dt>Reward (placeholder)</dt><dd className="mono">TBD</dd></div>
      </dl>
      <div className="session-complete__actions">
        <a className="btn btn--primary" href="/map">See confirmed sightings on the map</a>
        <button type="button" className="btn" onClick={onRestart}>Review more frames</button>
      </div>
    </section>
  );
}
