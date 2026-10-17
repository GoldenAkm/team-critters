import { Link, useParams } from 'react-router-dom';
import { useCollection } from '../../lib/useCollection.js';

// Placeholder for the Marine collection. Reads the same player store Digital Fishers writes.
export default function CollectionStub() {
  const { speciesId } = useParams();
  const { player } = useCollection();
  const entries = Object.entries(player.collected);
  return (
    <main className="stub">
      <h1>Marine collection</h1>
      <p>Full collection and species profiles are being built separately.</p>
      {speciesId && <p>Requested profile: <span className="mono">{speciesId}</span></p>}
      {entries.length === 0 ? (
        <p className="muted">Nothing collected yet.</p>
      ) : (
        <ul>
          {entries.map(([id, e]) => (
            <li key={id} className="mono small">
              {id} · first at {e.firstAt} on {e.date} · {e.sightings} sighting{e.sightings === 1 ? '' : 's'}
            </li>
          ))}
        </ul>
      )}
      <Link className="btn" to="/review">Review more clips</Link>
    </main>
  );
}
