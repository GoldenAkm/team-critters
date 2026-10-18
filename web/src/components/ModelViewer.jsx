import { useEffect, useId, useRef, useState } from 'react';

// Shared 3D species viewer. Loads /3d/<model>.glb when the file exists,
// otherwise shows a placeholder with the same controls layout.
// species.views overrides the presets ([theta, phi] in degrees) for models in other orientations;
// species.modelVariants adds a colour switch (same fish under different water and light).
// Rendered in an underwater three.js scene (underwater/UnderwaterViewer.js).
// A GLB with a "Swim" animation (see web/scripts/prepare_rockfish_glb.py) gets a Swim button.
// Expand (top right of the stage) brings the model into focus: the panel it sits in (focusFrom) slides left to the
// middle of the window and the viewer grows out of it into a modal dialog; closing plays that backwards.
// The dialog opens (invisibly) as the slide starts, so its model loads during the motion and the growth can
// overlap the end of the slide. Key features labels the parts on the model and drops down a numbered menu of
// them. The inline viewer keeps only Key features and the colour switch; rotate, Front/Side/Top and Swim live
// in the focused view (drag still spins it inline).
function ExpandIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg className="model-viewer__chevron" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RotateIcon({ flip }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" style={flip ? { transform: 'scaleX(-1)' } : undefined}>
      <path d="M3 8a5 5 0 1 0 1.5-3.6" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 2.5v3h3" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

// Models that can swim start swimming as soon as they load (never under reduced motion).
const SWIM_ON_LOAD = true;

// Bringing the model into focus: the panel slides across to the middle, and the dialog grows out of it,
// starting before the slide has quite finished so the two read as one movement. Closing overlaps the same way.
const SLIDE_MS = 340;
const SLIDE_EASE = 'cubic-bezier(.4, 0, .2, 1)';
const GROW_MS = 460;
const GROW_AT = 0.8; // of the slide
const GROW_EASE = 'cubic-bezier(.2, .8, .2, 1)';
const SHRINK_MS = 320;
const SHRINK_EASE = 'cubic-bezier(.4, 0, .6, 1)';
const SLIDE_BACK_AT = 0.75; // of the shrink
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = (ms) => new Promise((done) => setTimeout(done, ms));

// The transform that lays the dialog's 3D stage over `from` (a rect), scaling about the dialog's centre.
function zoomFrom(dialog, from) {
  const box = dialog.getBoundingClientRect();
  const to = dialog.querySelector('.model-viewer__stage').getBoundingClientRect();
  const s = from.width / to.width;
  const cx = box.left + box.width / 2;
  const cy = box.top + box.height / 2;
  const tx = from.left + from.width / 2 - (cx + s * (to.left + to.width / 2 - cx));
  const ty = from.top + from.height / 2 - (cy + s * (to.top + to.height / 2 - cy));
  return `translate(${tx}px, ${ty}px) scale(${s})`;
}

const DEFAULT_VIEWS = { Front: [0, 90], Side: [90, 90], Top: [0, 0] };

// Resolves to the viewer class once the model file exists (three.js is loaded only then).
function useModelAvailable(url) {
  const [state, setState] = useState({ status: 'checking', Viewer: null });
  useEffect(() => {
    let alive = true;
    setState({ status: 'checking', Viewer: null });
    fetch(url, { method: 'HEAD' })
      .then((r) => {
        // Vite's dev server answers missing files with index.html, so check the type too.
        const ok = r.ok && !(r.headers.get('content-type') ?? '').includes('text/html');
        return ok ? import('./underwater/UnderwaterViewer.js').then((m) => m.default) : null;
      })
      .catch(() => null)
      .then((Viewer) => alive && setState({ status: Viewer ? 'ready' : 'missing', Viewer }));
    return () => {
      alive = false;
    };
  }, [url]);
  return state;
}

// focusFrom: optional ref to the panel around the viewer, which slides to the middle when the model comes into focus.
// onMenuChange(open): told just before the inline Key features menu opens or closes, so the page can make room.
export default function ModelViewer({ species, height = 260, focusFrom, onMenuChange }) {
  const [variantId, setVariantId] = useState(species.modelVariants?.[0]?.id);
  // null, or the focused view: { stage, features } (stage: the inline stage it grows out of).
  const [focused, setFocused] = useState(null);
  const shared = { species, variantId, setVariantId };
  return (
    <>
      <ViewerBody
        {...shared}
        height={height}
        onExpand={(stage, features) => setFocused((f) => f ?? { stage, features })}
        onMenuChange={onMenuChange}
      />
      {focused && <ExpandedViewer {...shared} {...focused} panel={focusFrom?.current} onDone={() => setFocused(null)} />}
    </>
  );
}

function ExpandedViewer({ species, stage, features, panel, onDone, ...shared }) {
  const dialog = useRef(null);
  const motion = useRef(null); // { zoom, slide, hide } for playing the opening backwards
  const closing = useRef(false);

  useEffect(() => {
    const d = dialog.current;
    if (reducedMotion() || !stage) {
      d.showModal();
      return undefined;
    }
    // Where the inline stage will be once the panel has slid to the middle; the dialog grows out of there.
    const from = stage.getBoundingClientRect();
    const box = panel?.getBoundingClientRect();
    const dx = box ? innerWidth / 2 - (box.left + box.width / 2) : 0;
    const sliding = Math.abs(dx) > 4;
    d.showModal();
    const zoom = zoomFrom(d, { left: from.left + (sliding ? dx : 0), top: from.top, width: from.width, height: from.height });
    const delay = sliding ? SLIDE_MS * GROW_AT : 0;
    const slide = sliding
      ? panel.animate([{ transform: 'none' }, { transform: `translateX(${dx}px)` }], { duration: SLIDE_MS, easing: SLIDE_EASE, fill: 'forwards' })
      : null;
    // Until it grows, the dialog and its backdrop stay invisible, so the slide plays on the page as it is.
    const grow = d.animate([{ transform: zoom, opacity: 0 }, { opacity: 1, offset: 0.3 }, { transform: 'none', opacity: 1 }], {
      duration: GROW_MS, delay, easing: GROW_EASE, fill: 'backwards',
    });
    const dim = d.animate([{ opacity: 0 }, { opacity: 1 }], { duration: GROW_MS * 0.8, delay, fill: 'backwards', pseudoElement: '::backdrop' });
    const hide = panel?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: GROW_MS * 0.5, delay, fill: 'both' });
    motion.current = { zoom, slide, hide };
    return () => {
      [grow, dim, slide, hide].forEach((a) => a?.cancel());
      motion.current = null;
    };
  }, []);

  async function close() {
    if (closing.current) return;
    closing.current = true;
    const d = dialog.current;
    const m = motion.current;
    if (m) {
      // Shrink back into the panel as it fades back in, then slide it home, starting a little before the end.
      m.hide?.reverse();
      d.animate([{ opacity: 1 }, { opacity: 0 }], { duration: SHRINK_MS, fill: 'forwards', pseudoElement: '::backdrop' });
      const shrink = d.animate([{ transform: 'none', opacity: 1 }, { opacity: 1, offset: 0.6 }, { transform: m.zoom, opacity: 0 }], {
        duration: SHRINK_MS, easing: SHRINK_EASE, fill: 'forwards',
      });
      await wait(SHRINK_MS * SLIDE_BACK_AT);
      m.slide?.reverse();
      await shrink.finished;
      d.close();
      await m.slide?.finished;
    } else {
      d.close();
    }
    onDone();
  }

  return (
    <dialog
      ref={dialog}
      className="model-dialog glass"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      // Closed some other way (the browser can insist on Escape): just tidy up.
      onClose={() => !closing.current && onDone()}
      aria-label={`3D model of a ${species.name.toLowerCase()}`}
    >
      <div className="model-dialog__head">
        <div>
          <h2>{species.name}</h2>
          <p className="sci">{species.sci}</p>
        </div>
        <button type="button" className="btn btn--small" onClick={close}>
          Close
        </button>
      </div>
      <ViewerBody species={species} {...shared} height="min(58vh, 600px, 70vw)" viewControls featuresAtStart={features} />
    </dialog>
  );
}

