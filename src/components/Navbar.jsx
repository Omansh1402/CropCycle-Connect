// src/components/Navbar.jsx
import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation, SUPPORTED_LANGUAGES } from '../lib/i18n';
import { currentUser, logout } from '../lib/auth';
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
          <div className="logo-symbol" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2C6.477 2 2 6.477 2 12C2 14.83 3.177 17.388 5.07 19.21L6.48 17.79C4.94 16.32 4 14.27 4 12C4 7.58 7.58 4 12 4C16.42 4 20 7.58 20 12C20 14.27 19.06 16.32 17.52 17.79L18.93 19.21C20.823 17.388 22 14.83 22 12C22 6.477 17.523 2 12 2Z"
                fill="currentColor"
              />
              <path
                d="M12 7C9.239 7 7 9.239 7 12C7 13.43 7.6 14.72 8.56 15.63L9.97 14.22C9.37 13.66 9 12.87 9 12C9 10.34 10.34 9 12 9C13.66 9 15 10.34 15 12C15 12.87 14.63 13.66 14.03 14.22L15.44 15.63C16.4 14.72 17 13.43 17 12C17 9.239 14.761 7 12 7Z"
                fill="currentColor"
                opacity="0.8"
              />
              <circle cx="12" cy="12" r="1.5" fill="currentColor" />
            </svg>
          </div>
          <div className="logo-text">
            <span className="logo-title">CropCycle</span>
            <span className="logo-badge">Connect</span>
          </div>
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
