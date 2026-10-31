// src/lib/db.js
// ─────────────────────────────────────────────────────────────────
// Data-access layer — all Supabase queries live here.
// Pages import these functions; they never import supabase directly.
// ─────────────────────────────────────────────────────────────────
import { supabase, isConfigured } from './supabase.js';

/** Sentinel error returned when Supabase is not yet configured. */
const NOT_CONFIGURED = {
  data: null,
  error: {
    message: 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env.local file.',
    code: 'NOT_CONFIGURED',
  },
};

// ─── Farmer Listings ─────────────────────────────────────────────

/**
 * Insert a new farmer residue listing.
 * quantity is always stored as tonnes (conversion handled here).
 */
export async function createFarmerListing(formData, userId = null) {
  if (!isConfigured) return NOT_CONFIGURED;

  const quantityTonnes = toTonnes(Number(formData.quantity), formData.unit);

  const payload = {
    farmer_name:        formData.farmerName.trim(),
    contact_phone:      formData.contactPhone?.trim() || null,
    contact_email:      formData.contactEmail?.trim()  || null,
    residue_type:       formData.residueType,
    quantity_tonnes:    quantityTonnes,
    location:           formData.location.trim(),
    district:           formData.district?.trim()       || null,
    state:              formData.state.trim(),
    availability_date:  formData.availabilityDate,
    pickup_preference:  formData.pickupPreference,
    notes:              formData.notes?.trim()          || null,
    status:             'active',
    is_demo:            false,
  };

  const effectiveUserId = userId || formData.userId;
  if (effectiveUserId) {
    payload.user_id = effectiveUserId;
  }

  let { data, error } = await supabase
    .from('farmer_listings')
    .insert(payload)
    .select()
    .single();

  // Gracefully fallback if user_id column does not exist yet on existing tables
  if (error && payload.user_id && (error.code === '42703' || error.code === 'PGRST204' || error.message?.includes('user_id'))) {
    delete payload.user_id;
    const retry = await supabase
      .from('farmer_listings')
      .insert(payload)
      .select()
      .single();
    data = retry.data;
    error = retry.error;
  }

  return { data, error };
}

/**
 * Fetch all active farmer listings (real + demo).
 */
export async function fetchFarmerListings({ includeDemoRows = true } = {}) {
  if (!isConfigured) return NOT_CONFIGURED;

  let query = supabase
    .from('farmer_listings')
    .select('*')
    .order('created_at', { ascending: false });

  if (!includeDemoRows) {
    query = query.eq('is_demo', false);
  }

  const { data, error } = await query;
  return { data, error };
}

/**
 * Fetch a single listing by UUID.
 */
export async function fetchListingById(id) {
  if (!isConfigured) return NOT_CONFIGURED;

  const { data, error } = await supabase
    .from('farmer_listings')
    .select('*')
    .eq('id', id)
    .single();

  return { data, error };
}

/**
 * Update listing status  (e.g. 'active' → 'matched').
 */
export async function updateListingStatus(id, status) {
  if (!isConfigured) return NOT_CONFIGURED;

  const { data, error } = await supabase
    .from('farmer_listings')
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  return { data, error };
}

// ─── Buyer Requirements ──────────────────────────────────────────

/**
 * Insert a new buyer demand profile.
 */
export async function createBuyerRequirement(formData, userId = null) {
  if (!isConfigured) return NOT_CONFIGURED;

  const payload = {
    org_name:                   formData.orgName.trim(),
    org_type:                   formData.orgType                   || null,
    contact_person:             formData.contactPerson?.trim()      || null,
    contact_email:              formData.contactEmail?.trim()       || null,
    contact_phone:              formData.contactPhone?.trim()       || null,
    accepted_types:             formData.acceptedTypes,             // text[]
    required_quantity_tonnes:   Number(formData.requiredQuantity),
    max_intake_tonnes:          formData.maxIntake ? Number(formData.maxIntake) : null,
    intended_use:               formData.intendedUse,
    location:                   formData.location.trim(),
    state:                      formData.state.trim(),
    availability_status:        formData.available,
    notes:                      formData.notes?.trim()              || null,
    is_demo:                    false,
  };

  const effectiveUserId = userId || formData.userId;
  if (effectiveUserId) {
    payload.user_id = effectiveUserId;
  }

  let { data, error } = await supabase
    .from('buyer_requirements')
    .insert(payload)
    .select()
    .single();

  // Gracefully fallback if user_id column does not exist yet on existing tables
  if (error && payload.user_id && (error.code === '42703' || error.code === 'PGRST204' || error.message?.includes('user_id'))) {
    delete payload.user_id;
    const retry = await supabase
      .from('buyer_requirements')
      .insert(payload)
      .select()
      .single();
    data = retry.data;
    error = retry.error;
  }

  return { data, error };
}

