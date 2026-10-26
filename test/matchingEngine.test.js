// test/matchingEngine.test.js
import assert from 'node:assert/strict';
import {
  calculateQuantityFit,
  calculateProximityFit,
  calculateCapacityFit,
  calculateUseCaseFit,
  checkCompatibility,
  scoreMatch,
  matchListingWithBuyers,
  MATCH_WEIGHTS,
} from '../src/lib/matchingEngine.js';
import { sampleListings, sampleBuyers } from '../src/data/sampleData.js';

console.log('🧪 Starting CropCycle Connect Smart Matching Engine Test Suite...\n');

let testsPassed = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

// ─── 1. Compatibility Tests (Step 1) ──────────────────────────────
console.log('Group 1: Eligibility & Compatibility Checks (Step 1)');

test('Excludes buyers who do not accept the residue type', () => {
  const listing = { residueType: 'Cotton Stalks', quantity: 10, location: 'Anand, Gujarat' };
  const buyer = {
    orgName: 'Mushroom Farm',
    acceptedTypes: ['Paddy Straw', 'Wheat Straw'],
    available: true,
    requiredQuantity: 10,
  };
  const res = checkCompatibility(listing, buyer);
  assert.equal(res.compatible, false);
  assert.match(res.reasons[0], /not accepted by this buyer/i);
});

test('Excludes buyers who are not currently accepting residue (on hold)', () => {
  const listing = { residueType: 'Paddy Straw', quantity: 10, location: 'Anand, Gujarat' };
  const buyer = {
    orgName: 'Closed Plant',
    acceptedTypes: ['Paddy Straw'],
    available: false,
    requiredQuantity: 10,
  };
  const res = checkCompatibility(listing, buyer);
  assert.equal(res.compatible, false);
  assert.match(res.reasons[0], /currently on hold/i);
});

test('Excludes buyers with availability_status = "no" (Supabase schema format)', () => {
  const listing = { residueType: 'Paddy Straw', quantity: 10, location: 'Anand, Gujarat' };
  const buyer = {
    org_name: 'Full Plant',
    accepted_types: ['Paddy Straw'],
    availability_status: 'no',
    required_quantity_tonnes: 10,
  };
  const res = checkCompatibility(listing, buyer);
  assert.equal(res.compatible, false);
  assert.match(res.reasons[0], /currently on hold/i);
});

test('Rejects invalid listing quantity <= 0', () => {
  const listing = { residueType: 'Paddy Straw', quantity: 0, location: 'Anand, Gujarat' };
  const buyer = { orgName: 'Green Bio', acceptedTypes: ['Paddy Straw'], available: true, requiredQuantity: 10 };
  const res = checkCompatibility(listing, buyer);
  assert.equal(res.compatible, false);
  assert.match(res.reasons[0], /must be greater than 0/i);
});

test('Accepts valid buyer accepting residue and available', () => {
  const listing = { residueType: 'Paddy Straw', quantity: 18, location: 'Anand, Gujarat' };
  const buyer = { orgName: 'Green Bio', acceptedTypes: ['Paddy Straw'], available: true, requiredQuantity: 20 };
  const res = checkCompatibility(listing, buyer);
  assert.equal(res.compatible, true);
  assert.equal(res.reasons.length, 0);
});

// ─── 2. Score Component Tests (Step 2) ────────────────────────────
console.log('\nGroup 2: Individual Score Components (Step 2)');

test('Quantity Fit: exact match produces 1.0', () => {
  const { score } = calculateQuantityFit(50, 50);
  assert.equal(score, 1.0);
});

test('Quantity Fit: listing lot smaller than requirement produces ratio', () => {
  const { score } = calculateQuantityFit(18, 20);
  assert.equal(score, 0.90);
});

test('Quantity Fit: listing lot larger than requirement produces inverse ratio', () => {
  const { score } = calculateQuantityFit(100, 50);
  assert.equal(score, 0.50);
});

test('Proximity Fit: same district yields 1.0', () => {
  const { score, estimatedDistanceKm, proximityTier } = calculateProximityFit(
    { location: 'Khambhat, Anand', district: 'Anand', state: 'Gujarat' },
    { location: 'Anand GIDC', state: 'Gujarat' }
  );
  assert.equal(score, 1.0);
  assert.equal(proximityTier, 'local');
  assert.equal(estimatedDistanceKm, 15);
});

