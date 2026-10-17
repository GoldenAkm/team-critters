import ReviewDots from '../../components/ReviewDots.jsx';
import { REVIEWS_NEEDED } from '../../config.js';

const ANSWER_TEXT = {
  yes: (name) => `Yes, it's a ${name.toLowerCase()}`,
  no: (_, alt) => (alt ? `No, it's something else (${alt})` : 'No, not sure what it is'),
  unsure: () => "Can't tell from this clip",
};

export default function ResultPanel({ clip, result, isLast, onNext }) {
  const { answer, consensus, outcome, points, bonus, wasNew } = result;
  const name = clip.species.name;

  return (
    <section className="result" aria-live="polite">
      <div className="result__head">
        <span className="points mono">+{points} pts</span>
        {bonus > 0 && <span className="points points--bonus mono">+{bonus} bonus</span>}
        <span>Your answer: {ANSWER_TEXT[answer.kind](name, answer.alt)}</span>
      </div>

      <ReviewDots needed={REVIEWS_NEEDED} priorVotes={clip.priorVotes} you={answer.kind} revealed={Boolean(consensus)} />

      {outcome.type === 'waiting' && (
        <p>
          <strong>Waiting for agreement.</strong> Other reviewers' answers stay hidden until {REVIEWS_NEEDED} people
          have looked.
          {answer.kind === 'yes' && ' This species is marked as pending in your collection.'}
        </p>
      )}

      {consensus && consensus.winner === 'yes' && (
        <p>
          <strong>
            Agreement reached · {consensus.count} of {consensus.of} said {name.toLowerCase()}.
          </strong>{' '}
          {outcome.type === 'confirmed_match' &&
            (wasNew ? 'New species added to your collection.' : 'Logged as another confirmed sighting on your card.')}
          {outcome.type === 'confirmed_other' &&
            (answer.kind === 'unsure'
              ? `Most reviewers could make out a ${name.toLowerCase()}. No harm in an honest "can't tell".`
              : `Most reviewers identified a ${name.toLowerCase()}, so it wasn't added this time. Spin the 3D model to compare the key features.`)}
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
          <strong>No clear agreement.</strong> This clip stays uncounted so a bad guess never reaches the data.
        </p>
      )}

      <button type="button" className="btn btn--primary" onClick={onNext}>
        {isLast ? 'Finish session' : 'Next clip'}
      </button>
    </section>
  );
}
