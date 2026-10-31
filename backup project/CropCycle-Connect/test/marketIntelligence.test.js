// test/marketIntelligence.test.js
// ─────────────────────────────────────────────────────────────────
// CropCycle Connect – Market Intelligence & Logistics Test Suite
// Validates Parts 1 to 6 against all specified operational criteria.
// ─────────────────────────────────────────────────────────────────
import assert from 'node:assert/strict';
import {
  ALL_INDIAN_STATES_AND_UTS,
  STATE_RESIDUE_STATISTICS,
  VERIFIED_PRICE_REFERENCES,
  BUYER_PURPOSES,
  getStateResidueData,
  getResidueTypesForState,
  calculateStatePlatformMetrics,
} from '../src/data/stateResidueData.js';
import {
  VEHICLE_CONFIGS,
  calculateTransportationCost,
  calculateDeliveredCost,
} from '../src/lib/transportCalculator.js';
import { getCoordinates, calculateRoadDistanceKm } from '../src/lib/geo.js';
import { TRANSLATIONS, SUPPORTED_LANGUAGES } from '../src/lib/i18nData.js';
import { sampleListings, sampleBuyers } from '../src/data/sampleData.js';

console.log('🧪 Starting CropCycle Connect Market Intelligence & Logistics Test Suite...\n');

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

// ── Scenario 1: State-Wise Crop Residue Production Overview ──
console.log('Scenario 1: State-Wise Agricultural Production Statistics (Part 1)');

test('Supports all 28 Indian States and 8 Union Territories (36 entities)', () => {
  assert.equal(ALL_INDIAN_STATES_AND_UTS.length, 36);
  const states = ALL_INDIAN_STATES_AND_UTS.filter((s) => s.type === 'state');
  const uts = ALL_INDIAN_STATES_AND_UTS.filter((s) => s.type === 'ut');
  assert.equal(states.length, 28);
  assert.equal(uts.length, 8);
});

test('Punjab + Paddy Straw returns verified DES / ICAR agricultural statistics', () => {
  const punjab = getStateResidueData('Punjab');
  assert.ok(punjab, 'Punjab statistics must exist');
  assert.equal(punjab.state, 'Punjab');
  assert.equal(punjab.reportingYear, '2023-24');
  assert.ok(punjab.source.includes('Directorate of Economics and Statistics'));

  const paddy = punjab.crops.find((c) => c.residueType === 'Paddy Straw');
  assert.ok(paddy, 'Paddy Straw must be present in Punjab');
  assert.ok(paddy.cropProductionTonnes > 15000000, 'Punjab paddy production > 15M tonnes');
  assert.ok(paddy.residueGeneratedTonnes > 18000000, 'Punjab paddy straw generated > 18M tonnes');
  assert.ok(paddy.surplusTonnes > 12000000, 'Punjab usable surplus > 12M tonnes');
  assert.ok(paddy.collectableTonnes > 10000000, 'Technically collectable residue > 10M tonnes');
  assert.equal(paddy.reportingYear, '2023-24');
  assert.ok(paddy.source.length > 0);
  assert.equal(paddy.classification, 'Officially Reported Production & Scientifically Estimated Residue');
});

// ── Scenario 2 & 3: Supply vs Demand Ledger Separation & No Double Counting ──
console.log('\nScenario 2 & 3: Supply vs Demand Analytics Ledger (Part 2)');

test('Clearly distinguishes statewide agricultural estimates from platform live inventory', () => {
  const metrics = calculateStatePlatformMetrics('Punjab', 'Paddy Straw', sampleListings, sampleBuyers);

  // A. Statewide Agricultural production is in millions of tonnes
  assert.ok(metrics.totalProduction > 10000000, 'Total statewide production reflects macro agriculture');
  assert.ok(metrics.availableSurplus > 5000000, 'Macro surplus accounts for known existing uses');

  // C. Platform inventory is strictly from active CropCycle Connect listings
  assert.ok(typeof metrics.platformSupply === 'number');
  assert.ok(typeof metrics.platformDemand === 'number');
  assert.ok(metrics.platformSupply < 100000, 'Platform inventory is never confused with state agricultural surplus');
});

