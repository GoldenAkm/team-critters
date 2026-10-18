import { useEffect, useRef, useState } from 'react';
import StatusBadge from '../../components/StatusBadge.jsx';
import { appStatus, describeModelResult } from '../../lib/modelReadout.js';
import { describeModelError, predictRockfish } from '../../lib/rockfishModel.js';
import { statusKey } from '../../lib/status.js';

// What the AI returned for this frame, in words: status, score against the two cutoffs, the boxed crop
// and the raw facts. With no stored result, the frame can be sent to the model live.
export default function AiReadout({ detection, species, onModel }) {
  const { model, box, frameUrl } = detection;
  const [run, setRun] = useState({ phase: 'idle' });

  async function runModel() {
    setRun({ phase: 'running' });
    try {
      const out = await predictRockfish(frameUrl);
      setRun({ phase: 'idle' });
      onModel(out.result, out.box);
    } catch (e) {
      setRun({ phase: 'error', message: describeModelError(e) });
    }
  }

  if (!model) {
    return (
      <section className="ai-readout" aria-label="What the AI returned">
        <div className="ai-readout__guess">
          <span className="ai-readout__label">The AI thinks it's</span>
          <strong>
            {species.name} <em className="sci">{species.sci}</em>
          </strong>
          <StatusBadge status={detection.status} shape={species.shape} />
        </div>
        <p className="ai-readout__headline">Sample detection, no model output stored</p>
        {frameUrl ? (
          <>
            <button type="button" className="btn btn--primary" onClick={runModel} disabled={run.phase === 'running'}>
              {run.phase === 'running' ? 'Checking this frame…' : 'Run the AI on this frame'}
            </button>
            {run.phase === 'running' && <p className="hint">The first check can take a few minutes while the model wakes up.</p>}
            {run.phase === 'error' && <p className="ai-readout__error" role="alert">{run.message}</p>}
          </>
        ) : (
          <p className="hint">Illustrative clip: confidence {Math.round(detection.confidence * 100)}%. Real frames show the model's full readout here.</p>
        )}
      </section>
    );
  }

  const r = describeModelResult(model, box);
  const { needs_review: reviewLine, identified: idLine } = model.thresholds;

  return (
    <section className="ai-readout" aria-label="What the AI returned" aria-live="polite">
      <div className="ai-readout__guess">
        <span className="ai-readout__label">The AI thinks it's</span>
        <strong>{r.guess}</strong>
        <StatusBadge status={statusKey(appStatus(model.status))} shape={species.shape} />
      </div>
      <p className="ai-readout__headline">{r.headline}</p>

      <div className="ai-readout__body">
        {box && frameUrl && <BoxCrop src={frameUrl} box={box} />}
        <div className="ai-readout__text">
          <p>{r.sentence}</p>
          {model.score != null && <ScoreBar score={model.score} reviewLine={reviewLine} idLine={idLine} />}
        </div>
      </div>

      <details className="ai-readout__facts">
        <summary>Everything the model returned</summary>
        <dl>
          {r.facts.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd className="mono">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="hint">The score is not a probability. Species guesses are not validated: the AI reports genus <em>Sebastes</em>.</p>
      </details>
    </section>
  );
}

// Score on a 0-1 track with the review and Identified cutoffs marked.
function ScoreBar({ score, reviewLine, idLine }) {
  const at = (v) => `${Math.min(Math.max(v, 0), 1) * 100}%`;
  return (
    <div
      className="score-bar"
      role="img"
      aria-label={`Rockfish score ${score.toFixed(2)}. Review line ${reviewLine.toFixed(2)}, Identified line ${idLine.toFixed(2)}.`}
    >
      <div className="score-bar__track">
        <span className="score-bar__zone" style={{ left: at(reviewLine), width: `calc(${at(idLine)} - ${at(reviewLine)})` }} />
        <span className="score-bar__line" style={{ left: at(reviewLine) }} />
        <span className="score-bar__line" style={{ left: at(idLine) }} />
        <span className="score-bar__dot" style={{ left: at(score) }} />
      </div>
      <div className="score-bar__labels mono" aria-hidden="true">
        <span style={{ left: at(reviewLine) }}>review {reviewLine.toFixed(2)}</span>
        <span style={{ left: at(idLine) }}>Identified {idLine.toFixed(2)}</span>
      </div>
    </div>
  );
}

// The boxed part of the frame, enlarged, so people can look at what the AI looked at.
function BoxCrop({ src, box }) {
  const canvas = useRef(null);
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const c = canvas.current;
      if (!c) return;
      const sw = box.w * img.naturalWidth;
      const sh = box.h * img.naturalHeight;
      c.width = 320;
      c.height = Math.round((320 * sh) / sw) || 1;
      c.getContext('2d').drawImage(img, box.x * img.naturalWidth, box.y * img.naturalHeight, sw, sh, 0, 0, c.width, c.height);
    };
    img.src = src;
  }, [src, box]);
  return (
    <figure className="box-crop">
      <canvas ref={canvas} role="img" aria-label="Enlarged view of the area inside the AI's box" />
      <figcaption>Inside the box</figcaption>
    </figure>
  );
}
