import { NavLink, Route, Routes } from 'react-router-dom';
import ReviewPage from './pages/review/ReviewPage.jsx';
import HomeStub from './pages/stubs/HomeStub.jsx';
import MapStub from './pages/stubs/MapStub.jsx';
import CollectionStub from './pages/stubs/CollectionStub.jsx';
import { useCollection } from './lib/useCollection.js';

export default function App() {
  const { reset } = useCollection();
  return (
    <div className="app">
      <header className="portal-header">
        <div className="portal-header__brand">
          <span className="logo mono" aria-hidden="true">ONC</span>
          <span>Oceans 3.0 Data Portal</span>
        </div>
        <nav aria-label="Main">
          <NavLink to="/" end>AI Species Detection</NavLink>
          <NavLink to="/map">Interactive Map</NavLink>
          <NavLink to="/review">Digital Fishers 2.0</NavLink>
          <NavLink to="/collection">Marine collection</NavLink>
        </nav>
      </header>

      <Routes>
        <Route path="/" element={<HomeStub />} />
        <Route path="/review" element={<ReviewPage />} />
        <Route path="/map" element={<MapStub />} />
        <Route path="/collection" element={<CollectionStub />} />
        <Route path="/collection/:speciesId" element={<CollectionStub />} />
        <Route path="*" element={<HomeStub />} />
      </Routes>

      <footer className="site-footer">
        <span>Data: Ocean Networks Canada.</span>
        <span>Prototype. Species, clips, votes and scores shown are illustrative sample data.</span>
        <button type="button" className="link-button" onClick={reset}>Reset demo progress</button>
      </footer>
    </div>
  );
}
