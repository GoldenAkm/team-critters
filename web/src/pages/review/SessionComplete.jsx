import { Link } from 'react-router-dom';

export default function SessionComplete({ stats, onRestart }) {
  return (
    <section className="session-complete" aria-labelledby="session-title">
      <div className="session-complete__tick" aria-hidden="true">✓</div>
      <h2 id="session-title">Session complete</h2>
      <dl className="stats">
        <div><dt>Clips reviewed</dt><dd className="mono">{stats.reviewed}</dd></div>
        <div><dt>New species collected</dt><dd className="mono">{stats.newSpecies}</dd></div>
        <div><dt>Points</dt><dd className="mono">{stats.points}</dd></div>
      </dl>
      <div className="session-complete__actions">
        <Link className="btn btn--primary" to="/collection">Open my Marine collection</Link>
        <button type="button" className="btn" onClick={onRestart}>Review more clips</button>
        <Link className="btn" to="/map">See confirmed sightings on the map</Link>
      </div>
    </section>
  );
}
