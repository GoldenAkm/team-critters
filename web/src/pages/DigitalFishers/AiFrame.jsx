import { useState } from 'react';
import { STATUS } from '../../lib/status.js';
import AnswerIcon from '../../components/AnswerIcon.jsx';
import ConfirmTrace from './ConfirmTrace.jsx';

// The page's centrepiece: the ONC frame the AI looked at, with its box. Box is in fractions of the frame.
// children: the model's answer, shown as a band along the frame's bottom edge. meta: camera site and time.
// celebrate: 'sighting' when reviewers agreed it is the species, 'mine' when you confirmed it and the others are
// still to answer. Either way a lime dot traces a border round the image and the stamp pops out of it back in the
// corner, then the box lights up; only 'sighting' says it counts.
const STAMP = { sighting: 'Confirmed sighting', mine: 'Confirmed!' };
const BOX = { sighting: 'Confirmed', mine: 'Confirmed by you' };

export default function AiFrame({ detection, speciesName, meta, celebrate = null, children }) {
  const [ratio, setRatio] = useState(16 / 9);
  const { box, frameUrl, clipUrl } = detection;

  return (
    <figure className={`ai-frame ${children ? 'has-verdict' : ''} ${celebrate ? 'is-confirmed' : ''}`}>
      <div className="ai-frame__stage" style={{ aspectRatio: ratio }}>
        {frameUrl ? (
          <img
            src={frameUrl}
            alt={`ONC camera frame the AI checked for a ${speciesName.toLowerCase()}`}
            onLoad={(e) => setRatio(e.target.naturalWidth / e.target.naturalHeight)}
          />
        ) : (
          <div className="ai-frame__placeholder" role="img" aria-label="Placeholder frame; ONC footage will appear here">
            <span className="mono">Sample frame · ONC footage goes here</span>
          </div>
        )}
        {box && (
          <div
            className={`detection-box ${celebrate ? 'is-confirmed' : ''}`}
            style={{ left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.w * 100}%`, height: `${box.h * 100}%` }}
          >
            <span className={`detection-box__label mono ${box.y < 0.08 ? 'is-inside' : ''}`}>
              {celebrate ? BOX[celebrate] : `AI: ${STATUS[detection.status].label}`}
            </span>
          </div>
        )}
        {celebrate && <ConfirmTrace />}
        {celebrate && (
          <span className="ai-frame__stamp">
            <AnswerIcon kind="yes" size={18} />
            {STAMP[celebrate]}
          </span>
        )}
      </div>
      {children && <div className="ai-frame__verdict">{children}</div>}
      <figcaption className="ai-frame__caption">
        <span>
          {meta && <>{meta} · </>}
          {box ? 'Box drawn by the AI.' : 'The AI found no fish to box in this frame.'} Data: Ocean Networks Canada.
        </span>
        {clipUrl && (
          <a href={clipUrl} target="_blank" rel="noreferrer">
            Open in SeaTube ↗
          </a>
        )}
      </figcaption>
    </figure>
  );
}