test('Proximity Fit: same state yields 0.75', () => {
  const { score, proximityTier } = calculateProximityFit(
    { location: 'Anand', district: 'Anand', state: 'Gujarat' },
    { location: 'Vadodara Industrial Area', state: 'Gujarat' }
  );
  assert.equal(score, 0.75);
  assert.equal(proximityTier, 'intrastate');
});

test('Proximity Fit: adjacent state yields 0.45', () => {
  const { score, proximityTier } = calculateProximityFit(
    { location: 'Ahmedabad', state: 'Gujarat' },
    { location: 'Udaipur', state: 'Rajasthan' }
  );
  assert.equal(score, 0.45);
  assert.equal(proximityTier, 'regional');
});

test('Proximity Fit: distant state yields 0.20', () => {
  const { score, proximityTier } = calculateProximityFit(
    { location: 'Ludhiana', state: 'Punjab' },
    { location: 'Kochi', state: 'Kerala' }
  );
  assert.equal(score, 0.20);
  assert.equal(proximityTier, 'longhaul');
});

test('Capacity Fit: listing within max intake yields 1.0', () => {
  const { score, status } = calculateCapacityFit(18, 200, 50);
  assert.equal(score, 1.0);
  assert.equal(status, 'within_capacity');
});

test('Capacity Fit: listing exceeding max intake is discounted with warning', () => {
  const { score, status, warning } = calculateCapacityFit(250, 200, 50);
  assert.ok(score < 1.0);
  assert.equal(status, 'exceeds_capacity');
  assert.match(warning, /exceeds single-batch max intake/i);
});

test('Use-Case Fit: high-synergy circular pairing yields 1.0', () => {
  const { score } = calculateUseCaseFit('Paddy Straw', 'Biofuel / Energy Generation', ['Paddy Straw']);
  assert.equal(score, 1.0);
});

test('Use-Case Fit: buyer accepted standard use yields 0.75', () => {
  const { score } = calculateUseCaseFit('Paddy Straw', 'Cardboard / Packaging', ['Paddy Straw']);
  assert.ok(score >= 0.75);
});

// ─── 3. Formula & Weighting Tests ─────────────────────────────────
console.log('\nGroup 3: Mathematical Formula Verification');

test('Formula adheres exactly to 40% Q + 30% P + 20% C + 10% U', () => {
  assert.equal(MATCH_WEIGHTS.QUANTITY, 0.40);
  assert.equal(MATCH_WEIGHTS.PROXIMITY, 0.30);
  assert.equal(MATCH_WEIGHTS.CAPACITY, 0.20);
  assert.equal(MATCH_WEIGHTS.USE_CASE, 0.10);

  const listing = {
    residueType: 'Paddy Straw',
    quantity: 50, // exact match to buyer
    location: 'Anand',
    district: 'Anand',
    state: 'Gujarat',
  };
  const buyer = {
    orgName: 'Local Biofuel Plant',
    acceptedTypes: ['Paddy Straw'],
    requiredQuantity: 50, // 100% Q fit = 1.0 * 40 = 40 pts
    maxIntake: 200,       // 100% C fit = 1.0 * 20 = 20 pts
    intendedUse: 'Biofuel / Energy Generation', // 100% U fit = 1.0 * 10 = 10 pts
    location: 'Anand',    // 100% P fit = 1.0 * 30 = 30 pts
    state: 'Gujarat',
    available: true,
  };

  const res = scoreMatch(listing, buyer);
  assert.equal(res.compatible, true);
  assert.equal(res.scores.quantityFit, 1.0);
  assert.equal(res.scores.proximityFit, 1.0);
  assert.equal(res.scores.capacityFit, 1.0);
  assert.equal(res.scores.useCaseFit, 1.0);
  assert.equal(res.finalScore, 100);
  assert.equal(res.weightedPoints.quantity, 40.0);
  assert.equal(res.weightedPoints.proximity, 30.0);
  assert.equal(res.weightedPoints.capacity, 20.0);
  assert.equal(res.weightedPoints.useCase, 10.0);
});

// ─── 4. Dynamic Recalculation Tests ───────────────────────────────
console.log('\nGroup 4: Dynamic Sensitivity (Scores update with inputs)');

