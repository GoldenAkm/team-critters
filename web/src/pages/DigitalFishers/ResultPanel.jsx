import ReviewDots from '../../components/ReviewDots.jsx';
import { REVIEWS_NEEDED } from './config.js';

const ANSWER_TEXT = {
  yes: (name) => `Yes, it's a ${name.toLowerCase()}`,
  no: (_, alt) => (alt ? `No, it's something else (${alt})` : 'No, not sure what it is'),
  unsure: () => "Can't tell from this frame",
};

// Placeholder until the team decides whether reviewers get any reward (points were removed).
function RewardPlaceholder() {
  return <span className="reward-placeholder mono">Reward: TBD</span>;
}

export default function ResultPanel({ clip, result, isLast, onNext }) {
  const { answer, consensus, outcome } = result;
  const name = clip.species.name;

  return (
    <section className="result" aria-live="polite">
      <div className="result__head">
        <RewardPlaceholder />
        <span>Your answer: {ANSWER_TEXT[answer.kind](name, answer.alt)}</span>
      </div>

      <ReviewDots needed={REVIEWS_NEEDED} priorVotes={clip.priorVotes} you={answer.kind} revealed={Boolean(consensus)} />

      {outcome.type === 'waiting' && (
        <p>
          <strong>Waiting for agreement.</strong> Other reviewers' answers stay hidden until {REVIEWS_NEEDED} people
          have looked.
        </p>
      )}

      {consensus && consensus.winner === 'yes' && (
        <p>
          <strong>
            Agreement reached · {consensus.count} of {consensus.of} said {name.toLowerCase()}.
          </strong>{' '}
          It now counts as a confirmed sighting on the map.
          {outcome.type === 'confirmed_match' && ' You matched the majority.'}
          {outcome.type === 'confirmed_other' &&
            (answer.kind === 'unsure'
              ? ` Most reviewers could make out a ${name.toLowerCase()}. No harm in an honest "can't tell".`
              : ` Spin the 3D model to compare the key features.`)}
        </p>
      )}
      {consensus && consensus.winner === 'no' && (
        <p>
          <strong>
            Agreement reached · {consensus.count} of {consensus.of} said it isn't a {name.toLowerCase()}.
          </strong>{' '}
          The AI's guess is corrected and nothing is counted.
          {outcome.matched && ' You matched the majority.'}
        </p>
      )}
      {consensus && (consensus.winner === 'unsure' || consensus.winner === null) && (
        <p>
          <strong>No clear agreement.</strong> This frame stays uncounted so a bad guess never reaches the data.
        </p>
      )}

      <button type="button" className="btn btn--primary" onClick={onNext}>
        {isLast ? 'Finish session' : 'Next frame'}
      </button>
    </section>
  );
}
