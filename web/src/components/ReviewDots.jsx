const SHORT = { yes: 'Yes', no: 'No', unsure: '?' };

// prior: answers already in (hidden until the clip is complete); you: your answer kind or null.
export default function ReviewDots({ needed, priorVotes, you, revealed }) {
  const prior = Object.entries(priorVotes).flatMap(([kind, n]) => Array(n).fill(kind));
  const dots = [
    ...prior.map((kind) => ({ kind, who: 'Reviewer' })),
    ...(you ? [{ kind: you, who: 'You' }] : []),
  ];
  while (dots.length < needed) dots.push({ kind: null, who: 'Waiting' });

  const filled = dots.filter((d) => d.kind).length;
  return (
    <div className="review-dots" role="img" aria-label={`${filled} of ${needed} reviews in`}>
      {dots.map((d, i) => (
        <span key={i} className={`review-dot ${d.kind ? 'is-filled' : 'is-empty'} ${d.who === 'You' ? 'is-you' : ''}`}>
          <span className="review-dot__circle">{revealed && d.kind ? SHORT[d.kind] : ''}</span>
          <span className="review-dot__label">{d.who === 'You' ? 'YOU' : ''}</span>
        </span>
      ))}
    </div>
  );
}