/**
 * Fetch all buyer requirements.
 */
export async function fetchBuyerRequirements({ includeDemoRows = true } = {}) {
  if (!isConfigured) return NOT_CONFIGURED;

  let query = supabase
    .from('buyer_requirements')
    .select('*')
    .order('created_at', { ascending: false });

  if (!includeDemoRows) {
    query = query.eq('is_demo', false);
  }

  const { data, error } = await query;
  return { data, error };
}

/**
 * Fetch a single buyer requirement by UUID.
 */
export async function fetchBuyerById(id) {
  if (!isConfigured) return NOT_CONFIGURED;

  const { data, error } = await supabase
    .from('buyer_requirements')
    .select('*')
    .eq('id', id)
    .single();

  return { data, error };
}

// ─── Contact / Pickup Requests ───────────────────────────────────

/**
 * Submit a contact or pickup request.
 * listingId  – UUID of a real farmer_listings row (or null for demo)
 * demoBuyerRef – text ID like 'B001' when targeting a sample buyer
 */
export async function createContactRequest({
  listingId,
  buyerId,
  demoBuyerRef,
  requestType,
  message,
  requesterName,
  requesterEmail,
}) {
  if (!isConfigured) return NOT_CONFIGURED;

  const payload = {
    listing_id:      listingId      || null,
    buyer_id:        buyerId        || null,
    demo_buyer_ref:  demoBuyerRef   || null,
    request_type:    requestType,
    message:         message.trim(),
    requester_name:  requesterName  || null,
    requester_email: requesterEmail || null,
    status:          'pending',
    is_demo:         !!demoBuyerRef,   // mark as demo if targeting a sample buyer
  };

  const { data, error } = await supabase
    .from('contact_requests')
    .insert(payload)
    .select()
    .single();

  return { data, error };
}

/**
 * Fetch all contact requests (most recent first).
 */
export async function fetchContactRequests() {
  if (!isConfigured) return NOT_CONFIGURED;

  const { data, error } = await supabase
    .from('contact_requests')
    .select(`
      *,
      farmer_listings ( farmer_name, residue_type, location, state ),
      buyer_requirements ( org_name, location )
    `)
    .order('created_at', { ascending: false });

  return { data, error };
}

/**
 * Update contact request status (e.g. 'pending' → 'accepted' | 'rejected' | 'completed').
 * Note: Subject to Supabase Row Level Security.
 */
export async function updateContactRequestStatus(id, status) {
  if (!isConfigured) return NOT_CONFIGURED;

  const { data, error } = await supabase
    .from('contact_requests')
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  return { data, error };
}

// ─── Dashboard summary ───────────────────────────────────────────

/**
 * Return live counts and quantities distinguishing real user activity from sample demo seed rows.
 */
export async function fetchDashboardStats() {
  if (!isConfigured) return NOT_CONFIGURED;

  const [listingsRes, buyersRes, requestsRes] = await Promise.all([
    supabase.from('farmer_listings').select('quantity_tonnes, status, is_demo'),
    supabase.from('buyer_requirements').select('id, is_demo'),
    supabase.from('contact_requests').select('id, is_demo, demo_buyer_ref, status'),
  ]);

  if (listingsRes.error) return { data: null, error: listingsRes.error };

  const allListings = listingsRes.data ?? [];
  const allBuyers = buyersRes.data ?? [];
  const allRequests = requestsRes.data ?? [];

  // Listings: Real vs Demo
  const realListings = allListings.filter((l) => !l.is_demo);
  const demoListings = allListings.filter((l) => !!l.is_demo);

  const realListingsCount = realListings.length;
  const demoListingsCount = demoListings.length;
  const totalListings = allListings.length;

  const realQuantityTonnes = Number(
    realListings.reduce((sum, l) => sum + Number(l.quantity_tonnes || 0), 0).toFixed(1)
  );
  const demoQuantityTonnes = Number(
    demoListings.reduce((sum, l) => sum + Number(l.quantity_tonnes || 0), 0).toFixed(1)
  );
  const totalQuantityTonnes = Number((realQuantityTonnes + demoQuantityTonnes).toFixed(1));

  const realMatchedTonnes = Number(
    realListings
      .filter((l) => l.status === 'matched')
      .reduce((sum, l) => sum + Number(l.quantity_tonnes || 0), 0)
      .toFixed(1)
  );
  const demoMatchedTonnes = Number(
    demoListings
      .filter((l) => l.status === 'matched')
      .reduce((sum, l) => sum + Number(l.quantity_tonnes || 0), 0)
      .toFixed(1)
  );
  const tonsRedirected = Number((realMatchedTonnes + demoMatchedTonnes).toFixed(1));

  // Buyers: Real vs Demo
  const realBuyers = allBuyers.filter((b) => !b.is_demo).length;
  const demoBuyers = allBuyers.filter((b) => !!b.is_demo).length;
  const totalBuyers = allBuyers.length;

  // Requests: Real vs Demo
  const realRequests = allRequests.filter((r) => !r.is_demo && !r.demo_buyer_ref).length;
  const demoRequests = allRequests.filter((r) => !!r.is_demo || !!r.demo_buyer_ref).length;
  const totalRequests = allRequests.length;

  return {
    data: {
      totalListings,
      totalBuyers,
      totalRequests,
      totalQuantityTonnes,
      tonsRedirected,
      real: {
        listings: realListingsCount,
        quantityTonnes: realQuantityTonnes,
        matchedTonnes: realMatchedTonnes,
        buyers: realBuyers,
        requests: realRequests,
      },
      demo: {
        listings: demoListingsCount,
        quantityTonnes: demoQuantityTonnes,
        matchedTonnes: demoMatchedTonnes,
        buyers: demoBuyers,
        requests: demoRequests,
      },
    },
    error: null,
  };
}

