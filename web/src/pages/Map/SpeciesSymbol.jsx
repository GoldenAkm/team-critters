// Species shape + status styling: identified = filled, uncertain = dashed outline, needs_review = outline with "?".
import { symbolSvg } from './speciesSymbolSvg.js'

export default function SpeciesSymbol({ shape, status = 'identified', size = 18 }) {
  return <span className="sym" style={{ display: 'inline-flex', width: size, height: size }}
    dangerouslySetInnerHTML={{ __html: symbolSvg(shape, status, size) }} />
}