// onExpand (inline only) gets the stage element, to bring the model into focus from where it is, and whether the
// key features are showing, so the focused view opens the same way.
function ViewerBody({ species, variantId, setVariantId, height, onExpand, onMenuChange, viewControls = false, featuresAtStart = false }) {
  const variants = species.modelVariants ?? [];
  const views = species.views ?? DEFAULT_VIEWS;
  const model = variants.find((v) => v.id === variantId)?.model ?? species.model;
  const url = `${import.meta.env.BASE_URL}3d/${model}.glb`;
  // Check the default model once; colour variants just load into the running viewer.
  const { status: available, Viewer } = useModelAvailable(`${import.meta.env.BASE_URL}3d/${variants[0]?.model ?? species.model}.glb`);
  const host = useRef(null);
  const viewer = useRef(null);
  const angleEl = useRef(null);
  const hotspotEls = useRef([]);
  const stage = useRef(null);
  const [showFeatures, setShowFeatures] = useState(featuresAtStart);
  const menuId = useId();
  const toggleFeatures = () => {
    onMenuChange?.(!showFeatures);
    setShowFeatures(!showFeatures);
  };
  const [canSwim, setCanSwim] = useState(false);
  const [swimming, setSwimming] = useState(SWIM_ON_LOAD);

  useEffect(() => {
    if (!Viewer || !host.current) return;
    const v = new Viewer(host.current, {
      startView: views.Side ?? DEFAULT_VIEWS.Side,
      onAngle: (deg) => {
        if (angleEl.current) angleEl.current.textContent = `${deg}°`;
      },
      onLoad: ({ hasSwim }) => setCanSwim(hasSwim),
    });
    v.setSwimming(SWIM_ON_LOAD);
    viewer.current = v;
    return () => {
      v.dispose();
      viewer.current = null;
    };
  }, [Viewer]);

  useEffect(() => {
    viewer.current?.load(url);
  }, [Viewer, url]);

  useEffect(() => {
    const hotspots = showFeatures ? species.hotspots.map((h, i) => ({ ...h, el: hotspotEls.current[i] })) : [];
    viewer.current?.setHotspots(hotspots);
  }, [Viewer, showFeatures, species]);

  const toggleSwim = () => {
    viewer.current?.setSwimming(!swimming);
    setSwimming(!swimming);
  };
  const setOrbit = (theta, phi) => viewer.current?.setView(theta, phi);
  const rotate = (delta) => viewer.current?.rotate(delta);

  const ready = available === 'ready';
  return (
    <div className="model-viewer">
      <div ref={stage} className="model-viewer__stage" style={{ height }}>
        {ready ? (
          <>
            <div ref={host} className="model-viewer__canvas" role="img" aria-label={`3D model of a ${species.name.toLowerCase()}, underwater`} />
            {showFeatures &&
              species.hotspots.map((h, i) => (
                <span
                  key={h.label}
                  ref={(el) => {
                    hotspotEls.current[i] = el;
                  }}
                  className="model-hotspot mono"
                  title={h.label}
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
              ))}
          </>
        ) : (
          <div className="model-viewer__placeholder">
            <svg viewBox="0 0 120 60" width="60%" aria-hidden="true">
              <path d="M10 30 Q35 8 70 14 L82 6 L84 18 Q100 24 108 30 Q100 36 84 42 L82 54 L70 46 Q35 52 10 30 Z" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M108 30 L118 20 L118 40 Z" fill="none" stroke="currentColor" strokeWidth="2" />
              <circle cx="24" cy="28" r="2.5" fill="currentColor" />
            </svg>
            <p>{available === 'checking' ? 'Loading 3D model…' : '3D model coming soon'}</p>
          </div>
        )}
        <span ref={angleEl} className="model-viewer__angle mono">{ready ? null : '—'}</span>
        {onExpand && ready && (
          <button type="button" className="model-viewer__expand" onClick={() => onExpand(stage.current, showFeatures)} aria-haspopup="dialog" aria-label="Expand 3D model">
            <ExpandIcon />
          </button>
        )}
      </div>

      <div className="model-viewer__toolbar">
        <div className="model-viewer__controls">
          {viewControls && (
            <>
              <button type="button" onClick={() => rotate(-45)} disabled={!ready} aria-label="Rotate left"><RotateIcon /></button>
              <button type="button" onClick={() => rotate(45)} disabled={!ready} aria-label="Rotate right"><RotateIcon flip /></button>
              {Object.entries(views).map(([name, [t, p]]) => (
                <button key={name} type="button" onClick={() => setOrbit(t, p)} disabled={!ready}>{name}</button>
              ))}
              {canSwim && (
                <button type="button" aria-pressed={swimming} onClick={toggleSwim}>
                  {swimming ? 'Stop' : 'Swim'}
                </button>
              )}
            </>
          )}
          <button
            type="button"
            className="model-viewer__menu-toggle"
            aria-expanded={showFeatures}
            aria-controls={menuId}
            onClick={toggleFeatures}
          >
            Key features <ChevronIcon />
          </button>
        </div>

        {/* Drops down under the toolbar. Numbers match the labels on the model. */}
        <div id={menuId} className={`model-viewer__menu ${showFeatures ? 'is-open' : ''}`} inert={!showFeatures}>
          <div className="model-viewer__menu-inner">
            {ready && species.hotspots?.length > 0 ? (
              <ol className="model-viewer__features">
                {species.hotspots.map((h) => <li key={h.label}>{h.label}</li>)}
              </ol>
            ) : (
              <ul className="model-viewer__features">
                {species.features.map((f) => <li key={f}>{f}</li>)}
              </ul>
            )}
          </div>
        </div>
      </div>

      {variants.length > 1 && (
        <div className="model-viewer__variants" role="group" aria-label="Colour">
          <span className="small muted">Colour</span>
          {variants.map((v) => (
            <button key={v.id} type="button" aria-pressed={v.id === variantId} onClick={() => setVariantId(v.id)}>
              {v.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
