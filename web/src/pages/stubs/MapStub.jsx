import { useCollection } from '../../lib/useCollection.js';

// Placeholder for the Interactive Map. Shows the consensus-confirmed detections it will receive.
export default function MapStub() {
  const { player } = useCollection();
  return (
    <main className="stub">
      <h1>Interactive Map</h1>
      <p>Being built separately. Sightings you've helped confirm in Digital Fishers:</p>
      {player.confirmations.length === 0 ? (
        <p className="muted">None yet.</p>
      ) : (
        <ul>
          {player.confirmations.map((d) => (
            <li key={d.id} className="mono small">
              {d.speciesId} · {d.cameraId} · {d.timestamp} · {d.status} ({d.confirmedBy})
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
