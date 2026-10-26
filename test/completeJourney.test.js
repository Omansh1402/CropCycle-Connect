// test/completeJourney.test.js
// ─────────────────────────────────────────────────────────────────
// Tests the complete end-to-end user journey:
// 1. Farmer listing creation (persisted in Supabase)
// 2. Dynamic matching & multi-factor ranking
// 3. Coordinate distance & potential value verification
// 4. Contact/pickup request creation in Supabase
// 5. Dashboard real vs sample activity verification
// ─────────────────────────────────────────────────────────────────
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { matchListingWithBuyers, normalizeListing } from '../src/lib/matchingEngine.js';
import { resolveCoordinates, calculateHaversineDistanceKm } from '../src/lib/geo.js';
import { sampleBuyers } from '../src/data/sampleData.js';

console.log('🧪 Running Complete User Journey Test...\n');

const supabaseUrl = 'https://nqsbebhgwdbrtpepwhwu.supabase.co';
const supabaseKey = 'sb_publishable_N4QLIf9v3egv6tKVXBmccg_pa7cfi6e';
const supabase = createClient(supabaseUrl, supabaseKey);

async function runJourney() {
  const timestamp = Date.now();
  const testFarmerName = `Automated Journey Farmer ${timestamp}`;

  // ── Step 1: Create Farmer Listing in Supabase ────────────────────
  console.log('Step 1: Creating Farmer Listing in Supabase…');
  const listingPayload = {
    farmer_name: testFarmerName,
    contact_phone: '+91 98765 43210',
    contact_email: `testfarmer.${timestamp}@example.com`,
    residue_type: 'Paddy Straw',
    quantity_tonnes: 25,
    location: 'Anand, Gujarat',
    district: 'Anand',
    state: 'Gujarat',
    availability_date: '2026-11-20',
    pickup_preference: 'Self-pickup by buyer',
    status: 'active',
    is_demo: false, // REAL record
  };

  const { data: savedListing, error: listErr } = await supabase
    .from('farmer_listings')
    .insert(listingPayload)
    .select()
    .single();

  assert.equal(listErr, null, `Listing creation failed: ${listErr?.message}`);
  assert.ok(savedListing.id, 'Expected generated UUID for listing');
  assert.equal(savedListing.farmer_name, testFarmerName);
  assert.equal(savedListing.is_demo, false);
  console.log(`  ✓ Listing created in Supabase with ID: ${savedListing.id}`);

  // ── Step 2: Fetch Buyers and Execute Matching Engine ─────────────
  console.log('Step 2: Evaluating Buyer Matches against listing…');
  const { data: dbBuyers, error: buyErr } = await supabase
    .from('buyer_requirements')
    .select('*');

  assert.equal(buyErr, null, `Buyers fetch failed: ${buyErr?.message}`);

  // Combine DB buyers with catalog buyers
  const allBuyers = [...(dbBuyers || []), ...sampleBuyers];
  const normalizedListingItem = normalizeListing(savedListing);
  const matchReport = matchListingWithBuyers(normalizedListingItem, allBuyers);

  assert.ok(matchReport.compatibleCount > 0, 'Expected at least 1 compatible buyer for Paddy Straw');
  assert.ok(matchReport.topMatches.length >= 1, 'Expected at least 1 top match');
  console.log(`  ✓ Matched ${matchReport.compatibleCount} compatible buyers out of ${matchReport.totalEvaluated} evaluated`);

  // ── Step 3: Verify Location Distance & Potential Value ───────────
  console.log('Step 3: Verifying Distance, Map Coordinates & Potential Value…');
  const topMatch = matchReport.topMatches[0];
  const buyer = topMatch.buyer;
  const result = topMatch.matchResult;

  // Verify coordinates
  const originCoords = resolveCoordinates(normalizedListingItem);
  const destCoords = resolveCoordinates(buyer);
  assert.ok(originCoords, 'Origin coordinates should resolve for Anand, Gujarat');
  assert.ok(destCoords, 'Destination coordinates should resolve');

  const coordDist = calculateHaversineDistanceKm(originCoords, destCoords);
  assert.ok(coordDist != null, 'Coordinate distance should be calculated');
  console.log(`  ✓ Origin coords: ${originCoords}, Dest coords: ${destCoords}`);
  console.log(`  ✓ Estimated distance: ${coordDist} km (Anand → ${buyer.location})`);

  // Verify Potential Value calculation (Feature 4)
  if (buyer.pricePerTonne != null) {
    const expectedValue = 25 * buyer.pricePerTonne;
    assert.equal(result.metadata.pricing.indicativeValue, expectedValue);
    console.log(`  ✓ Potential lot value: ₹${expectedValue.toLocaleString('en-IN')} (25t × ₹${buyer.pricePerTonne}/t)`);
  } else {
    assert.equal(result.metadata.pricing.priceLabel, 'Price unavailable');
    console.log(`  ✓ Buyer has no price published: correctly labeled 'Price unavailable'`);
  }

  // Verify Match Explanation (Feature 2)
  assert.ok(result.explanation.residue.includes('accepted feedstock'));
  assert.ok(result.explanation.quantity.length > 0);
  assert.ok(result.explanation.distance.length > 0);
  assert.ok(result.explanation.capacity.length > 0);
  assert.ok(result.explanation.useCase.length > 0);
  console.log(`  ✓ 5-dimension match explanation verified: ${result.explanation.summary}`);

  // ── Step 4: Submit Contact / Pickup Request in Supabase ──────────
  console.log('Step 4: Submitting Contact/Pickup Request to Supabase…');
  const requestPayload = {
    listing_id: savedListing.id,
    buyer_id: buyer.id.includes('-') ? buyer.id : null,
    demo_buyer_ref: buyer.id.includes('-') ? null : buyer.id,
    request_type: 'pickup',
    message: `Test journey pickup request: Have 25 tonnes of Paddy Straw available at Anand farm. Looking to schedule pickup.`,
    requester_name: testFarmerName,
    requester_email: `testfarmer.${timestamp}@example.com`,
    status: 'pending',
    is_demo: false, // REAL request
  };

  const { data: savedRequest, error: reqErr } = await supabase
    .from('contact_requests')
    .insert(requestPayload)
    .select()
    .single();

  assert.equal(reqErr, null, `Contact request submission failed: ${reqErr?.message}`);
  assert.ok(savedRequest?.id, 'Expected generated UUID for request');
  assert.equal(savedRequest.status, 'pending');
  assert.equal(savedRequest.is_demo, false);
  console.log(`  ✓ Contact request recorded in Supabase with ID: ${savedRequest.id}`);

  // ── Step 5: Verify Dashboard Stats Distinguish Real vs Demo ──────
  console.log('Step 5: Verifying Dashboard Stats (Real vs Sample Distinction)…');
  const [allListingsRes, allRequestsRes] = await Promise.all([
    supabase.from('farmer_listings').select('id, quantity_tonnes, is_demo'),
    supabase.from('contact_requests').select('id, is_demo'),
  ]);

  const realListings = allListingsRes.data.filter((l) => !l.is_demo);
  const demoListings = allListingsRes.data.filter((l) => l.is_demo);
  const realRequests = allRequestsRes.data.filter((r) => !r.is_demo);
  const demoRequests = allRequestsRes.data.filter((r) => r.is_demo);

  assert.ok(realListings.some((l) => l.id === savedListing.id), 'Newly created listing must be present in real listings');
  assert.ok(realRequests.some((r) => r.id === savedRequest.id), 'Newly created request must be present in real requests');
  assert.ok(realListings.length >= 1, 'Real listings count should be >= 1');
  assert.ok(demoListings.length >= 1, 'Demo listings count should be >= 1');

  console.log(`  ✓ Real Listings in DB: ${realListings.length} (Sample seed listings: ${demoListings.length})`);
  console.log(`  ✓ Real Requests in DB: ${realRequests.length} (Sample seed requests: ${demoRequests.length})`);

  console.log('\n🎉 Complete User Journey Verified Successfully from end to end!\n');
}

runJourney().catch((err) => {
  console.error('❌ Journey failed with error:', err);
  process.exit(1);
});
