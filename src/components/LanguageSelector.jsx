// src/components/LanguageSelector.jsx
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { LANGUAGES } from '../i18n/languages';
import './LanguageSelector.css';

export default function LanguageSelector({ variant = 'desktop' }) {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentLang = LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0];

  const handleSelectLanguage = (code) => {
    i18n.changeLanguage(code);
    setIsOpen(false);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (variant === 'mobile') {
    return (
      <div className="language-selector language-selector--mobile">
        <div className="language-selector__label">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          <span>{t('nav.language', 'Language')}</span>
        </div>
        <div className="language-selector__mobile-grid" role="group" aria-label={t('nav.changeLanguage', 'Select language')}>
          {LANGUAGES.map((lang) => {
            const isSelected = lang.code === currentLang.code;
            return (
              <button
                key={lang.code}
                type="button"
                className={`lang-pill ${isSelected ? 'lang-pill--active' : ''}`}
                onClick={() => handleSelectLanguage(lang.code)}
                aria-pressed={isSelected}
              >
                <span className="lang-pill__native">{lang.nativeName}</span>
                {lang.code !== 'en' && <span className="lang-pill__name">({lang.name})</span>}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="language-selector language-selector--desktop" ref={dropdownRef}>
      <button
        type="button"
        className={`language-selector__toggle ${isOpen ? 'language-selector__toggle--open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={t('nav.changeLanguage', 'Select language')}
        title={`${t('nav.language', 'Language')}: ${currentLang.nativeName}`}
      >
        <svg className="lang-globe-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
        <span className="lang-current-text">{currentLang.nativeName}</span>
        <svg className={`lang-chevron-icon ${isOpen ? 'lang-chevron-icon--rotated' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <ul className="language-selector__menu" role="listbox" aria-label={t('nav.language', 'Language')}>
          {LANGUAGES.map((lang) => {
            const isSelected = lang.code === currentLang.code;
            return (
              <li
                key={lang.code}
                role="option"
                aria-selected={isSelected}
                className={`language-selector__item ${isSelected ? 'language-selector__item--selected' : ''}`}
                onClick={() => handleSelectLanguage(lang.code)}
              >
                <div className="lang-item-content">
                  <span className="lang-native-name">{lang.nativeName}</span>
                  {lang.code !== 'en' && <span className="lang-english-sub">{lang.name}</span>}
                </div>
                {isSelected && (
                  <svg className="lang-check-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

