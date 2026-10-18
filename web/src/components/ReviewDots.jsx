import AnswerIcon from './AnswerIcon.jsx';

const WORD = { yes: 'confirm', no: 'deny', unsure: 'uncertain' };

// prior: answers already in (hidden until the clip is complete); you: your answer kind or null.
// A shown answer is a dot in its tile's colour with the tile's icon; your own answer always shows.
export default function ReviewDots({ needed, priorVotes, you, revealed }) {
  const prior = Object.entries(priorVotes).flatMap(([kind, n]) => Array(n).fill(kind));
  const dots = [
    ...prior.map((kind) => ({ kind, who: 'Reviewer' })),
    ...(you ? [{ kind: you, who: 'You' }] : []),
  ];
  while (dots.length < needed) dots.push({ kind: null, who: 'Waiting' });

  const shown = (d) => Boolean(d.kind) && (revealed || d.who === 'You');
  const filled = dots.filter((d) => d.kind).length;
  const counts = {};
  dots.forEach((d) => d.kind && (counts[d.kind] = (counts[d.kind] ?? 0) + 1));
  const summary = Object.entries(counts).map(([kind, n]) => `${n} ${WORD[kind]}`).join(', ');

  return (
    <div className="review-dots" role="img" aria-label={`${filled} of ${needed} reviews in${revealed ? `: ${summary}` : ''}`}>
      {dots.map((d, i) => (
        <span
          key={i}
          className={`review-dot ${d.kind ? 'is-filled' : 'is-empty'} ${shown(d) ? `review-dot--${d.kind}` : ''} ${d.who === 'You' ? 'is-you' : ''}`}
          style={{ '--i': i }}
        >
          <span className="review-dot__circle">{shown(d) && <AnswerIcon kind={d.kind} size={16} />}</span>
          <span className="review-dot__label">{d.who === 'You' ? 'YOU' : ''}</span>
        </span>
      ))}
    </div>
  );
}
