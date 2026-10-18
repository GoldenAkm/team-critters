import { useEffect, useMemo, useState } from 'react';
import { loadReviewData } from '../../lib/data.js';
import { addVote, outcomeFor, resolveConsensus } from './consensus.js';
import { toConfirmedDetection } from '../../lib/detections.js';
import { useCollection } from '../../lib/useCollection.js';
import { MATCH_BONUS, POINTS_PER_ANSWER, SHOW_AI_GUESS } from './config.js';
import AppHeader from '../../components/AppHeader.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import ClipPlayer from './ClipPlayer.jsx';
import AnswerPanel from './AnswerPanel.jsx';
import IdGuide from './IdGuide.jsx';
import ResultPanel from './ResultPanel.jsx';
import CollectedModal from './CollectedModal.jsx';
import SessionComplete from './SessionComplete.jsx';
import HowItWorks from './HowItWorks.jsx';
import ProgressPanel from './ProgressPanel.jsx';
import './base.css';
import './DigitalFishersPage.css';

const EMPTY_SESSION = { points: 0, reviewed: 0, newSpecies: 0 };

function formatTime(iso) {
  return new Date(iso).toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
}

export default function ReviewPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState(null);
  const [checked, setChecked] = useState([]);
  const [modal, setModal] = useState(null);
  const [session, setSession] = useState(EMPTY_SESSION);
  const [done, setDone] = useState(false);
  const collection = useCollection();
  const { player } = collection;

  useEffect(() => {
    loadReviewData().then(setData, setError);
  }, []);

  const clip = data?.clips[index];
  const isLast = data && index === data.clips.length - 1;
  const mission = useMemo(() => {
    if (!data) return null;
    const id = clip?.mission ?? data.clips.find((c) => c.mission)?.mission;
    return id ? data.missions[id] : null;
  }, [data, clip]);

  if (error) return <Shell><p className="page-error">Couldn't load review clips: {error.message}</p></Shell>;
  if (!data) return <Shell><p className="page-loading">Loading clips…</p></Shell>;

  function submit(answer) {
    const votes = addVote(clip.priorVotes, answer.kind);
    const consensus = resolveConsensus(votes);
    const outcome = outcomeFor(answer.kind, consensus);
    const bonus = outcome.matched ? MATCH_BONUS : 0;
    const points = POINTS_PER_ANSWER;
    const speciesId = clip.species.id;
    const wasNew = !player.collected[speciesId];

    collection.addPoints(points + bonus);
    collection.markReviewed(clip.mission, outcome.matched);
    if (outcome.type === 'waiting' && answer.kind === 'yes') collection.markPending(speciesId, clip.id);
    if (consensus?.winner === 'yes') collection.addConfirmation(toConfirmedDetection(clip.detection));
    if (outcome.type === 'confirmed_match') {
      collection.collect(speciesId, clip.camera.id, clip.detection.timestamp.slice(0, 10));
      if (wasNew) setModal({ species: clip.species, camera: clip.camera });
    }

    setSession((s) => ({
      points: s.points + points + bonus,
      reviewed: s.reviewed + 1,
      newSpecies: s.newSpecies + (outcome.type === 'confirmed_match' && wasNew ? 1 : 0),
    }));
    setResult({ answer, consensus, outcome, points, bonus, wasNew });
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

  const collectedCount = data.species.filter((s) => player.collected[s.id]).length;

  return (
    <Shell>
      <div className="page-head">
        <a className="collection-shortcut" href="#collection">
          Marine collection <span className="mono">{collectedCount}/{data.species.length}</span>
        </a>
      </div>

      <header className="review-intro">
        <h1>Digital Fishers 2.0</h1>
        <p>Help the AI with the clips it wasn't sure about. Your answers decide what counts as a confirmed sighting.</p>
        <span className="chip chip--static mono">{data.clips.length} clips waiting</span>
      </header>

      <HowItWorks />

      <div className="review-layout">
        <section className="review-main" aria-label="Review task">
          {done ? (
            <SessionComplete stats={session} onRestart={restart} />
          ) : (
            <>
              <div className="clip-bar mono">
                <span>
                  CLIP {index + 1} OF {data.clips.length} · {clip.camera.name} · {clip.camera.area} ·{' '}
                  {formatTime(clip.detection.timestamp)}
                </span>
                {!result && (
                  <button type="button" className="btn btn--small" onClick={next}>
                    Skip clip
                  </button>
                )}
              </div>

              <div className="review-task">
                <div className="review-task__main">
                  <ClipPlayer key={`player-${clip.id}`} detection={clip.detection} speciesName={clip.species.name} />

                  {SHOW_AI_GUESS && (
                    <div className="ai-guess">
                      <span className="muted">AI's guess</span>
                      <strong>{clip.species.name}</strong>
                      <em className="sci">{clip.species.sci}</em>
                      <StatusBadge status={clip.detection.status} shape={clip.species.shape} />
                      <span className="mono small">confidence {Math.round(clip.detection.confidence * 100)}%</span>
                    </div>
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

        <ProgressPanel
          player={player}
          session={session}
          species={data.species}
          comingSoonSlots={data.comingSoonSlots}
          mission={mission}
        />
      </div>

      <p className="small muted demo-note">
        Data: Ocean Networks Canada. Prototype: species, clips, votes and scores shown are illustrative sample data.{' '}
        <button type="button" className="link-button" onClick={collection.reset}>
          Reset demo progress
        </button>
      </p>

      {modal && <CollectedModal species={modal.species} camera={modal.camera} onClose={() => setModal(null)} />}
    </Shell>
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
      <main id="main" className="review-page">
        {children}
      </main>
    </>
  );
}
