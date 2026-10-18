import { useEffect, useState } from 'react';
import { loadReviewData } from '../../lib/data.js';
import { addVote, outcomeFor, resolveConsensus } from './consensus.js';
import { toConfirmedDetection } from '../../lib/detections.js';
import { useCollection } from '../../lib/useCollection.js';
import { aiAnnouncement, appStatus, reviewQuestion, withArticle } from '../../lib/modelReadout.js';
import { statusKey } from '../../lib/status.js';
import { SHOW_AI_GUESS } from './config.js';
import AppHeader from '../../components/AppHeader.jsx';
import AiFrame from './AiFrame.jsx';
import AiReadout from './AiReadout.jsx';
import AnswerPanel from './AnswerPanel.jsx';
import IdGuide from './IdGuide.jsx';
import ResultPanel from './ResultPanel.jsx';
import SessionComplete from './SessionComplete.jsx';
import './base.css';
import './DigitalFishersPage.css';

const EMPTY_SESSION = { reviewed: 0 };

function formatTime(iso) {
  return new Date(iso).toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
}

export default function ReviewPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState(null);
  const [checked, setChecked] = useState([]);
  // Results of live model runs on this page, by clip id: { model, box }.
  const [live, setLive] = useState({});
  const [session, setSession] = useState(EMPTY_SESSION);
  const [done, setDone] = useState(false);
  const collection = useCollection();

  useEffect(() => {
    loadReviewData().then(setData, setError);
  }, []);

  const clip = data?.clips[index] && withLiveResult(data.clips[index], live[data.clips[index].id]);
  const isLast = data && index === data.clips.length - 1;

  if (error) return <Shell><p className="page-error">Couldn't load review clips: {error.message}</p></Shell>;
  if (!data) return <Shell><p className="page-loading">Loading clips…</p></Shell>;

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
    setChecked([]);
    if (isLast) setDone(true);
    else setIndex((i) => i + 1);
  }

  function restart() {
    setIndex(0);
    setResult(null);
    setChecked([]);
    setSession(EMPTY_SESSION);
    setDone(false);
  }

  return (
    <Shell>
      <section className="df-hero" aria-labelledby="df-title">
        <div className="df-hero__inner">
          <h1 id="df-title">Digital Fishers 2.0</h1>
          <p>The AI checks ONC footage for rockfish. Where it isn't sure, your answer decides what counts as a sighting.</p>
        </div>
      </section>

      <div className="df-body">
        <section className="review-main" aria-label="Review task">
          {done ? (
            <SessionComplete stats={session} onRestart={restart} />
          ) : (
            <>
              <div className="clip-bar">
                <div className="clip-bar__info">
                  {(SHOW_AI_GUESS || result) && <AiSubheader detection={clip.detection} species={clip.species} />}
                  <p className="clip-bar__meta">
                    Frame {index + 1} of {data.clips.length} · {clip.camera.name} · {clip.camera.area} ·{' '}
                    <span className="clip-bar__when">{formatTime(clip.detection.timestamp)}</span>
                  </p>
                </div>
                {!result && (
                  <button type="button" className="btn" onClick={next}>
                    Skip frame
                  </button>
                )}
              </div>

              <div className="review-task">
                <div className="review-task__main">
                  <AiFrame key={`frame-${clip.id}`} detection={clip.detection} speciesName={clip.species.name} />

                  {(SHOW_AI_GUESS || result) && (
                    <AiReadout
                      key={`readout-${clip.id}`}
                      detection={clip.detection}
                      species={clip.species}
                      onModel={(model, box) => setLive((l) => ({ ...l, [clip.id]: { model, box } }))}
                    />
                  )}

                  <h2 className="question">{clip.question}</h2>

                  {result ? (
                    <ResultPanel clip={clip} result={result} isLast={isLast} onNext={next} />
                  ) : (
                    <AnswerPanel key={`answers-${clip.id}`} clip={clip} onAnswer={submit} />
                  )}
                </div>

                <IdGuide
                  clip={clip}
                  checked={checked}
                  locked={Boolean(result)}
                  highlight={result?.outcome.type === 'confirmed_other'}
                  onToggle={(f) => setChecked((c) => (c.includes(f) ? c.filter((x) => x !== f) : [...c, f]))}
                />
              </div>
            </>
          )}
        </section>

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

// The AI announces its answer and how confident it is, above the frame.
function AiSubheader({ detection, species }) {
  const { name, confidence } = aiAnnouncement(detection, species);
  return (
    <h2 className="clip-bar__ai" aria-live="polite">
      {name ? (
        <>
          The model detected <strong>{withArticle(name)}</strong>
          {confidence && <> with <strong className="clip-bar__ai-conf">{confidence}</strong> confidence</>}
        </>
      ) : (
        'The model detected no fish in this frame'
      )}
    </h2>
  );
}

// A live model run replaces the stored result: new box, status and question.
function withLiveResult(clip, run) {
  if (!run) return clip;
  return {
    ...clip,
    detection: { ...clip.detection, model: run.model, box: run.box, status: statusKey(appStatus(run.model.status)) },
    question: reviewQuestion(clip.species.name, Boolean(run.box)),
  };
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
        {children}
      </main>
    </>
  );
}
