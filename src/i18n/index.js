import en from './locales/en.js';
import hi from './locales/hi.js';
import kn from './locales/kn.js';
import te from './locales/te.js';
import ta from './locales/ta.js';
import ml from './locales/ml.js';
import mr from './locales/mr.js';
import pa from './locales/pa.js';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' },
  { code: 'kn', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ' },
  { code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు' },
  { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்' },
  { code: 'ml', label: 'Malayalam', nativeLabel: 'മലയാളം' },
  { code: 'mr', label: 'Marathi', nativeLabel: 'मराठी' },
  { code: 'pa', label: 'Punjabi', nativeLabel: 'ਪੰਜਾਬੀ' },
];

export const TRANSLATIONS = { en, hi, kn, te, ta, ml, mr, pa };
