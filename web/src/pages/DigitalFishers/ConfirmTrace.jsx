import { useId, useLayoutEffect, useRef, useState } from 'react';

// The confirmation traced on the frame: a lime dot appears in the top-left corner, runs once round the image
// drawing a glowing border behind it, and is back in the corner as the stamp pops out of it (AiFrame).
// Lives inside the frame's stage and follows its rounded corners. The dot and the line are moved together by one
// frame loop, so the line always ends exactly at the dot; the glow is a wide soft stroke, not a blur filter.
// HOLD + RUN must match the stamp's delay in DigitalFishersPage.css (it pops as the dot gets back: 2 s).
const INSET = 4; // keeps the line and the dot inside the image's edge
const HOLD = 200; // ms the dot waits in the corner before it sets off
const RUN = 1800; // ms once round
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2); // ease in and out

function roundRect(w, h, top, bottom) {
  const x0 = INSET;
  const y0 = INSET;
  const x1 = w - INSET;
  const y1 = h - INSET;
  const rt = Math.max(0, top - INSET);
  const rb = Math.max(0, bottom - INSET);
  return [
    `M ${x0 + rt} ${y0}`,
    `H ${x1 - rt}`,
    rt ? `A ${rt} ${rt} 0 0 1 ${x1} ${y0 + rt}` : '',
    `V ${y1 - rb}`,
    rb ? `A ${rb} ${rb} 0 0 1 ${x1 - rb} ${y1}` : '',
    `H ${x0 + rb}`,
    rb ? `A ${rb} ${rb} 0 0 1 ${x0} ${y1 - rb}` : '',
    `V ${y0 + rt}`,
    rt ? `A ${rt} ${rt} 0 0 1 ${x0 + rt} ${y0}` : '',
  ].join(' ');
}

export default function ConfirmTrace() {
  const svg = useRef(null);
  const line = useRef(null);
  const glow = useRef(null);
  const dot = useRef(null);
  const [geo, setGeo] = useState(null);
  const [still] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const glowId = `trace-glow-${useId().replace(/[^\w-]/g, '')}`;

  useLayoutEffect(() => {
    const stage = svg.current.parentElement;
    const { width, height } = stage.getBoundingClientRect();
    const style = getComputedStyle(stage);
    setGeo({ w: width, h: height, top: parseFloat(style.borderTopLeftRadius) || 0, bottom: parseFloat(style.borderBottomLeftRadius) || 0 });
  }, []);

  useLayoutEffect(() => {
    if (!geo) return undefined;
    const len = line.current.getTotalLength();
    const paths = [line.current, glow.current];
    paths.forEach((p) => (p.style.strokeDasharray = `${len} ${len}`));
    // p: 0-1 of the way round
    const place = (p) => {
      paths.forEach((path) => (path.style.strokeDashoffset = `${len * (1 - p)}`));
      const at = line.current.getPointAtLength(len * p);
      dot.current?.setAttribute('transform', `translate(${at.x} ${at.y})`);
    };
    if (still) {
      place(1);
      return undefined;
    }
    place(0);
    const start = performance.now();
    let raf = 0;
    const tick = (now) => {
      const t = now - start;
      place(ease(Math.min(1, Math.max(0, (t - HOLD) / RUN))));
      if (t < HOLD + RUN) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [geo, still]);

  const d = geo && roundRect(geo.w, geo.h, geo.top, geo.bottom);
  return (
    <svg ref={svg} className="confirm-trace" viewBox={geo ? `0 0 ${geo.w} ${geo.h}` : undefined} aria-hidden="true">
      <defs>
        <radialGradient id={glowId}>
          <stop offset="0" stopColor="#d8ff7a" stopOpacity="0.95" />
          <stop offset="0.35" stopColor="#97d700" stopOpacity="0.6" />
          <stop offset="1" stopColor="#97d700" stopOpacity="0" />
        </radialGradient>
      </defs>
      {d && (
        <>
          <path ref={glow} className="confirm-trace__glow" d={d} />
          <path ref={line} className="confirm-trace__line" d={d} />
          {!still && (
            <g ref={dot}>
              <g className="confirm-trace__dot">
                <circle r="16" fill={`url(#${glowId})`} />
                <circle r="6" className="confirm-trace__core" />
              </g>
            </g>
          )}
        </>
      )}
    </svg>
  );
}
