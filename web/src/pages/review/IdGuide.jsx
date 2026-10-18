import ModelViewer from '../../components/ModelViewer.jsx';

// Side column: 3D comparison, optional feature checklist, and the clip's tip.
export default function IdGuide({ clip, checked, onToggle, locked, highlight }) {
  return (
    <aside className={`id-guide ${highlight ? 'is-highlighted' : ''}`} aria-label="Identification guide">
      <h3>Compare with the 3D model</h3>
      <ModelViewer key={clip.species.id} species={clip.species} height={200} />

      <fieldset className="checklist" disabled={locked}>
        <legend>What can you see in the clip? <span className="muted">(optional)</span></legend>
        {clip.species.features.map((f) => (
          <label key={f}>
            <input type="checkbox" checked={checked.includes(f)} onChange={() => onToggle(f)} />
            {f}
          </label>
        ))}
      </fieldset>

      {clip.tip && (
        <p className="tip">
          <strong>Tip:</strong> {clip.tip}
        </p>
      )}
    </aside>
  );
}
