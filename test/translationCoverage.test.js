// test/translationCoverage.test.js
// ─────────────────────────────────────────────────────────────────
// CropCycle Connect – Comprehensive Multilingual Coverage Test Suite
// Verifies 9 Indian Languages, 100% Key Parity, Zero Empty Values,
// Parameter Interpolation, and Domain Helper Mappers.
// ─────────────────────────────────────────────────────────────────
import assert from 'node:assert/strict';
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
} from '../src/lib/i18nData.js';

console.log('🧪 Starting CropCycle Connect Multilingual Coverage Test Suite...\n');

let passCount = 0;
function test(desc, fn) {
  try {
    fn();
    console.log(`  ✓ ${desc}`);
    passCount++;
  } catch (err) {
    console.error(`  ✗ ${desc}`);
    console.error(err);
    process.exit(1);
  }
}

// ── 1. Supported Languages Definition ──
console.log('Test Group 1: Supported Languages Standards');

test('Exactly 9 official Indian languages are defined with ISO 639-1 codes', () => {
  assert.equal(SUPPORTED_LANGUAGES.length, 9, 'Must have exactly 9 languages');
  const codes = SUPPORTED_LANGUAGES.map((l) => l.code);
  const expectedCodes = ['en', 'hi', 'bn', 'te', 'ta', 'mr', 'kn', 'gu', 'pa'];
  assert.deepEqual(codes, expectedCodes, 'Languages must match official list');
});

test('Marathi uses correct ISO code "mr" (not "mn")', () => {
  const marathi = SUPPORTED_LANGUAGES.find((l) => l.label === 'Marathi');
  assert.ok(marathi, 'Marathi must exist in supported languages');
  assert.equal(marathi.code, 'mr', 'Marathi code must be "mr"');
  assert.equal(marathi.nativeLabel, 'मराठी');
});

test('Bengali is properly registered with native script', () => {
  const bengali = SUPPORTED_LANGUAGES.find((l) => l.code === 'bn');
  assert.ok(bengali, 'Bengali must exist in supported languages');
  assert.equal(bengali.label, 'Bengali');
  assert.equal(bengali.nativeLabel, 'বাংলা');
});

// ── 2. Dictionary Completeness & 100% Parity ──
console.log('\nTest Group 2: Key Parity & Non-Empty Values');

test('English dictionary contains over 1,000 comprehensive keys', () => {
  const enKeys = Object.keys(TRANSLATIONS.en);
  assert.ok(enKeys.length >= 1000, `Expected at least 1,000 keys, got ${enKeys.length}`);
});

test('Every language has 100% key parity with English (zero missing keys)', () => {
  const enKeys = Object.keys(TRANSLATIONS.en);
  SUPPORTED_LANGUAGES.forEach((lang) => {
    const langDict = TRANSLATIONS[lang.code];
    assert.ok(langDict, `Dictionary for ${lang.code} must exist`);
    const langKeys = Object.keys(langDict);
    const missing = enKeys.filter((k) => !langDict[k]);
    assert.equal(
      missing.length,
      0,
      `Language ${lang.code} is missing ${missing.length} keys: ${missing.slice(0, 5).join(', ')}`
    );
    assert.equal(
      langKeys.length,
      enKeys.length,
      `Key count mismatch for ${lang.code}: ${langKeys.length} vs ${enKeys.length}`
    );
  });
});

test('Zero empty or whitespace-only translation strings in any language', () => {
  SUPPORTED_LANGUAGES.forEach((lang) => {
    const langDict = TRANSLATIONS[lang.code];
    Object.entries(langDict).forEach(([key, val]) => {
      assert.ok(
        typeof val === 'string' && val.trim().length > 0,
        `Empty or invalid translation for key "${key}" in language "${lang.code}"`
      );
    });
  });
});

// ── 3. Bengali Verification ──
console.log('\nTest Group 3: Bengali Content & Authentic Script');