test('Changing listing quantity dynamically modifies quantity fit and final score', () => {
  const buyer = sampleBuyers[0]; // GreenFuel: requires 50t, accepts Paddy Straw
  const listing50t = { residueType: 'Paddy Straw', quantity: 50, location: 'Vadodara, Gujarat', state: 'Gujarat' };
  const listing10t = { residueType: 'Paddy Straw', quantity: 10, location: 'Vadodara, Gujarat', state: 'Gujarat' };

  const res50 = scoreMatch(listing50t, buyer);
  const res10 = scoreMatch(listing10t, buyer);

  assert.ok(res50.finalScore > res10.finalScore, '50t batch should score higher than 10t batch for 50t requirement');
  assert.equal(res50.scores.quantityFit, 1.0);
  assert.equal(res10.scores.quantityFit, 0.20);
});

test('Changing location dynamically alters proximity fit and final score', () => {
  const buyer = sampleBuyers[0]; // Vadodara, Gujarat
  const localListing = { residueType: 'Paddy Straw', quantity: 50, location: 'Vadodara', state: 'Gujarat' };
  const distantListing = { residueType: 'Paddy Straw', quantity: 50, location: 'Palakkad', state: 'Kerala' };

  const resLocal = scoreMatch(localListing, buyer);
  const resDistant = scoreMatch(distantListing, buyer);

  assert.ok(resLocal.finalScore > resDistant.finalScore, 'Local listing should rank higher due to proximity');
  assert.ok(resLocal.scores.proximityFit > resDistant.scores.proximityFit);
});

// ─── 5. Ranking & Top-3 Matches (Step 3) ──────────────────────────
console.log('\nGroup 5: Multi-Candidate Ranking & Top-3 Matches (Step 3)');

test('Ranks candidates and returns top 3 matches with badges', () => {
  const listing = sampleListings[0]; // Rajesh Patel: Paddy Straw, 18t, Anand, Gujarat
  const report = matchListingWithBuyers(listing, sampleBuyers);

  assert.ok(report.totalEvaluated >= 5);
  assert.ok(report.compatibleCount >= 2);
  assert.equal(report.topMatches.length, Math.min(3, report.compatibleCount));

  // Top matches should be ordered descending
  for (let i = 0; i < report.topMatches.length - 1; i++) {
    assert.ok(
      report.topMatches[i].matchResult.finalScore >= report.topMatches[i + 1].matchResult.finalScore,
      `Rank ${i + 1} score (${report.topMatches[i].matchResult.finalScore}) must be >= Rank ${i + 2} score (${report.topMatches[i + 1].matchResult.finalScore})`
    );
  }

  // Rank 1 badge check
  assert.equal(report.topMatches[0].rank, 1);
  assert.equal(report.topMatches[0].badgeText, '#1 Best Match');
  if (report.topMatches[1]) {
    assert.equal(report.topMatches[1].rank, 2);
    assert.equal(report.topMatches[1].badgeText, '#2 Strong Match');
  }
});

// ─── 6. Explanations (Step 4) ─────────────────────────────────────
console.log('\nGroup 6: Match Explanations (Step 4)');

test('Generates all required explanation dimensions for compatible matches', () => {
  const listing = sampleListings[0];
  const buyer = sampleBuyers[0];
  const res = scoreMatch(listing, buyer);

  assert.ok(res.explanation.residue.length > 0, 'Residue explanation present');
  assert.ok(res.explanation.quantity.length > 0, 'Quantity explanation present');
  assert.ok(res.explanation.distance.length > 0, 'Distance explanation present');
  assert.ok(res.explanation.capacity.length > 0, 'Capacity explanation present');
  assert.ok(res.explanation.useCase.length > 0, 'Use-case explanation present');
  assert.ok(res.explanation.summary.length > 0, 'Summary narrative present');
});

// ─── 7. Edge Cases (Step 5) ───────────────────────────────────────
console.log('\nGroup 7: Edge Cases Resilience (Step 5)');

