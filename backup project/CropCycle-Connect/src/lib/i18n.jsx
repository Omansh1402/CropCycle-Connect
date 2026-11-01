// src/lib/i18n.jsx
/* oxlint-disable react/only-export-components */
/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';
import {
  SUPPORTED_LANGUAGES,
  TRANSLATIONS,
  CROP_TRANSLATIONS,
  RESIDUE_TRANSLATIONS,
  PURPOSE_TRANSLATIONS,
  VEHICLE_TRANSLATIONS,
  DELIVERY_TRANSLATIONS,
  STATUS_TRANSLATIONS,
  INDUSTRY_TRANSLATIONS,
  tCrop,
  tResidue,
  tPurpose,
  tVehicle,
  tDelivery,
  tStatus,
  tIndustry,
} from './i18nData.js';

export {
  SUPPORTED_LANGUAGES,
  TRANSLATIONS,
  CROP_TRANSLATIONS,
  RESIDUE_TRANSLATIONS,
  PURPOSE_TRANSLATIONS,
  VEHICLE_TRANSLATIONS,
  DELIVERY_TRANSLATIONS,
  STATUS_TRANSLATIONS,
  INDUSTRY_TRANSLATIONS,
  tCrop,
  tResidue,
  tPurpose,
  tVehicle,
  tDelivery,
  tStatus,
  tIndustry,
};

const LanguageContext = createContext({
  language: 'en',
  setLanguage: () => {},
  t: (key) => key,
  supportedLanguages: SUPPORTED_LANGUAGES,
  tCrop: (c) => c,
  tResidue: (r) => r,
  tPurpose: (p) => p,
  tVehicle: (v) => v,
  tDelivery: (d) => d,
  tStatus: (s) => s,
  tIndustry: (i) => i,
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

  useEffect(() => {
    try {
      if (typeof document !== 'undefined') {
        document.documentElement.lang = language;
      }
    } catch {
      // Safe catch
    }
  }, [language]);

  const setLanguage = (langCode) => {
    if (SUPPORTED_LANGUAGES.some((l) => l.code === langCode)) {
      setLanguageState(langCode);
      try {
        localStorage.setItem('cropcycle_lang', langCode);
      } catch {
        // Safe catch
      }
    }
  };

  const t = (key, params) => {
    if (!key) return '';
    const langDict = TRANSLATIONS[language] || TRANSLATIONS.en;
    let str = (langDict && langDict[key]) ?? (TRANSLATIONS.en && TRANSLATIONS.en[key]) ?? key;
    if (params && typeof params === 'object' && typeof str === 'string') {
      Object.keys(params).forEach((paramKey) => {
        str = str.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), params[paramKey]);
      });
    }
    return str;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        supportedLanguages: SUPPORTED_LANGUAGES,
        tCrop: (c) => tCrop(c, language),
        tResidue: (r) => tResidue(r, language),
        tPurpose: (p) => tPurpose(p, language),
        tVehicle: (v) => tVehicle(v, language),
        tDelivery: (d) => tDelivery(d, language),
        tStatus: (s) => tStatus(s, language),
        tIndustry: (i) => tIndustry(i, language),
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  return useContext(LanguageContext);
}