test('Bengali page titles and key labels contain authentic Bengali Unicode script', () => {
  const bn = TRANSLATIONS.bn;
  // Check for presence of Bengali Unicode range: [\u0980-\u09FF]
  const bengaliCharRegex = /[\u0980-\u09FF]/;

  assert.ok(bengaliCharRegex.test(bn.brandTagline), 'Bengali brandTagline must have Bengali characters');
  assert.ok(bengaliCharRegex.test(bn.marketIntelligenceTitle), 'Bengali marketIntelligenceTitle must have Bengali characters');
  assert.ok(bengaliCharRegex.test(bn.nationalAgroBiomassIntelligence), 'Bengali nationalAgroBiomassIntelligence must have Bengali characters');
  assert.ok(bengaliCharRegex.test(bn.smartTransportationCalculator), 'Bengali smartTransportationCalculator must have Bengali characters');
  assert.ok(bengaliCharRegex.test(bn.localDemoProfile), 'Bengali localDemoProfile must have Bengali characters');
  assert.ok(bengaliCharRegex.test(bn.farmerPortal), 'Bengali farmerPortal must have Bengali characters');
  assert.ok(bengaliCharRegex.test(bn.buyerRequirements), 'Bengali buyerRequirements must have Bengali characters');
});

// ── 4. Parameter Interpolation ──
console.log('\nTest Group 4: Dynamic Parameter Interpolation');

test('Interpolation helper replaces {count}, {distance}, {rate}, etc. in all languages', () => {
  function interpolate(template, params = {}) {
    if (!template) return '';
    return Object.entries(params).reduce((str, [k, v]) => {
      return str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }, template);
  }

  const enTrip = interpolate(TRANSLATIONS.en.colAllTrips, { count: 3 });
  assert.equal(enTrip, 'All Trips (3)');

  const bnTrip = interpolate(TRANSLATIONS.bn.colAllTrips, { count: 3 });
  assert.ok(bnTrip.includes('3'), 'Bengali trip string must include interpolated count');

  const hiDist = interpolate(TRANSLATIONS.hi.distanceChargeRow, { distance: 450, rate: 35 });
  assert.ok(hiDist.includes('450') && hiDist.includes('35'), 'Hindi distance row must include distance and rate');
});

// ── 5. Domain Translation Helpers ──
console.log('\nTest Group 5: Domain Translation Helpers (Crops, Residues, Vehicles, Statuses)');

test('tCrop correctly maps canonical crop names into regional languages', () => {
  assert.equal(tCrop('Paddy', 'en'), 'Paddy');
  assert.equal(tCrop('Paddy', 'bn'), 'ধান');
  assert.equal(tCrop('Paddy', 'hi'), 'धान');
  assert.equal(tCrop('Cotton', 'ta'), 'பருத்தி');
  assert.equal(tCrop('Wheat', 'mr'), 'गहू');
});

test('tResidue correctly translates crop residue types into regional languages', () => {
  assert.equal(tResidue('Paddy Straw', 'en'), 'Paddy Straw');
  assert.equal(tResidue('Paddy Straw', 'bn'), 'ধানের খড়');
  assert.equal(tResidue('Paddy Straw', 'hi'), 'धान की पराली');
  assert.equal(tResidue('Paddy Straw', 'te'), 'వరి గడ్డి');
  assert.equal(tResidue('Sugarcane Bagasse', 'ta'), 'கரும்பு சக்கை');
});

test('tPurpose translates industrial buyer purposes into regional languages', () => {
  assert.equal(tPurpose('Biomass Power Generation', 'en'), 'Biomass Power Generation');
  assert.equal(tPurpose('Biomass Power Generation', 'bn'), 'বায়োমাস বিদ্যুৎ উৎপাদন');
  assert.equal(tPurpose('Biomass Power Generation', 'hi'), 'बायोमास विद्युत उत्पादन');
});

test('tVehicle translates vehicle types into regional languages', () => {
  assert.ok(tVehicle('heavy_truck', 'en').includes('Heavy'));
  assert.ok(tVehicle('heavy_truck', 'bn').includes('ট্রাক'));
  assert.ok(tVehicle('heavy_truck', 'hi').includes('ट्रक'));
});

test('tStatus translates marketplace entity statuses into regional languages', () => {
  assert.equal(tStatus('active', 'en'), 'Active');
  assert.equal(tStatus('active', 'bn'), 'সক্রিয়');
  assert.equal(tStatus('active', 'hi'), 'सक्रिय');
  assert.equal(tStatus('matched', 'ta'), 'பொருந்தியது');
});

console.log(`\n🎉 All ${passCount} multilingual coverage tests passed successfully!`);
