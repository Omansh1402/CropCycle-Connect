// src/components/Navbar.jsx
import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation, SUPPORTED_LANGUAGES } from '../lib/i18n';
import { currentUser, logout } from '../lib/auth';
import Brand from './Brand';
import './Navbar.css';

const navLinks = [
  { path: '/', labelKey: 'overview', defaultLabel: 'Overview' },
  { path: '/market-intelligence', labelKey: 'marketIntelligence', defaultLabel: 'Market Intelligence' },
  { path: '/farmer', labelKey: 'farmerPortal', defaultLabel: 'Farmer Portal' },
  { path: '/buyer', labelKey: 'buyerRequirements', defaultLabel: 'Buyer Requirements' },
  { path: '/matches', labelKey: 'marketplace', defaultLabel: 'Marketplace' },
  { path: '/dashboard', labelKey: 'dashboard', defaultLabel: 'Dashboard' },
];

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = currentUser();
  const { language, setLanguage, t } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 12);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const [prevPath, setPrevPath] = useState(location.pathname);

  // Close menu on route transition
  if (prevPath !== location.pathname) {
    setPrevPath(location.pathname);
    setMenuOpen(false);
  }

  return (
    <header className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}>
      <div className="container navbar__inner">
        {/* Brand Identity */}
        <Link to="/" className="navbar__logo" aria-label="CropCycle Connect Home">
          <Brand />
        </Link>

        {/* Main Desktop Navigation */}
        <nav className="navbar__nav" role="navigation" aria-label="Main Navigation">
          {navLinks.map(({ path, labelKey, defaultLabel }) => {
            const isActive = location.pathname === path;
            const label = t(labelKey) || defaultLabel;
            return (
              <Link
                key={path}
                to={path}
                className={`navbar__link ${isActive ? 'navbar__link--active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Right CTA Actions */}
        <div className="navbar__actions">
          {/* Language Selector Dropdown (6 Supported Languages) */}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="navbar__lang-select"
            aria-label="Interface Language"
            title="Change language / भाषा बदलें"
            style={{
              padding: '4px 8px',
              fontSize: '0.8125rem',
              borderRadius: 'var(--radius-xs, 4px)',
              border: '1px solid var(--color-border, #E5E7EB)',
              background: '#FFFFFF',
              color: 'var(--color-forest, #1E3A2F)',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.nativeLabel}
              </option>
            ))}
          </select>

          {user && <span className="navbar__user-name">{user.name.split(' ')[0]}</span>}
          {user && <button type="button" className="navbar__link-subtle" onClick={() => { logout(); navigate('/welcome'); }}>Log out</button>}

          <Link to="/matches" className="navbar__link-subtle">
            Browse Supply
          </Link>
          <Link to="/farmer" className="btn btn-primary btn-sm">
            List Residue
          </Link>

          <button
            className="navbar__hamburger"
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span className={`bar-line ${menuOpen ? 'bar-line--top-open' : ''}`} />
            <span className={`bar-line ${menuOpen ? 'bar-line--mid-open' : ''}`} />
            <span className={`bar-line ${menuOpen ? 'bar-line--bot-open' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      <div className={`navbar__mobile ${menuOpen ? 'navbar__mobile--open' : ''}`}>
        <div className="container navbar__mobile-inner">
          <nav className="navbar__mobile-links">
            {navLinks.map(({ path, labelKey, defaultLabel }) => {
              const isActive = location.pathname === path;
              const label = t(labelKey) || defaultLabel;
              return (
                <Link
                  key={path}
                  to={path}
                  className={`navbar__mobile-link ${isActive ? 'navbar__mobile-link--active' : ''}`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="navbar__mobile-actions">
            <Link to="/farmer" className="btn btn-primary w-full">
              List Residue
            </Link>
            <Link to="/buyer" className="btn btn-secondary w-full">
              Register Buyer Demand
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
