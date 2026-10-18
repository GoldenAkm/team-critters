// One shape per species so species stay distinct without colour.
// variant: 'identified' (filled) | 'uncertain' (dashed outline) | 'needs_review' (outline with "?") | 'locked'
const SHAPES = {
  circle: <circle cx="12" cy="12" r="8" />,
  square: <rect x="4.5" y="4.5" width="15" height="15" />,
  triangle: <polygon points="12,3.5 20.5,19.5 3.5,19.5" />,
  diamond: <polygon points="12,3 21,12 12,21 3,12" />,
  hexagon: <polygon points="12,3 19.8,7.5 19.8,16.5 12,21 4.2,16.5 4.2,7.5" />,
};

export default function SpeciesSymbol({ shape = 'circle', variant = 'identified', size = 20, label }) {
  const filled = variant === 'identified';
  return (
    <svg
      className={`species-symbol species-symbol--${variant}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <g
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeDasharray={variant === 'uncertain' ? '3 2' : undefined}
        opacity={variant === 'locked' ? 0.35 : 1}
      >
        {SHAPES[shape] ?? SHAPES.circle}
      </g>
      {variant === 'needs_review' && (
        <text x="12" y="16" textAnchor="middle" fontSize="10" fontWeight="700" fill="currentColor">?</text>
      )}
    </svg>
  );
}
