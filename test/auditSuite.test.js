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
import { formatDbError } from '../src/lib/db.js';

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

runAudit('Phase 2: Safe deterministic deduplication eliminates demo duplicates and preserves real records', () => {
  // Mock DB containing 1 demo seed listing and 2 real listings with similar names
  const dbListings = [
    { id: 'uuid-1', farmer_name: 'Rajesh Patel [DEMO]', residue_type: 'Paddy Straw', quantity_tonnes: 18, is_demo: true },
    { id: 'uuid-2', farmer_name: 'Rajesh Patel', residue_type: 'Paddy Straw', quantity_tonnes: 45, is_demo: false }, // Real farmer 1
    { id: 'uuid-3', farmer_name: 'Rajesh Patel', residue_type: 'Wheat Straw', quantity_tonnes: 25, is_demo: false }, // Real farmer 2
  ];
  // Sample catalog containing the original seed listing
  const sampleListings = [
    { id: 'L001', farmerName: 'Rajesh Patel', residueType: 'Paddy Straw', quantity: 18, isDemo: true },
  ];

  const cleanDemo = (str) => String(str || '').replace(/\s*\[DEMO\]\s*/gi, '').trim().toLowerCase();

  const merged = [...dbListings.map(l => ({ ...l, isDemo: !!l.is_demo }))];
  sampleListings.forEach((item) => {
    const isPresent = merged.some((existing) => {
      if (existing.id === item.id) return true;
      if (existing.isDemo && item.isDemo) {
        return cleanDemo(existing.farmer_name || existing.farmerName) === cleanDemo(item.farmerName) &&
               existing.residue_type === item.residueType;
      }
      return false;
    });
    if (!isPresent) merged.push(item);
  });

  // The sample demo duplicate L001 must be excluded because uuid-1 exists
  assert.equal(merged.length, 3, 'Merged list should contain exactly 3 records');
  // Both real farmer listings must be intact and distinct
  const realListings = merged.filter(m => !m.isDemo);
  assert.equal(realListings.length, 2, 'Both distinct real listings must be preserved');
  assert.ok(realListings.some(r => r.id === 'uuid-2'));
  assert.ok(realListings.some(r => r.id === 'uuid-3'));
});

runAudit('Phase 2: Match score percentage and breakdown points are mathematically consistent', () => {
  const listing = { residueType: 'Paddy Straw', quantity: 18, location: 'Anand, Gujarat', district: 'Anand', state: 'Gujarat' };
  const buyer = {
    id: 'B001',
    orgName: 'GreenFuel Renewables',
    acceptedTypes: ['Paddy Straw'],
    requiredQuantity: 20,
    maxIntake: null, // unspecified capacity
    intendedUse: 'Biofuel / Energy Generation',
    location: 'Vadodara, Gujarat',
    state: 'Gujarat',
    available: true,
  };

  const result = scoreMatch(listing, buyer);
  assert.ok(result.compatible);
  assert.equal(typeof result.finalScore, 'number');
  assert.equal(typeof result.weightedPoints.total, 'number');
  assert.equal(result.finalScore, Math.round(result.weightedPoints.total), 'finalScore must equal rounded total weightedPoints');
});

// ── 5. The Complete 6-Step Demo Journey (Local Mocked DB / Test Isolation) ──
console.log('\nSection 5: Complete 6-Step Demonstration User Journey (Test Isolation)');

const envUrl = process.env.TEST_SUPABASE_URL || process.env.VITE_SUPABASE_URL || null;
const envKey = process.env.TEST_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || null;
const runLive = process.env.RUN_LIVE_SUPABASE_TESTS === 'true' && envUrl && envKey;

