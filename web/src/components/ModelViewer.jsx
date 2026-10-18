import { useEffect, useRef, useState } from 'react';

// Shared 3D species viewer. Loads /3d/<model>.glb with <model-viewer> when the file exists,
// otherwise shows a placeholder with the same controls layout.
// species.views overrides the presets ([theta, phi] in degrees) for models in other orientations;
// species.modelVariants adds a colour switch (same fish under different water and light).
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

const DEFAULT_VIEWS = { Front: [0, 90], Side: [90, 90], Top: [0, 0] };

function startSwim(el) {
  el.animationName = 'Swim';
  el.play({ repetitions: Infinity });
}

function useModelAvailable(url) {
  const [state, setState] = useState('checking');
  useEffect(() => {
    let alive = true;
    setState('checking');
    fetch(url, { method: 'HEAD' })
      .then((r) => {
        // Vite's dev server answers missing files with index.html, so check the type too.
        const ok = r.ok && !(r.headers.get('content-type') ?? '').includes('text/html');
        if (!ok) return false;
        return import('@google/model-viewer').then(() => true);
      })
      .catch(() => false)
      .then((ok) => alive && setState(ok ? 'ready' : 'missing'));
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
  // Check the default model once; colour variants just swap src on the mounted viewer.
  const available = useModelAvailable(`${import.meta.env.BASE_URL}3d/${variants[0]?.model ?? species.model}.glb`);
  const [startTheta, startPhi] = views.Side ?? DEFAULT_VIEWS.Side;
  const viewer = useRef(null);
  const [angle, setAngle] = useState(0);
  const [showFeatures, setShowFeatures] = useState(false);
  const [canSwim, setCanSwim] = useState(false);
  const [swimming, setSwimming] = useState(false);
  const swimmingRef = useRef(false);
  swimmingRef.current = swimming;

  // A colour swap reloads the model; pick the swim back up if it was on.
  useEffect(() => {
    const el = viewer.current;
    if (!el) return;
    const onLoad = () => {
      const has = el.availableAnimations?.includes('Swim');
      setCanSwim(Boolean(has));
      if (has && swimmingRef.current) startSwim(el);
    };
    el.addEventListener('load', onLoad);
    return () => el.removeEventListener('load', onLoad);
  }, [available]);

  const toggleSwim = () => {
    const el = viewer.current;
    if (!el) return;
    if (swimming) {
      el.pause();
      el.currentTime = 0; // back to the rest pose
    } else {
      startSwim(el);
    }
    setSwimming(!swimming);
  };

  useEffect(() => {
    const el = viewer.current;
    if (!el) return;
    const onChange = (e) => {
      if (e.detail?.source === 'user-interaction') target.current = null;
      const deg = Math.round((el.getCameraOrbit().theta * 180) / Math.PI);
      setAngle(((deg % 360) + 360) % 360);
    };
    el.addEventListener('camera-change', onChange);
    return () => el.removeEventListener('camera-change', onChange);
  }, [available]);

  // Where the camera is heading; cleared when the user drags so buttons start from the real view.
  const target = useRef(null);
  const setOrbit = (theta, phi) => {
    const el = viewer.current;
    if (!el) return;
    target.current = [theta, phi];
    el.cameraOrbit = `${theta}deg ${phi}deg auto`;
  };
  const rotate = (delta) => {
    const el = viewer.current;
    if (!el) return;
    const o = el.getCameraOrbit();
    const [theta, phi] = target.current ?? [(o.theta * 180) / Math.PI, (o.phi * 180) / Math.PI];
    setOrbit(theta + delta, phi);
  };

  const ready = available === 'ready';
  return (
    <div className="model-viewer">
      <div className="model-viewer__stage" style={{ height }}>
        {ready ? (
          <model-viewer
            ref={viewer}
            src={url}
            alt={`3D model of a ${species.name.toLowerCase()}`}
            camera-controls
            camera-orbit={`${startTheta}deg ${startPhi}deg auto`}
            interaction-prompt="none"
            shadow-intensity="0.6"
            style={{ width: '100%', height: '100%' }}
          >
            {showFeatures &&
              species.hotspots.map((h, i) => (
                <span
                  key={i}
                  className="model-hotspot mono"
                  slot={`hotspot-${i}`}
                  data-position={h.position}
                  data-normal={h.normal}
                  title={h.label}
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
              ))}
          </model-viewer>
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
        <span className="model-viewer__angle mono">{ready ? `${angle}°` : '—'}</span>
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
