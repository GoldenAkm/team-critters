import { REVIEWS_NEEDED } from './config.js';

const STEPS = [
  ['AI scans ONC footage', 'It detects and classifies animals in fixed-camera video.'],
  ['Unsure cases come here', 'Anything the AI cannot back up is held back instead of counted.'],
  ['Several people review', `Each clip gets ${REVIEWS_NEEDED} independent reviews.`],
  ['Agreement confirms it', 'A majority confirms the sighting; reviewers who matched collect the species.'],
];

export default function HowItWorks() {
  return (
    <ol className="how-it-works" aria-label="How it works">
      {STEPS.map(([title, text], i) => (
        <li key={title}>
          <span className="how-it-works__n mono">{i + 1}</span>
          <div>
            <strong>{title}</strong>
            <p>{text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