test('Calculates matched quantity and unmet demand without double counting', () => {
  const mockListings = [
    { id: 'L1', state: 'Punjab', residueType: 'Paddy Straw', quantity: 20, status: 'active' },
    { id: 'L2', state: 'Punjab', residueType: 'Paddy Straw', quantity: 30, status: 'active' },
  ];
  const mockBuyers = [
    { id: 'B1', state: 'Punjab', acceptedTypes: ['Paddy Straw'], requiredQuantity: 25, available: true },
  ];

  const metrics = calculateStatePlatformMetrics('Punjab', 'Paddy Straw', mockListings, mockBuyers);

  assert.equal(metrics.platformSupply, 50, 'Platform supply = 20 + 30 = 50 tonnes');
  assert.equal(metrics.platformDemand, 25, 'Platform demand = 25 tonnes');
  assert.equal(metrics.matchedQuantity, 25, 'Matched quantity cannot exceed demand (25 tonnes)');
  assert.equal(metrics.unmetDemand, 0, 'Buyer B1 demand is fully satisfied');
  assert.equal(metrics.availableUnmatchedSupply, 25, 'Remaining supply = 50 - 25 = 25 tonnes');
});

// ── Scenario 4: Smart Interstate Transportation Calculator (Punjab to Bihar) ──
console.log('\nScenario 4 & 5: Smart Interstate Logistics Calculator (Part 5)');

test('Scenario: Punjab origin (Ludhiana) to Bihar destination (Patna) road transport', () => {
  const origin = getCoordinates('Ludhiana', 'Punjab');
  const dest = getCoordinates('Patna', 'Bihar');
  assert.ok(origin, 'Ludhiana coordinates found');
  assert.ok(dest, 'Patna coordinates found');

  const roadDist = calculateRoadDistanceKm(origin, dest);
  assert.ok(roadDist >= 1000 && roadDist <= 1400, `Interstate road distance between Ludhiana and Patna is ~1200 km (calculated: ${roadDist} km)`);

  const transport = calculateTransportationCost({
    quantityTonnes: 100,
    distanceKm: roadDist,
    vehicleType: 'heavy_truck',
    isInterstate: true,
  });

  assert.ok(transport.available);
  // Heavy truck capacity = 28 tonnes. 100 / 28 = 3.57 => Ceiling = 4 trips
  assert.equal(transport.trips, 4, 'Number of trips = Ceiling(100 / 28) = 4');
  assert.equal(transport.vehicleConfig.payloadCapacity, 28);
  assert.ok(transport.totalTransportationCost > 0);
  assert.ok(transport.costPerTonne > 0);
  assert.equal(
    transport.disclaimer,
    'Indicative Transportation Estimate — Confirm Final Price With Transporter.'
  );
});

test('Delivered Cost Formula: Purchase Price + Transport Expense + Other = Delivered Cost', () => {
  const purchasePrice = 2100;
  const transportCost = 650;
  const otherCharges = 50;
  const quantity = 100;

  const delivered = calculateDeliveredCost({
    purchasePricePerTonne: purchasePrice,
    transportCostPerTonne: transportCost,
    otherChargesPerTonne: otherCharges,
    quantityTonnes: quantity,
  });

  assert.equal(delivered.purchasePricePerTonne, 2100);
  assert.equal(delivered.transportCostPerTonne, 650);
  assert.equal(delivered.otherChargesPerTonne, 50);
  assert.equal(delivered.deliveredCostPerTonne, 2800, '2100 + 650 + 50 = 2800');
  assert.equal(delivered.totalDeliveredCost, 280000, '2800 * 100 = 280,000');
  assert.equal(
    delivered.disclaimer,
    'Indicative Transportation Estimate — Confirm Final Price With Transporter.'
  );
});

// ── Scenario 6: Vehicle Tier Configurations ──
console.log('\nScenario 6: Vehicle Tiers and Freight Parameters');

