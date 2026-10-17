import { Link } from 'react-router-dom';

// Placeholder until the landing page (AI species identification) lands from its owner.
export default function HomeStub() {
  return (
    <main className="stub">
      <h1>AI Species Detection</h1>
      <p>The landing page and identification demo are being built separately.</p>
      <Link className="btn btn--primary" to="/review">Go to Digital Fishers 2.0</Link>
    </main>
  );
}
