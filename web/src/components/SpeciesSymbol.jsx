import { speciesIconSvg } from './speciesIcon.js';

// One drawn animal per species so species stay distinct without colour (see speciesIcon.js).
// variant: 'identified' (filled) | 'uncertain' (dashed ring) | 'needs_review' (ring with "?") | 'locked'
export default function SpeciesSymbol({ species, variant = 'identified', size = 20, label }) {
  return (
    <span
      className={`species-symbol species-symbol--${variant}`}
      style={{ display: 'inline-flex', width: size, height: size }}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      dangerouslySetInnerHTML={{ __html: speciesIconSvg(species, variant, size, 'currentColor') }}
    />
  );
}
