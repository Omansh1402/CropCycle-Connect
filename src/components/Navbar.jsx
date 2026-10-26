// src/components/Navbar.jsx
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navbar.css';

const navLinks = [
  { path: '/',          label: 'Home' },
  { path: '/farmer',   label: 'Farmer' },
  { path: '/buyer',    label: 'Buyer' },
  { path: '/matches',  label: 'Matches' },
  { path: '/dashboard',label: 'Dashboard' },
];

export default function Navbar() {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMenuOpen(false); }, [location]);

  return (
    <header className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}>
      <div className="container navbar__inner">
        {/* Logo */}
        <Link to="/" className="navbar__logo">
          <div className="logo-icon">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="16" fill="#2D6A4F"/>
              <path d="M16 6C16 6 8 12 8 18C8 22.4 11.6 26 16 26C20.4 26 24 22.4 24 18C24 12 16 6 16 6Z" fill="#52B788"/>
              <path d="M16 10C16 10 11 14.5 11 18.5C11 21.5 13.2 24 16 24" fill="#2D6A4F"/>
              <circle cx="16" cy="20" r="2" fill="#F9F4EF"/>
            </svg>
          </div>
          <div className="logo-text">
            <span className="logo-name">CropCycle</span>
            <span className="logo-sub">Connect</span>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="navbar__links" role="navigation" aria-label="Main navigation">
          {navLinks.map(({ path, label }) => (
            <Link
              key={path}
              to={path}
              className={`navbar__link ${location.pathname === path ? 'navbar__link--active' : ''}`}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* CTA */}
        <div className="navbar__actions">
          <Link to="/farmer" className="btn btn-primary btn-sm">
            List Residue
          </Link>
          <button
            className="navbar__hamburger"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span className={`bar ${menuOpen ? 'bar--open' : ''}`}/>
            <span className={`bar ${menuOpen ? 'bar--open' : ''}`}/>
            <span className={`bar ${menuOpen ? 'bar--open' : ''}`}/>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`navbar__mobile ${menuOpen ? 'navbar__mobile--open' : ''}`} aria-hidden={!menuOpen}>
        {navLinks.map(({ path, label }) => (
          <Link
            key={path}
            to={path}
            className={`navbar__mobile-link ${location.pathname === path ? 'active' : ''}`}
            onClick={() => setMenuOpen(false)}
          >
            {label}
          </Link>
        ))}
        <Link
          to="/farmer"
          className="btn btn-primary mt-md"
          style={{ alignSelf: 'flex-start' }}
          onClick={() => setMenuOpen(false)}
        >
          List Residue
        </Link>
      </div>
    </header>
  );
}
