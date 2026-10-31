// src/i18n/i18n.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { DEFAULT_LANGUAGE, STORAGE_KEY } from './languages';

import en from './locales/en.json';
import hi from './locales/hi.json';
import kn from './locales/kn.json';
import te from './locales/te.json';
import ta from './locales/ta.json';
import mr from './locales/mr.json';

const resources = {
  en: { translation: en },
  hi: { translation: hi },
  kn: { translation: kn },
  te: { translation: te },
  ta: { translation: ta },
  mr: { translation: mr },
};

function getSavedLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && resources[saved]) {
      return saved;
    }
  } catch {
    // localStorage might not be available or restricted
  }
  return DEFAULT_LANGUAGE;
}

const initialLang = getSavedLanguage();

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLang,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: ['en', 'hi', 'kn', 'te', 'ta', 'mr'],
    interpolation: {
      escapeValue: false, // React already escapes by default
    },
    react: {
      useSuspense: false,
    },
  });

// Keep html lang attribute and localStorage in sync
if (typeof document !== 'undefined') {
  document.documentElement.lang = initialLang;
}

i18n.on('languageChanged', (lng) => {
  try {
    localStorage.setItem(STORAGE_KEY, lng);
  } catch {
    // ignore storage errors
  }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lng;
  }
});

export default i18n;