// ─── User Profiles & Auth ────────────────────────────────────────

/**
 * Fetch a user profile by authenticated user UUID.
 */
export async function fetchUserProfile(userId) {
  if (!isConfigured || !supabase || !userId) return NOT_CONFIGURED;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  return { data, error };
}

/**
 * Upsert user profile (used during signup or automatic synchronization).
 */
export async function upsertUserProfile(profileData) {
  if (!isConfigured || !supabase || !profileData?.id) return NOT_CONFIGURED;

  const fullName = profileData.full_name?.trim() || profileData.fullName?.trim() || 'Member';
  const payload = {
    id: profileData.id,
    full_name: fullName,
    email: profileData.email?.trim() || null,
    phone: profileData.phone?.trim() || null,
    role: profileData.role || 'farmer',
    location: profileData.location?.trim() || null,
    district: profileData.district?.trim() || null,
    state: profileData.state?.trim() || null,
    avatar_url: profileData.avatar_url || profileData.avatarUrl || null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('profiles')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single();

  return { data, error };
}

/**
 * Update an existing user profile with partial fields.
 */
export async function updateUserProfile(userId, updates) {
  if (!isConfigured || !supabase || !userId) return NOT_CONFIGURED;

  const payload = {
    updated_at: new Date().toISOString(),
  };

  if (updates.full_name !== undefined || updates.fullName !== undefined) {
    payload.full_name = (updates.full_name || updates.fullName).trim();
  }
  if (updates.phone !== undefined) {
    payload.phone = updates.phone ? updates.phone.trim() : null;
  }
  if (updates.role !== undefined) {
    payload.role = updates.role;
  }
  if (updates.location !== undefined) {
    payload.location = updates.location ? updates.location.trim() : null;
  }
  if (updates.district !== undefined) {
    payload.district = updates.district ? updates.district.trim() : null;
  }
  if (updates.state !== undefined) {
    payload.state = updates.state ? updates.state.trim() : null;
  }
  if (updates.avatar_url !== undefined || updates.avatarUrl !== undefined) {
    payload.avatar_url = (updates.avatar_url || updates.avatarUrl)?.trim() || null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', userId)
    .select()
    .single();

  return { data, error };
}

/**
 * Fetch all listings created by a specific user.
 */
export async function fetchUserListings(userId) {
  if (!isConfigured || !supabase || !userId) return NOT_CONFIGURED;

  const { data, error } = await supabase
    .from('farmer_listings')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  return { data, error };
}

/**
 * Fetch all buyer requirements registered by a specific user.
 */
export async function fetchUserBuyerDemands(userId) {
  if (!isConfigured || !supabase || !userId) return NOT_CONFIGURED;

  const { data, error } = await supabase
    .from('buyer_requirements')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  return { data, error };
}

// ─── Utility ─────────────────────────────────────────────────────

/** Convert quantity from any unit to tonnes. */
function toTonnes(value, unit) {
  switch (unit) {
    case 'quintals': return value / 10;
    case 'kg':       return value / 1000;
    default:         return value;       // already tonnes
  }
}

/** Format a Supabase error for display. */
export function formatDbError(error) {
  if (!error) return null;

  if (error.code === 'NOT_CONFIGURED') {
    return error.message;
  }

  // Postgres constraint violations
  if (error.code === '23514') return 'A value failed a database check constraint. Please review your inputs.';
  if (error.code === '23502') return 'A required field is missing.';
  if (error.code === '23503') return 'A referenced record does not exist.';
  if (error.code === '42501') {
    return 'Permission denied by Row Level Security: Mutating status requires authenticated administrative privileges or a secure backend Edge Function. Public anonymous clients cannot modify records.';
  }

  // Network / Supabase errors
  if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
    return 'Network error — please check your internet connection and try again.';
  }

  return error.message || 'An unexpected database error occurred.';
}
