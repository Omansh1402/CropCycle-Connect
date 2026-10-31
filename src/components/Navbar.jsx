// src/components/Navbar.jsx
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/useAuth';
import LanguageSelector from './LanguageSelector';
import './Navbar.css';

const navItems = [
  { path: '/', key: 'overview', defaultLabel: 'Overview' },
  { path: '/farmer', key: 'farmer', defaultLabel: 'Farmer Portal' },
  { path: '/buyer', key: 'buyer', defaultLabel: 'Buyer Requirements' },
  { path: '/matches', key: 'matches', defaultLabel: 'Marketplace' },
  { path: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard' },
  { path: '/profile', key: 'profile', defaultLabel: 'Profile' },
];

function getInitials(name) {
  if (!name) return 'CC';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Navbar() {
  const { t } = useTranslation();
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
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

  const displayName = profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || t('nav.user', 'User');
  const userInitials = getInitials(profile?.full_name || user?.email);

  return (
    <header className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}>
      <div className="container navbar__inner">
        {/* Brand Identity */}
        <Link to="/" className="navbar__logo" aria-label={t('nav.homeAria', 'CropCycle Connect Home')}>
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
            <span className="logo-title">{t('nav.brandTitle', 'CropCycle')}</span>
            <span className="logo-badge">{t('nav.brandBadge', 'Connect')}</span>
          </div>
        </Link>

        {/* Main Desktop Navigation */}
        <nav className="navbar__nav" role="navigation" aria-label={t('nav.mainNavAria', 'Main Navigation')}>
          {navItems.map(({ path, key, defaultLabel }) => {
            const isActive = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={`navbar__link ${isActive ? 'navbar__link--active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
              >
                {t(`nav.${key}`, defaultLabel)}
              </Link>
            );
          })}
        </nav>

        {/* Right CTA Actions */}
        <div className="navbar__actions">
          {/* Language Selector Dropdown */}
          <LanguageSelector variant="desktop" />

          {user ? (
            /* Logged In User Chip */
            <Link
              to="/profile"
              className={`navbar__user-chip ${location.pathname === '/profile' ? 'navbar__user-chip--active' : ''}`}
              title={t('nav.signedInAs', { email: user.email, defaultValue: `Signed in as ${user.email} (View Profile)` })}
            >
              <div className="navbar__user-avatar">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="navbar__user-avatar-img" />
                ) : (
                  <span className="navbar__user-initials">{userInitials}</span>
                )}
              </div>
              <span className="navbar__user-name">{displayName}</span>
            </Link>
          ) : (
            /* Logged Out: Clean Sign In Option */
            <Link
              to="/login"
              className={`navbar__link-subtle navbar__auth-link ${location.pathname === '/login' ? 'navbar__auth-link--active' : ''}`}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>{t('nav.signIn', 'Sign In')}</span>
            </Link>
          )}

          <Link to="/farmer" className="btn btn-primary btn-sm">
            {t('nav.listResidue', 'List Residue')}
          </Link>

          <button
            className="navbar__hamburger"
            aria-label={t('nav.toggleMenu', 'Toggle navigation menu')}
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
          {/* User Status Bar in Mobile Menu */}
          {user ? (
            <div className="navbar__mobile-user-status">
              <Link to="/profile" className="mobile-user-info">
                <div className="navbar__user-avatar navbar__user-avatar--mobile">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="navbar__user-avatar-img" />
                  ) : (
                    <span className="navbar__user-initials">{userInitials}</span>
                  )}
                </div>
                <div className="mobile-user-details">
                  <div className="mobile-user-name">{profile?.full_name || displayName}</div>
                  <div className="mobile-user-role">
                    {(profile?.role || 'farmer') === 'buyer'
                      ? t('nav.buyerRole', 'Biomass Buyer')
                      : t('nav.farmerRole', 'Agricultural Producer')}
                  </div>
                </div>
              </Link>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={signOut}
              >
                {t('nav.signOut', 'Sign Out')}
              </button>
            </div>
          ) : (
            <div className="navbar__mobile-auth-prompt">
              <Link to="/login" className="btn btn-secondary w-full">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span>{t('nav.signInOrRegister', 'Sign In / Create Account')}</span>
              </Link>
            </div>
          )}

          {/* Mobile Language Selector */}
          <LanguageSelector variant="mobile" />

          <nav className="navbar__mobile-links">
            {navItems.map(({ path, key, defaultLabel }) => {
              const isActive = location.pathname === path;
              return (
                <Link
                  key={path}
                  to={path}
                  className={`navbar__mobile-link ${isActive ? 'navbar__mobile-link--active' : ''}`}
                >
                  {t(`nav.${key}`, defaultLabel)}
                </Link>
              );
            })}
          </nav>
          <div className="navbar__mobile-actions">
            <Link to="/farmer" className="btn btn-primary w-full">
              {t('nav.listResidue', 'List Residue')}
            </Link>
            <Link to="/buyer" className="btn btn-secondary w-full">
              {t('nav.registerDemand', 'Register Buyer Demand')}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
