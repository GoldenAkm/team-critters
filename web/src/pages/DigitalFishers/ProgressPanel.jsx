import SpeciesSymbol from '../../components/SpeciesSymbol.jsx';

// Placeholder leaderboard until there is shared state across players.
const LEADERS = [
  ['Reviewer A', 42],
  ['Reviewer B', 37],
  ['Reviewer C', 29],
];

export default function ProgressPanel({ player, session, species, comingSoonSlots, mission }) {
  const collectedCount = species.filter((s) => player.collected[s.id]).length;
  const missionDone = mission ? player.missions[mission.id] ?? 0 : 0;

  return (
    <aside className="progress" aria-label="Your progress">
      <section className="panel">
        <h3>This session</h3>
        <dl className="stats stats--compact">
          <div><dt>Points</dt><dd className="mono">{session.points}</dd></div>
          <div><dt>Reviewed</dt><dd className="mono">{session.reviewed}</dd></div>
          <div><dt>Day streak</dt><dd className="mono">1</dd></div>
        </dl>
      </section>

      <section className="panel" id="collection">
        <div className="panel__head">
          <h3>Your collection</h3>
          <span className="mono">{collectedCount} of {species.length}</span>
        </div>
        <ul className="collection-grid">
          {species.map((s) => {
            const collected = player.collected[s.id];
            const pending = !collected && player.pending[s.id];
            return (
              <li key={s.id} className={`slot ${collected ? 'is-collected' : pending ? 'is-pending' : 'is-locked'}`}>
                <SpeciesSymbol shape={s.shape} variant={collected ? 'identified' : 'locked'} size={22} />
                <span>{collected ? s.name : pending ? s.name : '???'}</span>
                {pending && <span className="slot__note">Waiting for agreement</span>}
              </li>
            );
          })}
          {Array.from({ length: comingSoonSlots }, (_, i) => (
            <li key={`soon-${i}`} className="slot is-soon">
              <span>Coming soon</span>
            </li>
          ))}
        </ul>
      </section>

      {mission && (
        <section className="panel">
          <h3>Active mission</h3>
          <p><strong>{mission.title}</strong> · {mission.description}</p>
          <progress max={mission.goal} value={Math.min(missionDone, mission.goal)} aria-label={`${missionDone} of ${mission.goal} clips`} />
          <span className="mono small">{missionDone} / {mission.goal} clips</span>
        </section>
      )}

      <section className="panel">
        <h3>Top reviewers this week</h3>
        <ol className="leaderboard">
          {LEADERS.map(([name, score]) => (
            <li key={name}><span>{name}</span><span className="mono">{score}</span></li>
          ))}
          <li className="is-you"><span>You</span><span className="mono">{player.matched}</span></li>
        </ol>
        <p className="small muted">Ranked by reviews that matched the final agreement, not by speed. Sample entries.</p>
      </section>

      <p className="small muted">
        Builds on ONC's original Digital Fishers, where volunteers annotate whole clips from scratch. Version 2.0 sends
        people only the cases the AI couldn't settle.
      </p>
    </aside>
  );
}
