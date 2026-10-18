import { useEffect, useRef, useState } from 'react';

// Shared 3D species viewer. Loads /3d/<model>.glb when the file exists,
// otherwise shows a placeholder with the same controls layout.
// species.views overrides the presets ([theta, phi] in degrees) for models in other orientations;
// species.modelVariants adds a colour switch (same fish under different water and light).
// Rendered in an underwater three.js scene (underwater/UnderwaterViewer.js).
// A GLB with a "Swim" animation (see web/scripts/prepare_rockfish_glb.py) gets a Swim button.
// Expand opens the same viewer large in a modal dialog.
function ExpandIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" fill="none" stroke="currentColor" strokeWidth="1.6" />
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

export default function ModelViewer({ species, height = 260 }) {
  const [variantId, setVariantId] = useState(species.modelVariants?.[0]?.id);
  const [expanded, setExpanded] = useState(false);
  const shared = { species, variantId, setVariantId };
  return (
    <>
      <ViewerBody {...shared} height={height} onExpand={() => setExpanded(true)} />
      {expanded && <ExpandedViewer {...shared} onClose={() => setExpanded(false)} />}
    </>
  );
}

function ExpandedViewer({ species, onClose, ...shared }) {
  const dialog = useRef(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog ref={dialog} className="model-dialog" onClose={onClose} aria-label={`3D model of a ${species.name.toLowerCase()}`}>
      <div className="model-dialog__head">
        <div>
          <h2>{species.name}</h2>
          <p className="sci">{species.sci}</p>
        </div>
        <button type="button" className="btn btn--small" onClick={() => dialog.current.close()}>
          Close
        </button>
      </div>
      <ViewerBody species={species} {...shared} height="min(58vh, 600px, 70vw)" />
    </dialog>
  );
}

function ViewerBody({ species, variantId, setVariantId, height, onExpand }) {
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
  const [showFeatures, setShowFeatures] = useState(false);
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
      <div className="model-viewer__stage" style={{ height }}>
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
          <button type="button" className="model-viewer__expand" onClick={onExpand} aria-label="Expand 3D model">
            <ExpandIcon />
          </button>
        )}
      </div>

      <div className="model-viewer__controls">
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
        <button type="button" aria-pressed={showFeatures} onClick={() => setShowFeatures((v) => !v)}>
          Key features
        </button>
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

      {showFeatures &&
        (ready && species.hotspots.length > 0 ? (
          <ol className="model-viewer__features">
            {species.hotspots.map((h) => <li key={h.label}>{h.label}</li>)}
          </ol>
        ) : (
          <ul className="model-viewer__features">
            {species.features.map((f) => <li key={f}>{f}</li>)}
          </ul>
        ))}
    </div>
  );
}
