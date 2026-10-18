import { useState } from 'react';

// The three answers. "No" opens a picker; choosing an item submits.
export default function AnswerPanel({ clip, onAnswer }) {
  const [picking, setPicking] = useState(false);
  const name = clip.species.name;

  return (
    <div className="answers">
      <button type="button" className="answer" onClick={() => onAnswer({ kind: 'yes' })}>
        <strong>Yes, it's a {name.toLowerCase()}</strong>
      </button>

      <button type="button" className="answer" aria-expanded={picking} onClick={() => setPicking((p) => !p)}>
        <strong>No, it's something else</strong>
      </button>
      {picking && (
        <fieldset className="lookalikes">
          <legend>What do you think it is?</legend>
          {clip.lookAlikes.map((l) => (
            <button key={l.name} type="button" className="chip" onClick={() => onAnswer({ kind: 'no', alt: l.name })}>
              {l.name}
            </button>
          ))}
          <button type="button" className="chip" onClick={() => onAnswer({ kind: 'no', alt: null })}>
            Not sure what it is
          </button>
        </fieldset>
      )}

      <button type="button" className="answer" onClick={() => onAnswer({ kind: 'unsure' })}>
        <strong>Can't tell from this clip</strong>
        <span>Too blurry, too dark, or the key features are hidden. An honest "can't tell" earns full points.</span>
      </button>
    </div>
  );
}
