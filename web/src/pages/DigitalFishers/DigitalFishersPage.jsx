import { useEffect, useRef, useState } from 'react';
import { loadReviewData } from '../../lib/data.js';
import { addVote, outcomeFor, resolveConsensus } from './consensus.js';
import { toConfirmedDetection } from '../../lib/detections.js';
import { useCollection } from '../../lib/useCollection.js';
import { aiAnnouncement, article } from '../../lib/modelReadout.js';
import { SHOW_AI_GUESS } from './config.js';
import AppHeader from '../../components/AppHeader.jsx';
import AiFrame from './AiFrame.jsx';
import AnswerPanel from './AnswerPanel.jsx';
import IdGuide from './IdGuide.jsx';
import ResultPanel from './ResultPanel.jsx';
import SessionComplete from './SessionComplete.jsx';
import WaterBackground from './WaterBackground.jsx';
import './base.css';
import './DigitalFishersPage.css';

const EMPTY_SESSION = { reviewed: 0 };
const MENU_MS = 320; // the Key features menu's open/close transition (DigitalFishersPage.css), plus a little

function formatTime(iso) {
  return new Date(iso).toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
}

export default function ReviewPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState(null);
  const [session, setSession] = useState(EMPTY_SESSION);
  const [done, setDone] = useState(false);
  // While the Key features menu is open it pushes the decision card down. The card normally stretches to end level
  // with the frame, so it would give up the space instead: hold its height until the menu has folded away again.
  const decision = useRef(null);
  const release = useRef(0);
  const [heldHeight, setHeldHeight] = useState(null);
  function holdDecision(open) {
    clearTimeout(release.current);
    if (open) setHeldHeight(decision.current?.getBoundingClientRect().height ?? null);
    else release.current = setTimeout(() => setHeldHeight(null), MENU_MS);
  }
  useEffect(() => () => clearTimeout(release.current), []);
  const collection = useCollection();

  useEffect(() => {
    loadReviewData().then(setData, setError);
  }, []);

  const clip = data?.clips[index];
  const isLast = data && index === data.clips.length - 1;

  if (error) return <Shell><p className="page-error">Couldn't load review clips: {error.message}</p></Shell>;
  if (!data) return <Shell><p className="page-loading">Loading clips…</p></Shell>;

  // Open decision (config.js): reviewers may only see the AI's answer once they have given theirs.
  const showAi = SHOW_AI_GUESS || Boolean(result);

  function submit(answer) {
    const votes = addVote(clip.priorVotes, answer.kind);
    const consensus = resolveConsensus(votes);
    const outcome = outcomeFor(answer.kind, consensus);

    collection.markReviewed(null, outcome.matched);
    if (consensus?.winner === 'yes') collection.addConfirmation(toConfirmedDetection(clip.detection));

    setSession((s) => ({ reviewed: s.reviewed + 1 }));
    setResult({ answer, consensus, outcome });
  }

  function next() {
    setResult(null);
    if (isLast) setDone(true);
    else setIndex((i) => i + 1);
  }

  function restart() {
    setIndex(0);
    setResult(null);
    setSession(EMPTY_SESSION);
    setDone(false);
  }

  return (
    <Shell>
      {/* Two columns: banner text and frame on the left; the 3D panel hanging from the top and the decision card
          on the right, ending level with the frame. The task (frame, decision) is solid white; the 3D panel is glass,
          a reference beside it. */}
      <div className="df-layout">
        <div className={`df-main ${done ? 'is-done' : ''}`}>
          <section className="df-hero__text" aria-labelledby="df-title">
            <h1 id="df-title">Digital Fishers 2.0</h1>
            <p>The AI checks ONC footage for rockfish. Where it isn't sure, your answer decides what counts as a sighting.</p>
          </section>

          <section className={`review-main glass ${done ? 'is-done' : ''}`} aria-label="Review task">
            {done ? (
              <SessionComplete stats={session} onRestart={restart} />
            ) : (
              <div className="review-task">
                {/* The frame and the model's answer read as one: the answer is a band on the frame's bottom edge. */}
                <AiFrame
                  key={`frame-${clip.id}`}
                  detection={clip.detection}
                  speciesName={clip.species.name}
                  meta={`${clip.camera.name} · ${clip.camera.area} · ${formatTime(clip.detection.timestamp)}`}
                >
                  {showAi && <AiConfidence detection={clip.detection} species={clip.species} />}
                </AiFrame>
              </div>
            )}
          </section>
        </div>

        {!done && (
          <div className="df-side">
            <IdGuide clip={clip} highlight={result?.outcome.type === 'confirmed_other'} onMenuChange={holdDecision} />

            <section
              ref={decision}
              className="decision glass"
              style={heldHeight ? { minHeight: heldHeight } : undefined}
              aria-labelledby="df-question"
            >
              <h2 id="df-question" className="question">{clip.question}</h2>
              {result ? (
                <ResultPanel clip={clip} result={result} isLast={isLast} onNext={next} />
              ) : (
                <AnswerPanel key={`answers-${clip.id}`} clip={clip} onAnswer={submit} />
              )}
            </section>
          </div>
        )}

        <p className="demo-note">
          Data: Ocean Networks Canada. Prototype: frames marked as samples, and every vote and score, are illustrative.{' '}
          <button type="button" className="link-button" onClick={collection.reset}>
            Reset demo progress
          </button>
        </p>
      </div>
    </Shell>
  );
}

// The AI announces its answer and how confident it is, under the frame.
function AiConfidence({ detection, species }) {
  const { name, confidence } = aiAnnouncement(detection, species);
  return (
    <p className="ai-confidence" aria-live="polite">
      {name ? (
        <>
          The model detected {article(name)} <strong className="ai-confidence__name">{name}</strong>
          {confidence && <> with <strong className="ai-confidence__value">{confidence}</strong> confidence</>}
        </>
      ) : (
        'The model detected no fish in this frame'
      )}
    </p>
  );
}

// Site header shared with the Interactive Map (mount() adds the .critters-app theme wrapper).
function Shell({ children }) {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <AppHeader active="digital-fishers" />
      <main id="main" className="df-page">
        <WaterBackground />
        {children}
      </main>
    </>
  );
}