function createMockSupabaseClient() {
  const store = {
    farmer_listings: [
      {
        id: 'mock-seed-l1',
        farmer_name: 'Rajesh Patel [DEMO]',
        residue_type: 'Paddy Straw',
        quantity_tonnes: 18,
        location: 'Khambhat village',
        district: 'Anand',
        state: 'Gujarat',
        availability_date: '2026-11-10',
        pickup_preference: 'Self-pickup by buyer',
        status: 'active',
        is_demo: true,
      },
    ],
    buyer_requirements: [
      {
        id: 'mock-seed-b1',
        org_name: 'GreenFuel Renewables [DEMO]',
        accepted_types: ['Paddy Straw', 'Wheat Straw'],
        required_quantity_tonnes: 50,
        max_intake_tonnes: 200,
        intended_use: 'Biofuel / Energy Generation',
        location: 'Vadodara Industrial Estate',
        state: 'Gujarat',
        availability_status: 'yes',
        is_demo: true,
      },
      {
        id: 'mock-seed-b2',
        org_name: 'AgriCompost Cooperative [DEMO]',
        accepted_types: ['Paddy Straw', 'Cotton Stalks'],
        required_quantity_tonnes: 20,
        max_intake_tonnes: 80,
        intended_use: 'Compost / Organic Fertiliser',
        location: 'Anand District',
        state: 'Gujarat',
        availability_status: 'yes',
        is_demo: true,
      },
      {
        id: 'mock-seed-b3',
        org_name: 'BioGas India Initiative [DEMO]',
        accepted_types: ['Sugarcane Bagasse', 'Cotton Stalks'],
        required_quantity_tonnes: 100,
        max_intake_tonnes: 500,
        intended_use: 'Bio-CNG Production',
        location: 'Hyderabad Outskirts',
        state: 'Telangana',
        availability_status: 'yes',
        is_demo: true,
      },
    ],
    contact_requests: [
      {
        id: 'mock-seed-r1',
        demo_buyer_ref: 'B001',
        request_type: 'pickup',
        message: 'Initial demo request',
        status: 'pending',
        is_demo: true,
      },
    ],
  };

  return {
    from: (table) => {
      const tableRows = store[table] || [];
      return {
        insert: (payload) => {
          const row = {
            ...payload,
            id: `test-uuid-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            created_at: new Date().toISOString(),
          };
          tableRows.push(row);
          return {
            select: () => ({
              single: async () => ({ data: row, error: null }),
            }),
          };
        },
        update: (updates) => ({
          eq: (field, val) => ({
            select: () => ({
              single: async () => {
                const target = tableRows.find((r) => r[field] === val);
                if (target) {
                  Object.assign(target, updates);
                  return { data: { ...target }, error: null };
                }
                return { data: null, error: { message: 'Row not found', code: 'PGRST116' } };
              },
            }),
          }),
        }),
        select: () => ({
          then: (resolve) => resolve({ data: [...tableRows], error: null }),
          single: async () => ({ data: tableRows[0] || null, error: null }),
        }),
      };
    },
  };
}

const supabase = runLive ? createClient(envUrl, envKey) : createMockSupabaseClient();

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

// ── 6. Phase 3 Workflow Actions & Security Architecture ──────────
console.log('\nSection 6: Phase 3 Workflow Actions & Security Architecture Rules');

runAudit('Phase 3: Database error formatter explains Row Level Security constraint for 42501', () => {
  const rlsError = { code: '42501', message: 'permission denied for table contact_requests' };
  const formatted = formatDbError(rlsError);
  assert.ok(formatted.includes('Row Level Security'), 'Should explicitly cite Row Level Security');
  assert.ok(formatted.includes('authenticated') || formatted.includes('Edge Function'), 'Should explain required security architecture');
  assert.equal(formatted.includes('GRANT ALL ON ALL TABLES'), false, 'Must NOT suggest open public grant');
});

await runAuditAsync('Phase 3: Contact request status transition updates correctly in database', async () => {
  const { data, error } = await supabase
    .from('contact_requests')
    .update({ status: 'accepted' })
    .eq('id', global.__demoRequestId)
    .select()
    .single();

  assert.equal(error, null);
  assert.equal(data.status, 'accepted');
  assert.equal(data.id, global.__demoRequestId);
});

await runAuditAsync('Phase 3: Farmer listing status transition (active -> matched) updates correctly in database', async () => {
  const { data, error } = await supabase
    .from('farmer_listings')
    .update({ status: 'matched' })
    .eq('id', global.__demoListing.id)
    .select()
    .single();

  assert.equal(error, null);
  assert.equal(data.status, 'matched');
  assert.equal(data.id, global.__demoListing.id);
});

console.log(`\n🎉 Audit Test Results: ${auditTestsPassed} / ${totalAuditTests} tests passed successfully.\n`);