test('Edge Case: No compatible buyers (e.g. rare residue type)', () => {
  const listing = { residueType: 'Sunflower Stalks', quantity: 15, location: 'Anand, Gujarat' };
  // None of sampleBuyers[0..3] accept sunflower stalks except possibly general
  const report = matchListingWithBuyers(listing, [
    { orgName: 'Paper Mill', acceptedTypes: ['Wheat Straw'], available: true, requiredQuantity: 10 },
  ]);

  assert.equal(report.compatibleCount, 0);
  assert.equal(report.topMatches.length, 0);
  assert.equal(report.incompatibleCount, 1);
  assert.match(report.incompatibleBuyers[0].matchResult.incompatibleReasons[0], /not accepted/i);
});

test('Edge Case: Missing locations handled safely without crashing', () => {
  const listing = { residueType: 'Paddy Straw', quantity: 20, location: '', state: '' };
  const buyer = { orgName: 'Bio Company', acceptedTypes: ['Paddy Straw'], location: '', state: '', available: true, requiredQuantity: 20 };
  const res = scoreMatch(listing, buyer);

  assert.equal(res.compatible, true);
  assert.equal(res.scores.proximityFit, 0.25);
  assert.equal(res.metadata.proximityTier, 'unspecified');
  assert.ok(res.explanation.warnings.some((w) => w.includes('location')));
});

test('Edge Case: Unavailable buyer is separated into incompatible list with reason', () => {
  const listing = { residueType: 'Paddy Straw', quantity: 20, location: 'Anand, Gujarat', state: 'Gujarat' };
  const buyer = { orgName: 'Mushroom Valley', acceptedTypes: ['Paddy Straw'], available: false, requiredQuantity: 20 };
  const report = matchListingWithBuyers(listing, [buyer]);

  assert.equal(report.compatibleCount, 0);
  assert.equal(report.incompatibleCount, 1);
  assert.match(report.incompatibleBuyers[0].matchResult.incompatibleReasons[0], /on hold/i);
});

test('Edge Case: Insufficient capacity triggers proportional discount and warning', () => {
  const listing = { residueType: 'Paddy Straw', quantity: 300, location: 'Anand, Gujarat', state: 'Gujarat' };
  const buyer = {
    orgName: 'Small Biofuel',
    acceptedTypes: ['Paddy Straw'],
    requiredQuantity: 20,
    maxIntake: 50, // Listing is 300t > 50t max intake
    available: true,
  };
  const res = scoreMatch(listing, buyer);

  assert.equal(res.compatible, true);
  assert.ok(res.scores.capacityFit < 0.25);
  assert.equal(res.metadata.capacityStatus, 'exceeds_capacity');
  assert.ok(res.explanation.warnings.some((w) => w.includes('single-batch max intake')));
});

test('Edge Case: Invalid quantity <= 0 returns incompatible', () => {
  const listing = { residueType: 'Paddy Straw', quantity: -5, location: 'Anand, Gujarat' };
  const buyer = { orgName: 'Biofuel', acceptedTypes: ['Paddy Straw'], available: true, requiredQuantity: 20 };
  const res = scoreMatch(listing, buyer);

  assert.equal(res.compatible, false);
  assert.match(res.incompatibleReasons[0], /greater than 0/i);
});

// ─── 8. Geographic & Coordinate-Based Distance Tests (Feature 1) ───
console.log('\nGroup 8: Geographic Coordinates & Distance Estimation (Feature 1)');

test('Resolves valid geographic coordinates for known regions', async () => {
  const { resolveCoordinates, calculateHaversineDistanceKm } = await import('../src/lib/geo.js');
  const anand = resolveCoordinates('Anand, Gujarat');
  const vadodara = resolveCoordinates('Vadodara, Gujarat');

  assert.ok(Array.isArray(anand));
  assert.ok(Array.isArray(vadodara));
  assert.equal(anand[0], 22.5645);
  assert.equal(vadodara[0], 22.3072);

  // Direct distance between Anand and Vadodara is ~38.6 km
  const dist = calculateHaversineDistanceKm(anand, vadodara);
  assert.ok(dist >= 35 && dist <= 42, `Expected distance ~38.6 km, got ${dist}`);
});

test('Returns null coordinates for unrecognized locations without inventing fake coordinates', async () => {
  const { resolveCoordinates } = await import('../src/lib/geo.js');
  const unknown = resolveCoordinates('NonExistentPlace 12345');
  assert.equal(unknown, null);
});

