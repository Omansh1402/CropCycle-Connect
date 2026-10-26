// src/components/Footer.jsx
import { Link } from 'react-router-dom';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__grid">
          {/* Brand */}
          <div className="footer__brand">
            <div className="flex items-center gap-sm mb-md">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="16" fill="#2D6A4F"/>
                <path d="M16 6C16 6 8 12 8 18C8 22.4 11.6 26 16 26C20.4 26 24 22.4 24 18C24 12 16 6 16 6Z" fill="#52B788"/>
                <path d="M16 10C16 10 11 14.5 11 18.5C11 21.5 13.2 24 16 24" fill="#2D6A4F"/>
                <circle cx="16" cy="20" r="2" fill="#F9F4EF"/>
              </svg>
              <div>
                <div className="footer__logo-name">CropCycle Connect</div>
              </div>
            </div>
            <p className="footer__tagline">
              Turning agricultural residue into opportunity — reducing stubble burning
              and creating value chains for farmers and buyers alike.
            </p>
            <div className="footer__disclaimer">
              ⚠️ This is a hackathon demonstration. Sample data shown is fictional and does not represent real individuals or organisations.
            </div>
          </div>

          {/* Navigation */}
          <div className="footer__col">
            <h4 className="footer__heading">Platform</h4>
            <ul className="footer__links">
              <li><Link to="/">Home</Link></li>
              <li><Link to="/farmer">List Residue</Link></li>
              <li><Link to="/buyer">Find Residue</Link></li>
              <li><Link to="/matches">Matches</Link></li>
              <li><Link to="/dashboard">Dashboard</Link></li>
            </ul>
          </div>

          {/* Info */}
          <div className="footer__col">
            <h4 className="footer__heading">About</h4>
            <ul className="footer__links">
              <li><Link to="/#how-it-works">How It Works</Link></li>
              <li><Link to="/#impact">Environmental Impact</Link></li>
              <li><Link to="/matches">Active Matches</Link></li>
            </ul>
          </div>

          {/* Impact */}
          <div className="footer__col">
            <h4 className="footer__heading">Project</h4>
            <p className="body-sm" style={{ color: 'rgba(255,255,255,0.55)', lineHeight: '1.7' }}>
              Built at a 4-day hackathon to address India's crop-residue burning crisis.
              Phase 1: Matching platform.
            </p>
            <div className="footer__badge mt-md">🌱 4-Day Hackathon Project</div>
          </div>
        </div>

        <div className="footer__bottom">
          <p>© 2026 CropCycle Connect. Hackathon Demo — Not for commercial use.</p>
          <p>Built with ❤️ for sustainable agriculture.</p>
        </div>
      </div>
    </footer>
  );
}
