import { useEffect, useMemo, useRef } from 'react';

// Underwater confetti for a confirmation: a lime ring pulses out from the Confirm tile and a burst of glowing
// bubbles rises from it, a bigger burst when the confirmation completes a sighting. Decorative only (the result
// panel says what happened) and hidden under reduced motion. from: the tile's rect when it was pressed.
const LIFETIME_MS = 1900;
const rand = (min, max) => min + Math.random() * (max - min);

export default function Celebration({ from, big, onDone }) {
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    const id = setTimeout(() => done.current(), LIFETIME_MS);
    return () => clearTimeout(id);
  }, []);

  const bubbles = useMemo(
    () =>
      Array.from({ length: big ? 26 : 18 }, () => ({
        '--x': `${rand(10, 90).toFixed(0)}%`,
        '--y': `${rand(20, 70).toFixed(0)}%`,
        '--s': `${rand(6, big ? 20 : 16).toFixed(1)}px`,
        '--dx': `${rand(-70, 70).toFixed(0)}px`,
        '--dy': `${-rand(110, big ? 300 : 240).toFixed(0)}px`,
        '--d': `${rand(900, 1500).toFixed(0)}ms`,
        '--delay': `${rand(0, 220).toFixed(0)}ms`,
      })),
    [big],
  );

  return (
    <div className="celebration" aria-hidden="true" style={{ left: from.left, top: from.top, width: from.width, height: from.height }}>
      <span className="celebration__ring" />
      {bubbles.map((style, i) => (
        <span key={i} className="celebration__bubble" style={style} />
      ))}
    </div>
  );
}
