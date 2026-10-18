import { useEffect, useRef } from 'react';
import SpeciesSymbol from '../../components/SpeciesSymbol.jsx';
import ConservationTag from '../../components/ConservationTag.jsx';

export default function CollectedModal({ species, camera, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);

  return (
    <dialog ref={ref} className="modal" onClose={onClose} aria-labelledby="collected-title">
      <p className="eyebrow mono">New species collected</p>
      <div className="species-card">
        <div className="species-card__top">
          <span className="mono">#{String(species.number).padStart(3, '0')}</span>
          <ConservationTag species={species} />
        </div>
        <div className="species-card__art">
          <SpeciesSymbol species={species.id} size={72} />
        </div>
        <h2 id="collected-title">{species.name}</h2>
        <p className="sci">{species.sci}</p>
      </div>
      <p>
        First confirmed by you at {camera.name}. Its full profile and 3D model are now in your Marine collection.
      </p>
      <div className="modal__actions">
        <button type="button" className="btn" onClick={() => ref.current.close()}>Keep reviewing</button>
        <a className="btn btn--primary" href="#collection" onClick={() => ref.current.close()}>
          See my collection
        </a>
      </div>
    </dialog>
  );
}
