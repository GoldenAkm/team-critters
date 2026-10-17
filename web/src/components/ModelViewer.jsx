import { useEffect, useRef, useState } from 'react';

// Shared 3D species viewer. Loads /3d/<species.model>.glb with <model-viewer> when the
// file exists, otherwise shows a placeholder with the same controls layout.
const VIEWS = { Front: [0, 90], Side: [90, 90], Top: [0, 0] };

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
  const url = `${import.meta.env.BASE_URL}3d/${species.model}.glb`;
  const available = useModelAvailable(url);
  const viewer = useRef(null);
  const [angle, setAngle] = useState(0);
  const [showFeatures, setShowFeatures] = useState(false);

  useEffect(() => {
    const el = viewer.current;
    if (!el) return;
    const onChange = () => {
      const deg = Math.round((el.getCameraOrbit().theta * 180) / Math.PI);
      setAngle(((deg % 360) + 360) % 360);
    };
    el.addEventListener('camera-change', onChange);
    return () => el.removeEventListener('camera-change', onChange);
  }, [available]);

  const setOrbit = (theta, phi) => {
    const el = viewer.current;
    if (!el) return;
    el.cameraOrbit = `${theta}deg ${phi}deg auto`;
  };
  const rotate = (delta) => {
    const el = viewer.current;
    if (!el) return;
    const o = el.getCameraOrbit();
    setOrbit((o.theta * 180) / Math.PI + delta, (o.phi * 180) / Math.PI);
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
            interaction-prompt="none"
            shadow-intensity="0.6"
            style={{ width: '100%', height: '100%' }}
          >
            {showFeatures &&
              species.hotspots.map((h, i) => (
                <button key={i} className="model-hotspot" slot={`hotspot-${i}`} data-position={h.position} data-normal={h.normal}>
                  {h.label}
                </button>
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
      </div>

      <div className="model-viewer__controls">
        <button type="button" onClick={() => rotate(-45)} disabled={!ready} aria-label="Rotate left">⟲</button>
        <button type="button" onClick={() => rotate(45)} disabled={!ready} aria-label="Rotate right">⟳</button>
        {Object.entries(VIEWS).map(([name, [t, p]]) => (
          <button key={name} type="button" onClick={() => setOrbit(t, p)} disabled={!ready}>{name}</button>
        ))}
        <button type="button" aria-pressed={showFeatures} onClick={() => setShowFeatures((v) => !v)}>
          Key features
        </button>
      </div>

      {showFeatures && (!ready || species.hotspots.length === 0) && (
        <ul className="model-viewer__features">
          {species.features.map((f) => <li key={f}>{f}</li>)}
        </ul>
      )}
    </div>
  );
}
