import { useState } from 'react';
import AnswerIcon from '../../components/AnswerIcon.jsx';

// The three answers, as large tiles: Confirm across the top (2:1), Deny and Uncertain as squares below.
// Deny opens a picker of look-alikes; choosing one submits.
function TileIcon({ kind }) {
  return (
    <span className="answer__icon" aria-hidden="true">
      <AnswerIcon kind={kind} />
    </span>
  );
}

export default function AnswerPanel({ clip, onAnswer }) {
  const [picking, setPicking] = useState(false);

  return (
    <div className="answers" role="group" aria-label="Your answer">
      <button type="button" className="answer answer--confirm" onClick={() => onAnswer({ kind: 'yes' })}>
        <TileIcon kind="yes" />
        Confirm
      </button>
      <button type="button" className="answer" aria-expanded={picking} onClick={() => setPicking((p) => !p)}>
        <TileIcon kind="no" />
        Deny
      </button>
      <button type="button" className="answer answer--unsure" onClick={() => onAnswer({ kind: 'unsure' })}>
        <TileIcon kind="unsure" />
        Uncertain
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
    </div>
  );
}
