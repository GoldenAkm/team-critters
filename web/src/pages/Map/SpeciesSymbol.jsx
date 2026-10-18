// Species marker: a drawn animal in a round marker whose style shows the status (see speciesIcon.js)
import { speciesIconSvg } from '../../components/speciesIcon.js'

export default function SpeciesSymbol({ species, status = 'identified', size = 30 }) {
  return <span className="sym" style={{ display: 'inline-flex', width: size, height: size }}
    dangerouslySetInnerHTML={{ __html: speciesIconSvg(species, status, size) }} />
}
