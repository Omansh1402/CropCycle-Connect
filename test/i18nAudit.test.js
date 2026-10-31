// test/i18nAudit.test.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const localesDir = path.resolve(__dirname, '../src/i18n/locales');

const LANGUAGES = ['en', 'hi', 'kn', 'te', 'ta', 'mr'];

console.log('🌐 Starting CropCycle Connect Multilingual Coverage Audit...\n');

// 1. Load all locale files
const dictionaries = {};
LANGUAGES.forEach((lang) => {
  const filePath = path.join(localesDir, `${lang}.json`);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Missing locale dictionary: ${lang}.json`);
    process.exit(1);
  }
  dictionaries[lang] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
});

// Helper to flatten nested keys
function flattenKeys(obj, prefix = '') {
  let keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys = keys.concat(flattenKeys(v, fullKey));
    } else {
      keys.push({ key: fullKey, value: v });
    }
  }
  return keys;
}

const enFlat = flattenKeys(dictionaries.en);
console.log(`✓ Total base keys defined in English dictionary: ${enFlat.length}`);

let totalErrors = 0;

// Verify every language has all English keys and no empty strings
LANGUAGES.forEach((lang) => {
  if (lang === 'en') return;
  const flat = flattenKeys(dictionaries[lang]);
  const langKeyMap = new Map(flat.map((f) => [f.key, f.value]));

  const missing = [];
  const empty = [];

  enFlat.forEach(({ key }) => {
    if (!langKeyMap.has(key)) {
      missing.push(key);
    } else {
      const val = langKeyMap.get(key);
      if (typeof val === 'string' && val.trim() === '') {
        empty.push(key);
      }
    }
  });

  if (missing.length === 0 && empty.length === 0) {
    console.log(`✓ Language [${lang}] has 100% key parity (${flat.length} keys) with 0 empty values.`);
  } else {
    console.error(`❌ Language [${lang}] failed audit:`);
    if (missing.length > 0) {
      console.error(`   - Missing ${missing.length} keys:`, missing.slice(0, 10));
    }
    if (empty.length > 0) {
      console.error(`   - Empty ${empty.length} keys:`, empty.slice(0, 10));
    }
    totalErrors += missing.length + empty.length;
  }
});

// Verify component integration
const criticalFiles = [
  'src/components/Navbar.jsx',
  'src/components/Footer.jsx',
  'src/components/BuyerCard.jsx',
  'src/components/RouteMap.jsx',
  'src/components/DbStatus.jsx',
  'src/pages/Home.jsx',
  'src/pages/Farmer.jsx',
  'src/pages/Buyer.jsx',
  'src/pages/Matches.jsx',
  'src/pages/MatchDetails.jsx',
  'src/pages/Dashboard.jsx',
  'src/pages/Profile.jsx',
  'src/pages/Auth.jsx',
];

console.log('\n🔍 Verifying useTranslation integration across critical files...');
criticalFiles.forEach((relPath) => {
  const fullPath = path.resolve(__dirname, '..', relPath);
  const content = fs.readFileSync(fullPath, 'utf8');
  const hasUseTranslation = content.includes('useTranslation');
  if (hasUseTranslation) {
    console.log(`✓ ${relPath} integrates useTranslation()`);
  } else {
    console.error(`❌ ${relPath} is MISSING useTranslation()`);
    totalErrors++;
  }
});

if (totalErrors === 0) {
  console.log('\n🎉 ALL MULTILINGUAL AUDIT CHECKS PASSED PERFECTLY!\n');
  process.exit(0);
} else {
  console.error(`\n❌ Multilingual audit failed with ${totalErrors} issue(s).\n`);
  process.exit(1);
}

