import { STATUS } from '../lib/status.js';
import SpeciesSymbol from './SpeciesSymbol.jsx';

export default function StatusBadge({ status, shape }) {
  const s = STATUS[status];
  return (
    <span className={`status-badge status-badge--${status}`} title={s.meaning}>
      <SpeciesSymbol shape={shape} variant={status} size={14} />
      {s.label}
    </span>
  );
}
