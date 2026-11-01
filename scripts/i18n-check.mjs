import en from '../src/i18n/locales/en.js';
import hi from '../src/i18n/locales/hi.js';
import kn from '../src/i18n/locales/kn.js';
import te from '../src/i18n/locales/te.js';
import ta from '../src/i18n/locales/ta.js';
import ml from '../src/i18n/locales/ml.js';
import mr from '../src/i18n/locales/mr.js';
import pa from '../src/i18n/locales/pa.js';

const locales = { hi, kn, te, ta, ml, mr, pa };
const englishKeys = new Set(Object.keys(en));
let hasMissingKeys = false;

for (const [language, locale] of Object.entries(locales)) {
  const keys = new Set(Object.keys(locale));
  const missing = [...englishKeys].filter((key) => !keys.has(key));
  const extra = [...keys].filter((key) => !englishKeys.has(key));
  console.log(`${language}: missing [${missing.join(', ')}]; extra [${extra.join(', ')}]`);
  if (missing.length) hasMissingKeys = true;
}

if (hasMissingKeys) process.exitCode = 1;