test('scoreMatch includes coordinate distance when valid coordinates exist', () => {
  const listing = { residueType: 'Paddy Straw', quantity: 18, location: 'Anand, Gujarat', state: 'Gujarat' };
  const buyer = {
    orgName: 'GreenFuel',
    location: 'Vadodara, Gujarat',
    state: 'Gujarat',
    acceptedTypes: ['Paddy Straw'],
    requiredQuantity: 20,
    available: true,
  };
  const res = scoreMatch(listing, buyer);
  assert.equal(res.compatible, true);
  assert.ok(res.metadata.coordinateDistanceKm != null);
  assert.ok(res.metadata.coordinateDistanceKm >= 35 && res.metadata.coordinateDistanceKm <= 42);
});

// ─── 9. Potential Value & Pricing Tests (Feature 4) ────────────────
console.log('\nGroup 9: Potential Value & Indicative Pricing (Feature 4)');

test('Calculates indicative value correctly when buyer price is available', () => {
  const listing = { residueType: 'Paddy Straw', quantity: 18, location: 'Anand, Gujarat' };
  const buyer = {
    orgName: 'GreenFuel',
    acceptedTypes: ['Paddy Straw'],
    requiredQuantity: 20,
    available: true,
    pricePerTonne: 2200,
    isDemo: true,
  };
  const res = scoreMatch(listing, buyer);
  assert.equal(res.metadata.pricing.pricePerTonne, 2200);
  assert.equal(res.metadata.pricing.indicativeValue, 18 * 2200); // 39,600
  assert.equal(res.metadata.pricing.isDemoPrice, true);
  assert.match(res.explanation.pricing, /39,600/);
});

test('Displays "Price unavailable" when buyer price is missing or null', () => {
  const listing = { residueType: 'Paddy Straw', quantity: 18, location: 'Anand, Gujarat' };
  const buyer = {
    orgName: 'PaperLeaf',
    acceptedTypes: ['Paddy Straw'],
    requiredQuantity: 20,
    available: true,
    pricePerTonne: null,
  };
  const res = scoreMatch(listing, buyer);
  assert.equal(res.metadata.pricing.pricePerTonne, null);
  assert.equal(res.metadata.pricing.indicativeValue, null);
  assert.equal(res.metadata.pricing.priceLabel, 'Price unavailable');
  assert.match(res.explanation.pricing, /Price unavailable/i);
});

// ─── 10. Collection Grouping Recommendations (Feature 6) ───────────
console.log('\nGroup 10: Suggested Collection Grouping (Feature 6)');

test('findCollectionGroupings aggregates compatible nearby farmer listings for buyer demand', async () => {
  const { findCollectionGroupings } = await import('../src/lib/matchingEngine.js');

  const listings = [
    { id: 'F1', farmerName: 'Farmer A', residueType: 'Paddy Straw', quantity: 18, district: 'Anand', state: 'Gujarat', status: 'active' },
    { id: 'F2', farmerName: 'Farmer B', residueType: 'Paddy Straw', quantity: 14, district: 'Anand', state: 'Gujarat', status: 'active' },
    { id: 'F3', farmerName: 'Farmer C', residueType: 'Wheat Straw', quantity: 30, district: 'Ludhiana', state: 'Punjab', status: 'active' },
  ];

  const buyers = [
    {
      id: 'B1',
      orgName: 'GreenFuel Anand Hub',
      acceptedTypes: ['Paddy Straw'],
      requiredQuantity: 35,
      maxIntake: 100,
      available: true,
      location: 'Vadodara, Gujarat',
      state: 'Gujarat',
      pricePerTonne: 2000,
      isDemo: true,
    },
  ];

  const opportunities = findCollectionGroupings(listings, buyers);
  assert.ok(opportunities.length >= 1);
  const opp = opportunities[0];

  assert.equal(opp.residueType, 'Paddy Straw');
  assert.equal(opp.totalQuantityTonnes, 32);
  assert.equal(opp.farmerCount, 2);
  assert.equal(opp.targetBuyer.orgName, 'GreenFuel Anand Hub');
  assert.equal(opp.indicativeLotValue, 32 * 2000); // 64,000
  assert.equal(opp.isSuggestedOnly, true);
  assert.match(opp.disclaimer, /NOT a confirmed booking/i);
});

// ─── Test Summary ─────────────────────────────────────────────────
console.log(`\n🎉 Test Results: ${testsPassed} / ${totalTests} tests passed successfully.\n`);