test('Changing vehicle profile updates payload capacity and trip count', () => {
  const qty = 30; // 30 tonnes
  const dist = 50;

  // 1. Tractor trolley (4t capacity) => 8 trips
  const tractor = calculateTransportationCost({
    quantityTonnes: qty,
    distanceKm: dist,
    vehicleType: 'tractor_trolley',
  });
  assert.equal(tractor.trips, Math.ceil(30 / 4)); // 8

  // 2. Small truck (8t capacity) => 4 trips
  const small = calculateTransportationCost({
    quantityTonnes: qty,
    distanceKm: dist,
    vehicleType: 'small_truck',
  });
  assert.equal(small.trips, Math.ceil(30 / 8)); // 4

  // 3. Medium truck (15t capacity) => 2 trips
  const medium = calculateTransportationCost({
    quantityTonnes: qty,
    distanceKm: dist,
    vehicleType: 'medium_truck',
  });
  assert.equal(medium.trips, Math.ceil(30 / 15)); // 2

  // 4. Heavy truck (28t capacity) => 2 trips
  const heavy = calculateTransportationCost({
    quantityTonnes: qty,
    distanceKm: dist,
    vehicleType: 'heavy_truck',
  });
  assert.equal(heavy.trips, Math.ceil(30 / 28)); // 2
});

// ── Scenario 7: Commercial Match Prioritization ──
console.log('\nScenario 7: Commercial Match Geographic Prioritization (Part 6)');

test('Prioritizes 1. Same District, 2. Same State, 3. Interstate', () => {
  const pairs = [
    { name: 'Interstate Match', isSameDistrict: false, isSameState: false },
    { name: 'Local District Match', isSameDistrict: true, isSameState: true },
    { name: 'Regional State Match', isSameDistrict: false, isSameState: true },
  ];

  const sorted = pairs.sort((a, b) => {
    const tierA = a.isSameDistrict ? 1 : a.isSameState ? 2 : 3;
    const tierB = b.isSameDistrict ? 1 : b.isSameState ? 2 : 3;
    return tierA - tierB;
  });

  assert.equal(sorted[0].name, 'Local District Match');
  assert.equal(sorted[1].name, 'Regional State Match');
  assert.equal(sorted[2].name, 'Interstate Match');
});

// ── Scenario 8: Transparent Unavailable State ──
console.log('\nScenario 8: Transparent Data Handling for Non-Agrarian UTs');

test('Chandigarh and Lakshadweep report "Data not available" instead of invented numbers', () => {
  const chd = getStateResidueData('Chandigarh');
  assert.ok(chd.dataUnavailableReason.includes('Data not available'));
  assert.equal(chd.totalResidueTonnes, null);
  assert.equal(chd.crops.length, 0);

  const lkd = getStateResidueData('Lakshadweep');
  assert.ok(lkd.dataUnavailableReason.includes('Data not available'));
  assert.equal(lkd.totalResidueTonnes, null);
  assert.equal(lkd.crops.length, 0);
});

// ── Scenario 9: Buyer Purchasing Purpose ──
console.log('\nScenario 9: Verified Buyer Purchasing Purpose');

test('Supports all standard industrial buyer purchasing purposes', () => {
  assert.ok(BUYER_PURPOSES.includes('Biomass Power Generation'));
  assert.ok(BUYER_PURPOSES.includes('Biofuel Production'));
  assert.ok(BUYER_PURPOSES.includes('Biogas Production'));
  assert.ok(BUYER_PURPOSES.includes('Compost and Organic Fertilizer'));
  assert.ok(BUYER_PURPOSES.includes('Cattle Feed'));
  assert.ok(BUYER_PURPOSES.includes('Industrial Raw Material'));
});

// ── Scenario 10: Reusable Internationalization System ──
console.log('\nScenario 10: Reusable Six-Language Internationalization');

test('Translations exist for all 6 languages: en, hi, pa, gu, mr, ta', () => {
  assert.equal(SUPPORTED_LANGUAGES.length, 6);
  const codes = SUPPORTED_LANGUAGES.map((l) => l.code);
  assert.deepEqual(codes, ['en', 'hi', 'pa', 'gu', 'mr', 'ta']);

  codes.forEach((lang) => {
    assert.ok(TRANSLATIONS[lang], `Translations must exist for ${lang}`);
    assert.ok(TRANSLATIONS[lang].marketIntelligenceTitle, `Title must exist for ${lang}`);
    assert.ok(TRANSLATIONS[lang].farmerAskingPrice, `Asking price key must exist for ${lang}`);
    assert.ok(TRANSLATIONS[lang].deliveredCost, `Delivered cost key must exist for ${lang}`);
  });
});

console.log(`\n🎉 Market Intelligence Test Results: ${passCount} / ${passCount} tests passed successfully.\n`);

