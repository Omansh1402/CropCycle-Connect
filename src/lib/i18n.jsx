// src/lib/i18n.jsx
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { SUPPORTED_LANGUAGES, TRANSLATIONS } from './i18nData.js';

export { SUPPORTED_LANGUAGES, TRANSLATIONS };

const warnedMissingKeys = new Set();

const LanguageContext = createContext({
  language: 'en',
  setLanguage: () => {},
  t: (key) => key,
  supportedLanguages: SUPPORTED_LANGUAGES,
});

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      const saved = localStorage.getItem('cropcycle_lang');
      if (saved && SUPPORTED_LANGUAGES.some((l) => l.code === saved)) {
        return saved;
      }
    } catch {
      // LocalStorage unavailable in SSR or sandbox
    }
    return 'en';
  });

  const setLanguage = useCallback((langCode) => {
    if (SUPPORTED_LANGUAGES.some((l) => l.code === langCode)) {
      setLanguageState(langCode);
      try {
        localStorage.setItem('cropcycle_lang', langCode);
      } catch {
        // Safe catch
      }
    }
  }, []);

  const t = useCallback((key, vars) => {
    const langDict = TRANSLATIONS[language] || TRANSLATIONS.en;
    const template = langDict[key] ?? TRANSLATIONS.en[key] ?? key;
    if (!Object.hasOwn(TRANSLATIONS.en, key) && import.meta.env.DEV) {
      if (!warnedMissingKeys.has(key)) {
        warnedMissingKeys.add(key);
        console.warn(`[i18n] Missing English translation for key "${key}"`);
      }
    }
    return String(template).replace(/\{([^{}]+)\}/g, (match, name) => (
      vars && Object.hasOwn(vars, name) ? String(vars[name]) : match
    ));
  }, [language]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo(() => ({
    language,
    setLanguage,
    t,
    supportedLanguages: SUPPORTED_LANGUAGES,
  }), [language, setLanguage, t]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  return useContext(LanguageContext);
}
