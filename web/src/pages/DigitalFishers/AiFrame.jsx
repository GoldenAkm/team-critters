import { useState } from 'react';
import { STATUS } from '../../lib/status.js';

// The page's centrepiece: the ONC frame the AI looked at, with its box. Box is in fractions of the frame.
export default function AiFrame({ detection, speciesName }) {
  const [ratio, setRatio] = useState(16 / 9);
  const { box, frameUrl, clipUrl } = detection;

  return (
    <figure className="ai-frame">
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
            className="detection-box"
            style={{ left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.w * 100}%`, height: `${box.h * 100}%` }}
          >
            <span className={`detection-box__label mono ${box.y < 0.08 ? 'is-inside' : ''}`}>
              AI: {STATUS[detection.status].label}
            </span>
          </div>
        )}
      </div>
      <figcaption className="ai-frame__caption">
        <span>{box ? 'Box drawn by the AI.' : 'The AI found no fish to box in this frame.'} Data: Ocean Networks Canada.</span>
        {clipUrl && (
          <a href={clipUrl} target="_blank" rel="noreferrer">
            Open in SeaTube ↗
          </a>
        )}
      </figcaption>
    </figure>
  );
}
