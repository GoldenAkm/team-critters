import { STATUS } from '../lib/status.js';
import SpeciesSymbol from './SpeciesSymbol.jsx';

export default function StatusBadge({ status, species }) {
  const s = STATUS[status];
  return (
    <span className={`status-badge status-badge--${status}`} title={s.meaning}>
      <SpeciesSymbol species={species} variant={status} size={22} />
      {s.label}
    </span>
  );
}
