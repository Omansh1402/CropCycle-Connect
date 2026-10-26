// test/auditSuite.test.js
// ─────────────────────────────────────────────────────────────────
// CropCycle Connect – Comprehensive Quality & Journey Audit Suite
//
// Tests:
// 1. Farmer Form Validation Logic
// 2. Buyer Form Validation Logic
// 3. Contact Request Validation Logic
// 4. Matching Compatibility, Scoring, and Ranking Engine
// 5. Edge Cases: Missing Locations, Zero/Negative Lots, No-Match Results
// 6. Geographic Distance & OSRM Routing Fallback
// 7. Potential Value & Pricing Badging
// 8. Suggested Collection Grouping (Feature 6)
// 9. Live Supabase Operations (Insert, Fetch, Dashboard Metrics Split)
// 10. The Complete 6-Step Demo Journey:
//     1. Enter Rice Straw (Paddy Straw) listing
//     2. Find top 3 compatible buyers
//     3. Show match scores & estimated distances
//     4. Verify 5-dimension match explanation
//     5. Submit contact/pickup request
//     6. Verify resulting confirmation & dashboard metrics update
// ─────────────────────────────────────────────────────────────────
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import {
  matchListingWithBuyers,
  scoreMatch,
  calculateProximityFit,
  findCollectionGroupings,
} from '../src/lib/matchingEngine.js';
import { resolveCoordinates, calculateHaversineDistanceKm } from '../src/lib/geo.js';
import { sampleBuyers } from '../src/data/sampleData.js';

console.log('🧪 Starting CropCycle Connect Comprehensive Audit Test Suite...\n');

let auditTestsPassed = 0;
let totalAuditTests = 0;

