import { useRef } from 'react';
import ModelViewer from '../../components/ModelViewer.jsx';

// Reference panel that hangs from the top of the page: the 3D model to compare with the frame.
// Complementary to the task; the question and answers have their own card below it.
// Bringing the model into focus slides this whole panel to the middle of the window first.
// onMenuChange: passed through to the viewer, so the page can let the Key features menu push the decision card down.
export default function IdGuide({ clip, highlight, onMenuChange }) {
  const panel = useRef(null);
  return (
    <aside ref={panel} className={`id-guide glass ${highlight ? 'is-highlighted' : ''}`} aria-label="Compare with the 3D model">
      <h3>Compare with the 3D model</h3>
      <ModelViewer key={clip.species.id} species={clip.species} height="clamp(170px, 16.5vw, 240px)" focusFrom={panel} onMenuChange={onMenuChange} />
    </aside>
  );
}
