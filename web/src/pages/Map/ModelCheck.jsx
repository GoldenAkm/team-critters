// "Check with the AI model": runs the team's rockfish model on this sighting's ONC frame, live,
// and lets any result the model couldn't settle (Needs review or Uncertain) be sent to Digital Fishers 2.0.
import { useState } from 'react'
import { describeModelError, predictRockfish } from '../../lib/rockfishModel.js'
import { addToReviewQueue, isQueued } from '../../lib/reviewQueue.js'
import { appStatus } from '../../lib/modelReadout.js'

// Map camera sites -> Digital Fishers camera ids (public/data/cameras.json)
const DF_CAMERA = { discovery_passage: 'campbell_river', douglas_channel: 'hartley_bay', china_creek: 'china_creek' }
const TIP = 'Rockfish have a spiny dorsal fin along most of the back and a large head with big eyes. ' +
  'Lingcod and greenlings are longer and slimmer. If the fish is too small or blurry to tell, choose "Can\'t tell".'

const STATUS_CLASS = { Identified: 'identified', 'Needs review': 'needs_review', 'Not rockfish': 'none', 'No detection': 'none' }
const STATUS_TEXT = {
  Identified: 'Rockfish, confident at genus level.',
  'Needs review': 'Possibly a rockfish. A person should check it.',
  'Not rockfish': "Something was detected, but it doesn't look like a rockfish.",
  'No detection': 'The detector found no fish, so the frame was not classified. A rockfish may still be there.',
}

export default function ModelCheck({ detection, onBox }) {
  const [state, setState] = useState({ phase: 'idle' })
  const queueId = `map-${detection.id}`
  const [sent, setSent] = useState(() => isQueued(queueId))

  async function run() {
    setState({ phase: 'running' })
    try {
      const out = await predictRockfish(detection.frameUrl)
      setState({ phase: 'done', ...out })
      onBox(out.box)
    } catch (e) {
      setState({ phase: 'error', message: describeModelError(e) })
    }
  }

  function sendToReview() {
    const { result, box } = state
    const det = {
      id: queueId, species: 'rockfish', camera: DF_CAMERA[detection.cameraId], timestamp: detection.timestamp,
      status: appStatus(result.status), confidence: result.score, box, clipUrl: null, frameUrl: detection.frameUrl,
      source: 'model', modelVersion: result.model_version, model: result,
    }
    const clip = {
      id: `map-c-${detection.id}`, detectionId: det.id, lookAlikes: ['lingcod', 'kelp_greenling', 'Other fish'],
      tip: TIP, priorVotes: { yes: 0, no: 0, unsure: 0 },
    }
    addToReviewQueue({ detection: det, clip })
    setSent(true)
  }

  if (!detection.frameUrl) return null

  if (state.phase === 'idle' || state.phase === 'error') {
    return (
      <div className="model-check">
        <button type="button" className="btn" onClick={run}>Check with the AI model</button>
        {state.phase === 'error' && <p className="model-check__error" role="alert">{state.message}</p>}
      </div>
    )
  }

  if (state.phase === 'running') {
    return (
      <div className="model-check" aria-live="polite">
        <p className="model-check__running"><span className="spinner" aria-hidden="true" /> Checking this frame with the rockfish model…</p>
        <p className="model-check__hint">The first check can take a few minutes while the model wakes up.</p>
      </div>
    )
  }

  const { result } = state
  const canSend = appStatus(result.status) !== 'Identified' && DF_CAMERA[detection.cameraId]
  return (
    <div className="model-check" aria-live="polite">
      <p className={`model-check__status model-${STATUS_CLASS[result.status] ?? 'none'}`}>
        <strong>AI model: {result.status}</strong>
        {result.score != null && <span className="model-check__score">score {result.score.toFixed(3)}</span>}
      </p>
      <p className="model-check__text">{STATUS_TEXT[result.status]}</p>
      {result.species_hint && (
        <p className="model-check__hint">
          Species guess (not validated): <em>{result.species_hint.name}</em>
          {result.species_hint.common_name && ` (${result.species_hint.common_name})`}, {Math.round(result.species_hint.prob * 100)}%
        </p>
      )}
      <p className="model-check__hint">
        Identified at ≥ {result.thresholds.identified.toFixed(3)}, needs review at ≥ {result.thresholds.needs_review.toFixed(3)}.
        The score is not a probability. {result.model_version} · {result.seconds}s
      </p>
      {canSend && (sent ? (
        <a className="btn primary" href="/digital-fishers/">In the Digital Fishers queue: review it →</a>
      ) : (
        <button type="button" className="btn primary" onClick={sendToReview}>Send to Digital Fishers for review</button>
      ))}
    </div>
  )
}