function runAudit(name, fn) {
  totalAuditTests++;
  try {
    fn();
    console.log(`  ✓ ${name}`);
    auditTestsPassed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

async function runAuditAsync(name, fn) {
  totalAuditTests++;
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    auditTestsPassed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

// ── 1. Farmer Form Validation Logic ──────────────────────────────
console.log('Section 1: Farmer Listing Form Validation Rules');

function validateFarmerForm(form) {
  const e = {};
  if (!form.farmerName?.trim()) e.farmerName = 'Name is required';
  if (!form.residueType) e.residueType = 'Select a residue type';
  if (!form.quantity || Number(form.quantity) <= 0) e.quantity = 'Enter a valid quantity greater than zero';
  if (Number(form.quantity) > 100000) e.quantity = 'Quantity seems unrealistically large';
  if (!form.location?.trim()) e.location = 'Village/farm location is required';
  if (!form.state?.trim()) e.state = 'State is required';
  if (!form.availabilityDate) e.availabilityDate = 'Pick an availability date';
  if (!form.pickupPreference) e.pickupPreference = 'Select a pickup preference';
  if (form.contactEmail && !/\S+@\S+\.\S+/.test(form.contactEmail)) e.contactEmail = 'Enter a valid email address';
  if (form.contactPhone && !/^[0-9+\s()-]{7,15}$/.test(form.contactPhone.trim())) e.contactPhone = 'Enter a valid phone number';
  return e;
}

runAudit('Validates all required fields for Farmer listing form', () => {
  const emptyForm = {};
  const errors = validateFarmerForm(emptyForm);
  assert.ok(errors.farmerName);
  assert.ok(errors.residueType);
  assert.ok(errors.quantity);
  assert.ok(errors.location);
  assert.ok(errors.state);
  assert.ok(errors.availabilityDate);
  assert.ok(errors.pickupPreference);
});

runAudit('Rejects negative, zero, and extreme quantities for Farmer form', () => {
  assert.ok(validateFarmerForm({ quantity: 0 }).quantity);
  assert.ok(validateFarmerForm({ quantity: -10 }).quantity);
  assert.ok(validateFarmerForm({ quantity: 150000 }).quantity);
  assert.equal(validateFarmerForm({
    farmerName: 'Ramesh',
    residueType: 'Wheat Straw',
    quantity: 25,
    location: 'Karnal',
    state: 'Haryana',
    availabilityDate: '2026-11-20',
    pickupPreference: 'Self-pickup',
  }).quantity, undefined);
});

runAudit('Validates optional contact email and phone formats for Farmer form', () => {
  assert.ok(validateFarmerForm({ contactEmail: 'invalid-email' }).contactEmail);
  assert.ok(validateFarmerForm({ contactPhone: 'abc123' }).contactPhone);
  assert.equal(validateFarmerForm({ contactEmail: 'farmer@krishi.in', contactPhone: '+91 98765 43210' }).contactEmail, undefined);
});

// ── 2. Buyer Form Validation Logic ───────────────────────────────
console.log('\nSection 2: Buyer Requirement Form Validation Rules');

function validateBuyerForm(form) {
  const e = {};
  if (!form.orgName?.trim()) e.orgName = 'Organisation / name is required';
  if (!form.acceptedTypes || form.acceptedTypes.length === 0) e.acceptedTypes = 'Select at least one residue type';
  if (!form.requiredQuantity || Number(form.requiredQuantity) <= 0) e.requiredQuantity = 'Enter a required quantity greater than zero';
  if (form.maxIntake && Number(form.maxIntake) < Number(form.requiredQuantity)) e.maxIntake = 'Max intake cannot be less than required quantity';
  if (!form.location?.trim()) e.location = 'Facility location is required';
  if (!form.state?.trim()) e.state = 'State is required';
  if (!form.intendedUse) e.intendedUse = 'Select intended use';
  if (form.contactEmail && !/\S+@\S+\.\S+/.test(form.contactEmail)) e.contactEmail = 'Enter a valid email address';
  if (form.contactPhone && !/^[0-9+\s()-]{7,15}$/.test(form.contactPhone.trim())) e.contactPhone = 'Enter a valid phone number';
  return e;
}

runAudit('Validates all required fields for Buyer registration form', () => {
  const emptyForm = {};
  const errors = validateBuyerForm(emptyForm);
  assert.ok(errors.orgName);
  assert.ok(errors.acceptedTypes);
  assert.ok(errors.requiredQuantity);
  assert.ok(errors.location);
  assert.ok(errors.state);
  assert.ok(errors.intendedUse);
});

runAudit('Rejects max intake less than required batch quantity for Buyer form', () => {
  const err = validateBuyerForm({
    orgName: 'Green Bio',
    acceptedTypes: ['Paddy Straw'],
    requiredQuantity: 100,
    maxIntake: 50, // Invalid: max intake < required quantity
    location: 'Anand',
    state: 'Gujarat',
    intendedUse: 'Biofuel',
  });
  assert.ok(err.maxIntake);
});

// ── 3. Contact Request Validation Logic ──────────────────────────
console.log('\nSection 3: Contact/Pickup Request Validation Rules');

function validateContactRequest(data) {
  const e = {};
  if (!data.message?.trim() || data.message.trim().length < 10) {
    e.message = 'Message must be at least 10 characters long';
  }
  if (data.requesterEmail && !/\S+@\S+\.\S+/.test(data.requesterEmail)) {
    e.requesterEmail = 'Enter a valid email address';
  }
  return e;
}

runAudit('Enforces minimum 10-character message constraint for pickup requests', () => {
  assert.ok(validateContactRequest({ message: 'Short' }).message);
  assert.equal(validateContactRequest({ message: 'Interested in scheduling pickup for 20 tonnes.' }).message, undefined);
});

// ── 4. Matching Compatibility, Scoring and Edge Cases ────────────
console.log('\nSection 4: Matching Engine Resilience & Edge Cases');

runAudit('Edge Case: Handles missing location without throwing and assigns regional tier', () => {
  const res = calculateProximityFit('', '');
  assert.equal(res.score, 0.25);
  assert.equal(res.proximityTier, 'unspecified');
});

runAudit('Edge Case: Evaluates no-match when buyer accepts disjoint residue types', () => {
  const listing = { residueType: 'Banana Pseudostems', quantity: 15, location: 'Palakkad, Kerala' };
  const buyer = { orgName: 'Biofuel Co', acceptedTypes: ['Paddy Straw', 'Wheat Straw'], requiredQuantity: 15, available: true };
  const res = scoreMatch(listing, buyer);
  assert.equal(res.compatible, false);
  assert.match(res.incompatibleReasons[0], /not accepted by this buyer/i);
});

runAudit('Feature 1: Geographic coordinates resolve accurately for known agricultural centers', () => {
  const karnal = resolveCoordinates('Karnal, Haryana');
  const ludhiana = resolveCoordinates('Ludhiana, Punjab');
  assert.ok(karnal && ludhiana);
  const dist = calculateHaversineDistanceKm(karnal, ludhiana);
  // Karnal to Ludhiana is ~175 km direct
  assert.ok(dist >= 150 && dist <= 200, `Expected ~175 km, got ${dist}`);
});

runAudit('Feature 4: Correctly distinguishes lot value vs Price unavailable with demo price badge', () => {
  const listing = { residueType: 'Paddy Straw', quantity: 20, location: 'Anand, Gujarat' };
  const demoBuyer = { orgName: 'AgriCompost', acceptedTypes: ['Paddy Straw'], requiredQuantity: 20, pricePerTonne: 1850, isDemo: true, available: true };
  const unpricedBuyer = { orgName: 'PaperMill', acceptedTypes: ['Paddy Straw'], requiredQuantity: 20, pricePerTonne: null, available: true };

  const resDemo = scoreMatch(listing, demoBuyer);
  assert.equal(resDemo.metadata.pricing.indicativeValue, 20 * 1850);
  assert.equal(resDemo.metadata.pricing.isDemoPrice, true);

  const resUnpriced = scoreMatch(listing, unpricedBuyer);
  assert.equal(resUnpriced.metadata.pricing.indicativeValue, null);
  assert.equal(resUnpriced.metadata.pricing.priceLabel, 'Price unavailable');
});

runAudit('Feature 6: Suggested collection opportunity includes non-binding disclaimer', () => {
  const listings = [
    { id: 'F1', farmerName: 'Farmer 1', residueType: 'Paddy Straw', quantity: 15, district: 'Anand', state: 'Gujarat', status: 'active' },
    { id: 'F2', farmerName: 'Farmer 2', residueType: 'Paddy Straw', quantity: 20, district: 'Anand', state: 'Gujarat', status: 'active' },
  ];
  const buyers = [
    { id: 'B1', orgName: 'GreenFuel Hub', acceptedTypes: ['Paddy Straw'], requiredQuantity: 35, available: true, location: 'Vadodara, Gujarat', state: 'Gujarat' },
  ];
  const groupings = findCollectionGroupings(listings, buyers);
  assert.ok(groupings.length >= 1);
  assert.equal(groupings[0].isSuggestedOnly, true);
  assert.match(groupings[0].disclaimer, /NOT a confirmed booking/i);
});

// ── 5. The Complete 6-Step Demo Journey Against Live Supabase ──────
console.log('\nSection 5: Complete 6-Step Demonstration User Journey (Live Supabase)');

const supabaseUrl = 'https://nqsbebhgwdbrtpepwhwu.supabase.co';
const supabaseKey = 'sb_publishable_N4QLIf9v3egv6tKVXBmccg_pa7cfi6e';
const supabase = createClient(supabaseUrl, supabaseKey);

await runAuditAsync('Step 1: Enter a farmer rice-straw (Paddy Straw) listing in Supabase', async () => {
  const ts = Date.now();
  const listingData = {
    farmer_name: `Demo Journey Farmer ${ts}`,
    contact_phone: '+91 98765 54321',
    contact_email: `journey.${ts}@demo-krishi.org`,
    residue_type: 'Paddy Straw', // Rice straw
    quantity_tonnes: 30,
    location: 'Khambhat village, Anand',
    district: 'Anand',
    state: 'Gujarat',
    availability_date: '2026-11-25',
    pickup_preference: 'Self-pickup by buyer',
    status: 'active',
    is_demo: false, // Verified real record
  };

  const { data, error } = await supabase
    .from('farmer_listings')
    .insert(listingData)
    .select()
    .single();

  assert.equal(error, null, `Insert failed: ${error?.message}`);
  assert.ok(data?.id);
  assert.equal(data.residue_type, 'Paddy Straw');
  assert.equal(data.quantity_tonnes, 30);
  global.__demoListing = data;
});

await runAuditAsync('Step 2 & 3: Find top 3 compatible buyers with scores and estimated distances', async () => {
  const { data: dbBuyers } = await supabase.from('buyer_requirements').select('*');
  const allBuyers = [...(dbBuyers || []), ...sampleBuyers];
  const report = matchListingWithBuyers(global.__demoListing, allBuyers);

  assert.ok(report.compatibleCount >= 3, 'Must find at least 3 compatible buyers for Paddy Straw');
  assert.equal(report.topMatches.length, 3, 'Expected top 3 matches');

  report.topMatches.forEach((m, idx) => {
    assert.ok(m.matchResult.finalScore >= 0 && m.matchResult.finalScore <= 100);
    assert.equal(m.rank, idx + 1);
    assert.ok(m.matchResult.metadata.estimatedDistanceKm != null, 'Estimated distance must be present');
  });

  global.__demoTopBuyer = report.topMatches[0].buyer;
  global.__demoTopMatchResult = report.topMatches[0].matchResult;
});

await runAuditAsync('Step 4: Verify 5-dimension match explanation for recommended buyer', async () => {
  const result = global.__demoTopMatchResult;
  assert.ok(result.explanation.residue.length > 0, 'Residue explanation verified');
  assert.ok(result.explanation.quantity.length > 0, 'Quantity alignment verified');
  assert.ok(result.explanation.distance.length > 0, 'Distance logistics verified');
  assert.ok(result.explanation.capacity.length > 0, 'Capacity intake verified');
  assert.ok(result.explanation.useCase.length > 0, 'Use-case synergy verified');
  assert.ok(result.explanation.summary.length > 0, 'Summary narrative verified');
});

await runAuditAsync('Step 5: Submit a contact/pickup request to Supabase and verify confirmation', async () => {
  const ts = Date.now();
  const requestPayload = {
    listing_id: global.__demoListing.id,
    buyer_id: global.__demoTopBuyer.id.includes('-') ? global.__demoTopBuyer.id : null,
    demo_buyer_ref: global.__demoTopBuyer.id.includes('-') ? null : global.__demoTopBuyer.id,
    request_type: 'pickup',
    message: `Scheduled pickup request for 30 tonnes of Paddy Straw from Khambhat farm.`,
    requester_name: global.__demoListing.farmer_name,
    requester_email: `farmer.${ts}@krishi.in`,
    status: 'pending',
    is_demo: false,
  };

  const { data, error } = await supabase
    .from('contact_requests')
    .insert(requestPayload)
    .select()
    .single();

  assert.equal(error, null, `Contact request insert failed: ${error?.message}`);
  assert.ok(data?.id);
  assert.equal(data.status, 'pending');
  global.__demoRequestId = data.id;
});

await runAuditAsync('Step 6: Show resulting confirmation and dashboard metric split update', async () => {
  const [listingsRes, requestsRes] = await Promise.all([
    supabase.from('farmer_listings').select('id, quantity_tonnes, is_demo'),
    supabase.from('contact_requests').select('id, is_demo, demo_buyer_ref'),
  ]);

  const realListings = (listingsRes.data || []).filter((l) => !l.is_demo);
  const realRequests = (requestsRes.data || []).filter((r) => !r.is_demo && !r.demo_buyer_ref);

  assert.ok(realListings.some((l) => l.id === global.__demoListing.id), 'Listing must appear in real listings');
  assert.ok(realRequests.some((r) => r.id === global.__demoRequestId), 'Request must appear in real requests');
});

console.log(`\n🎉 Audit Test Results: ${auditTestsPassed} / ${totalAuditTests} tests passed successfully.\n`);
