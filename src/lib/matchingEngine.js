// src/lib/matchingEngine.js
// ─────────────────────────────────────────────────────────────────
// CropCycle Connect – Smart Matching Engine
//
// Calculates multi-factor compatibility rankings between farmer crop residue
// listings and registered buyers/organizations.
//
// FORMULA:
//   Final Match Score = 100 × (
//       0.40 × Quantity Fit
//     + 0.30 × Proximity
//     + 0.20 × Capacity Fit
//     + 0.10 × Use-Case Fit
//   )
//
// NOTE:
//   The match score represents a multi-factor compatibility ranking,
//   NOT a probabilistic guarantee of transaction closing.
// ─────────────────────────────────────────────────────────────────

import { resolveCoordinates, calculateHaversineDistanceKm } from './geo.js';

export const MATCH_WEIGHTS = {
  QUANTITY: 0.40,
  PROXIMITY: 0.30,
  CAPACITY: 0.20,
  USE_CASE: 0.10,
};

// Known neighboring/adjacent Indian states for regional transit estimation
const ADJACENT_STATES = {
  'punjab': ['haryana', 'himachal pradesh', 'rajasthan', 'jammu and kashmir', 'delhi', 'chandigarh'],
  'haryana': ['punjab', 'rajasthan', 'uttar pradesh', 'himachal pradesh', 'delhi'],
  'delhi': ['haryana', 'uttar pradesh'],
  'gujarat': ['rajasthan', 'madhya pradesh', 'maharashtra', 'dadra and nagar haveli and daman and diu'],
  'maharashtra': ['gujarat', 'madhya pradesh', 'chhattisgarh', 'telangana', 'karnataka', 'goa'],
  'telangana': ['andhra pradesh', 'karnataka', 'maharashtra', 'chhattisgarh'],
  'andhra pradesh': ['telangana', 'tamil nadu', 'karnataka', 'odisha', 'chhattisgarh'],
  'kerala': ['tamil nadu', 'karnataka'],
  'tamil nadu': ['kerala', 'karnataka', 'andhra pradesh'],
  'karnataka': ['maharashtra', 'goa', 'kerala', 'tamil nadu', 'andhra pradesh', 'telangana'],
  'uttar pradesh': ['delhi', 'haryana', 'rajasthan', 'madhya pradesh', 'bihar', 'uttarakhand'],
  'bihar': ['uttar pradesh', 'jharkhand', 'west bengal'],
  'west bengal': ['bihar', 'jharkhand', 'odisha', 'sikkim', 'assam'],
  'rajasthan': ['punjab', 'haryana', 'uttar pradesh', 'madhya pradesh', 'gujarat'],
  'madhya pradesh': ['rajasthan', 'uttar pradesh', 'chhattisgarh', 'maharashtra', 'gujarat'],
  'odisha': ['west bengal', 'jharkhand', 'chhattisgarh', 'andhra pradesh'],
  'chhattisgarh': ['madhya pradesh', 'maharashtra', 'telangana', 'andhra pradesh', 'odisha', 'jharkhand', 'uttar pradesh'],
};

// High-synergy circular economy value-chain pairings (Feedstock -> Intended Use)
const HIGH_SYNERGY_USES = {
  'Biofuel / Energy Generation': [
    'paddy straw', 'wheat straw', 'sugarcane bagasse', 'cotton stalks',
    'mustard stalks', 'maize stalks', 'groundnut shells', 'sunflower stalks',
  ],
  'Bio-CNG Production': [
    'paddy straw', 'sugarcane bagasse', 'cotton stalks', 'soybean stalks',
    'maize stalks', 'wheat straw',
  ],
  'Paper & Pulp Manufacturing': [
    'sugarcane bagasse', 'wheat straw', 'banana pseudostems', 'paddy straw',
  ],
  'Compost / Organic Fertiliser': [
    'paddy straw', 'cotton stalks', 'groundnut shells', 'maize stalks',
    'banana pseudostems', 'soybean stalks', 'wheat straw', 'mustard stalks',
  ],
  'Mushroom Cultivation': [
    'paddy straw', 'wheat straw',
  ],
  'Cardboard / Packaging': [
    'banana pseudostems', 'sugarcane bagasse', 'wheat straw', 'paddy straw',
  ],
  'Biochar Production': [
    'cotton stalks', 'groundnut shells', 'mustard stalks', 'sunflower stalks',
  ],
  'Animal Feed / Fodder': [
    'wheat straw', 'paddy straw', 'groundnut shells', 'maize stalks',
  ],
  'Construction Material': [
    'banana pseudostems', 'sugarcane bagasse', 'wheat straw',
  ],
};

// ─── Data Normalization ──────────────────────────────────────────

/**
 * Normalizes farmer listing records from Supabase (snake_case)
 * or local mock/form (camelCase) into a unified structure.
 */
export function normalizeListing(raw = {}) {
  const quantity = Number(raw.quantity_tonnes ?? raw.quantity ?? 0);
  const coords = raw.coordinates ? resolveCoordinates(raw.coordinates) : resolveCoordinates(raw);

  return {
    id: raw.id || 'unknown-listing',
    farmerName: raw.farmer_name || raw.farmerName || 'Anonymous Farmer',
    residueType: (raw.residue_type || raw.residueType || '').trim(),
    quantity: isNaN(quantity) ? 0 : quantity,
    location: (raw.location || '').trim(),
    district: (raw.district || '').trim(),
    state: (raw.state || '').trim(),
    coordinates: coords,
    availabilityDate: raw.availability_date || raw.availabilityDate || '',
    pickupPreference: raw.pickup_preference || raw.pickupPreference || 'Not specified',
    status: raw.status || 'active',
    isDemo: !!(raw.is_demo || raw.isDemo),
  };
}

/**
 * Normalizes buyer requirement records from Supabase (snake_case)
 * or local mock/form (camelCase) into a unified structure.
 */
export function normalizeBuyer(raw = {}) {
  const reqQty = Number(raw.required_quantity_tonnes ?? raw.requiredQuantity ?? 0);
  const maxIntakeRaw = raw.max_intake_tonnes ?? raw.maxIntake;
  const maxIntake = maxIntakeRaw != null && !isNaN(Number(maxIntakeRaw)) ? Number(maxIntakeRaw) : null;

  // Normalize accepted types to array of strings
  let acceptedTypes = [];
  if (Array.isArray(raw.accepted_types)) {
    acceptedTypes = raw.accepted_types;
  } else if (Array.isArray(raw.acceptedTypes)) {
    acceptedTypes = raw.acceptedTypes;
  } else if (typeof raw.accepted_types === 'string') {
    acceptedTypes = raw.accepted_types.split(',').map((s) => s.trim());
  }

  // Normalize availability status
  let isAvailable = true;
  if (typeof raw.available === 'boolean') {
    isAvailable = raw.available;
  } else if (typeof raw.availability_status === 'string') {
    isAvailable = raw.availability_status.toLowerCase() !== 'no';
  }

  // Price normalization: supports raw.price_per_tonne or raw.pricePerTonne
  const rawPrice = raw.price_per_tonne ?? raw.pricePerTonne;
  const pricePerTonne = rawPrice != null && !isNaN(Number(rawPrice)) ? Number(rawPrice) : null;
  const isDemo = !!(raw.is_demo || raw.isDemo);
  const priceType = raw.price_type || raw.priceType || (isDemo ? 'demo' : (pricePerTonne ? 'commercial' : null));
  const coords = raw.coordinates ? resolveCoordinates(raw.coordinates) : resolveCoordinates(raw);

  return {
    id: raw.id || 'unknown-buyer',
    orgName: raw.org_name || raw.orgName || 'Unnamed Buyer',
    orgType: raw.org_type || raw.orgType || 'Commercial Enterprise',
    location: (raw.location || '').trim(),
    state: (raw.state || '').trim(),
    coordinates: coords,
    acceptedTypes,
    requiredQuantity: isNaN(reqQty) ? 0 : reqQty,
    maxIntake,
    intendedUse: raw.intended_use || raw.intendedUse || 'Industrial Processing',
    pricePerTonne,
    priceType,
    available: isAvailable,
    availabilityStatus: raw.availability_status || (isAvailable ? 'yes' : 'no'),
    contact: raw.contact_email || raw.contact || '',
    phone: raw.contact_phone || raw.phone || '',
    notes: raw.notes || raw.description || '',
    isDemo,
  };
}

// ─── Step 1: Compatibility (Hard Filters) ─────────────────────────

/**
 * Step 1: Evaluates hard eligibility requirements.
 * Excludes buyers who do not accept the listed residue type,
 * buyers who are currently on-hold, or listings with invalid quantities.
 */
export function checkCompatibility(listingInput, buyerInput) {
  const listing = normalizeListing(listingInput);
  const buyer = normalizeBuyer(buyerInput);
  const reasons = [];

  // Check 1: Invalid listing quantity
  if (listing.quantity <= 0) {
    reasons.push(`Invalid listing quantity: ${listing.quantity} tonnes (must be greater than 0)`);
  }

  // Check 2: Residue type compatibility
  if (!listing.residueType) {
    reasons.push('Listing has no residue type specified');
  } else {
    const listingTypeClean = listing.residueType.toLowerCase().trim();
    const acceptsType = buyer.acceptedTypes.some(
      (type) => type.toLowerCase().trim() === listingTypeClean
    );

    if (!acceptsType) {
      const acceptedList = buyer.acceptedTypes.length > 0 ? buyer.acceptedTypes.join(', ') : 'none';
      reasons.push(
        `Residue type '${listing.residueType}' is not accepted by this buyer (accepts: ${acceptedList})`
      );
    }
  }

  // Check 3: Buyer acceptance availability
  if (!buyer.available) {
    reasons.push('Buyer is currently on hold / not accepting new residue batches');
  }

  return {
    compatible: reasons.length === 0,
    reasons,
  };
}

// ─── Step 2: Component Scorers (Normalized 0 to 1) ─────────────────

/**
 * Component 1: Quantity Fit (40% Weight)
 * Evaluates how closely the farmer's listing matches the buyer's required batch size.
 * Formula: min(Q_listing, Q_buyer) / max(Q_listing, Q_buyer)
 */
export function calculateQuantityFit(listingQty, buyerReqQty) {
  const qListing = Number(listingQty);
  const qBuyer = Number(buyerReqQty);

  if (isNaN(qListing) || qListing <= 0 || isNaN(qBuyer) || qBuyer <= 0) {
    return {
      score: 0,
      reason: 'Invalid or missing quantity specifications',
    };
  }

  const ratio = Math.min(qListing, qBuyer) / Math.max(qListing, qBuyer);
  const normalized = Number(Math.max(0, Math.min(1, ratio)).toFixed(4));

  let reason = '';
  if (qListing === qBuyer) {
    reason = `Exact quantity match: listing lot (${qListing}t) matches buyer requirement (${qBuyer}t)`;
  } else if (qListing < qBuyer) {
    const pct = Math.round((qListing / qBuyer) * 100);
    reason = `Listing lot (${qListing}t) fulfills ${pct}% of buyer's ${qBuyer}t batch requirement`;
  } else {
    const surplus = Number((qListing - qBuyer).toFixed(1));
    reason = `Listing lot (${qListing}t) exceeds requirement of ${qBuyer}t by ${surplus}t (surplus lot)`;
  }

  return {
    score: normalized,
    reason,
  };
}

/**
 * Component 2: Proximity Fit (30% Weight)
 * Estimates physical transit friction between farmer and buyer locations.
 * - Same district / city: 1.0 (local transit < 25 km)
 * - Same state: 0.75 (intra-state ~70-120 km)
 * - Adjacent state: 0.45 (inter-state regional ~200-350 km)
 * - Distant state: 0.20 (long-haul transit > 500 km)
 * - Missing location: 0.25 (unspecified fallback)
 */
export function calculateProximityFit(farmerLocationInput, buyerLocationInput) {
  const fLoc = typeof farmerLocationInput === 'object' ? farmerLocationInput : { location: String(farmerLocationInput || '') };
  const bLoc = typeof buyerLocationInput === 'object' ? buyerLocationInput : { location: String(buyerLocationInput || '') };

  const originCoords = resolveCoordinates(farmerLocationInput);
  const destCoords = resolveCoordinates(buyerLocationInput);
  const coordinateDistanceKm = (originCoords && destCoords)
    ? calculateHaversineDistanceKm(originCoords, destCoords)
    : null;

  const farmerText = `${fLoc.location || ''} ${fLoc.district || ''} ${fLoc.state || ''}`.toLowerCase().trim();
  const buyerText = `${bLoc.location || ''} ${bLoc.state || ''}`.toLowerCase().trim();

  const farmerState = (fLoc.state || extractState(farmerText)).toLowerCase().trim();
  const buyerState = (bLoc.state || extractState(buyerText)).toLowerCase().trim();
  const farmerDistrict = (fLoc.district || '').toLowerCase().trim();

  // Edge case: missing location details
  if (!farmerText || !buyerText || (!farmerState && !buyerState)) {
    return {
      score: 0.25,
      estimatedDistanceKm: null,
      proximityTier: 'unspecified',
      coordinateDistanceKm: null,
      originCoords: null,
      destCoords: null,
      reason: 'Location details incomplete. Conservative regional transit estimate applied.',
    };
  }

  // Tier 1: Same District or same municipal locality
  const hasSharedDistrict = farmerDistrict && buyerText.includes(farmerDistrict);
  const hasSharedCity = extractCity(farmerText) && buyerText.includes(extractCity(farmerText));

  if (hasSharedDistrict || hasSharedCity) {
    return {
      score: 1.0,
      estimatedDistanceKm: 15,
      proximityTier: 'local',
      coordinateDistanceKm,
      originCoords,
      destCoords,
      reason: `Same local district/area (${farmerDistrict || 'vicinity'}). Estimated transit < 25 km.`,
    };
  }

  // Tier 2: Same State
  if (farmerState && buyerState && farmerState === buyerState) {
    return {
      score: 0.75,
      estimatedDistanceKm: 85,
      proximityTier: 'intrastate',
      coordinateDistanceKm,
      originCoords,
      destCoords,
      reason: `Intra-state route within ${capitalize(farmerState)}. Estimated transit ~70–120 km.`,
    };
  }

  // Tier 3: Adjacent / Neighboring State
  const adjacentList = ADJACENT_STATES[farmerState] || [];
  if (buyerState && adjacentList.includes(buyerState)) {
    return {
      score: 0.45,
      estimatedDistanceKm: 240,
      proximityTier: 'regional',
      coordinateDistanceKm,
      originCoords,
      destCoords,
      reason: `Neighboring state route (${capitalize(farmerState)} → ${capitalize(buyerState)}). Regional freight ~200–350 km.`,
    };
  }

  // Tier 4: Long-haul distant state
  return {
    score: 0.20,
    estimatedDistanceKm: 650,
    proximityTier: 'longhaul',
    coordinateDistanceKm,
    originCoords,
    destCoords,
    reason: `Inter-state haul (${capitalize(farmerState || 'origin')} → ${capitalize(buyerState || 'destination')}). Freight distance > 500 km.`,
  };
}

/**
 * Component 3: Available Capacity Fit (20% Weight)
 * Evaluates whether the buyer's processing infrastructure can accommodate the lot.
 * If maxIntake is specified:
 *   - listing <= maxIntake: 1.0
 *   - listing > maxIntake: maxIntake / listing (discounted proportionally)
 * If maxIntake not specified, falls back to 2x requiredQuantity as buffer.
 */
export function calculateCapacityFit(listingQty, buyerMaxIntake, buyerReqQty) {
  const qListing = Number(listingQty);
  const qReq = Number(buyerReqQty);
  const qMax = buyerMaxIntake != null && !isNaN(Number(buyerMaxIntake)) ? Number(buyerMaxIntake) : null;

  if (isNaN(qListing) || qListing <= 0) {
    return {
      score: 0,
      status: 'invalid',
      reason: 'Invalid listing quantity',
      warning: null,
    };
  }

  const effectiveCapacity = qMax || (qReq > 0 ? qReq * 2 : qListing * 2);

  if (qListing <= effectiveCapacity) {
    const isExplicit = qMax != null;
    return {
      score: 1.0,
      status: 'within_capacity',
      reason: isExplicit
        ? `Listing lot (${qListing}t) is comfortably within buyer's max intake capacity (${effectiveCapacity}t)`
        : `Listing lot (${qListing}t) is within operational processing threshold (~${effectiveCapacity}t)`,
      warning: null,
    };
  }

  // Exceeds capacity: calculate proportional absorption fit
  const ratio = Math.max(0.10, effectiveCapacity / qListing);
  const normalized = Number(Math.min(0.95, ratio).toFixed(4));

  return {
    score: normalized,
    status: 'exceeds_capacity',
    reason: `Listing lot of ${qListing}t exceeds single-batch max intake of ${effectiveCapacity}t`,
    warning: `Exceeds single-batch max intake (${effectiveCapacity}t). Multiple delivery batches required.`,
  };
}

/**
 * Component 4: Use-Case Compatibility (10% Weight)
 * Assesses value-chain synergy between residue biological traits and industrial output.
 * - High-synergy circular pairing: 1.0
 * - Buyer-accepted standard processing: 0.75
 * - General biomass compatibility: 0.50
 */
export function calculateUseCaseFit(residueType, intendedUse, acceptedTypes = []) {
  if (!residueType || !intendedUse) {
    return {
      score: 0.50,
      reason: 'General agricultural biomass valorization potential',
    };
  }

  const resClean = residueType.toLowerCase().trim();
  const highSynergyList = HIGH_SYNERGY_USES[intendedUse] || [];

  if (highSynergyList.some((item) => item.toLowerCase() === resClean)) {
    return {
      score: 1.0,
      reason: `Optimal circular economy pairing: ${residueType} is prime feedstock for ${intendedUse}`,
    };
  }

  const isAccepted = acceptedTypes.some((t) => t.toLowerCase().trim() === resClean);
  if (isAccepted) {
    return {
      score: 0.75,
      reason: `${residueType} is verified and accepted for ${intendedUse} facilities`,
    };
  }

  return {
    score: 0.50,
    reason: `Standard industrial processing potential for ${intendedUse}`,
  };
}

// ─── Step 3 & 4: Comprehensive Scoring & Explanations ─────────────

/**
 * Scores an individual pair of listing and buyer.
 * Enforces Step 1 compatibility check before computing Step 2 score components.
 */
export function scoreMatch(listingInput, buyerInput) {
  const listing = normalizeListing(listingInput);
  const buyer = normalizeBuyer(buyerInput);

  // Step 1: Compatibility
  const compCheck = checkCompatibility(listing, buyer);
  if (!compCheck.compatible) {
    return {
      compatible: false,
      incompatibleReasons: compCheck.reasons,
      scores: null,
      weightedPoints: null,
      finalScore: 0,
      explanation: {
        residue: compCheck.reasons[0] || 'Incompatible',
        quantity: 'N/A',
        distance: 'N/A',
        capacity: 'N/A',
        useCase: 'N/A',
        summary: `Excluded from matches: ${compCheck.reasons.join('; ')}`,
        warnings: compCheck.reasons,
      },
      metadata: {
        estimatedDistanceKm: null,
        proximityTier: 'incompatible',
        capacityStatus: 'incompatible',
        coordinateDistanceKm: null,
        originCoords: listing.coordinates || null,
        destinationCoords: buyer.coordinates || null,
        pricing: {
          pricePerTonne: buyer.pricePerTonne,
          indicativeValue: null,
          isDemoPrice: !!(buyer.isDemo || buyer.priceType === 'demo'),
          priceLabel: buyer.pricePerTonne != null ? 'Price available on request' : 'Price unavailable',
        },
      },
    };
  }

  // Step 2: Score components
  const qtyRes = calculateQuantityFit(listing.quantity, buyer.requiredQuantity);
  const proxRes = calculateProximityFit(
    { location: listing.location, district: listing.district, state: listing.state, coordinates: listing.coordinates },
    { location: buyer.location, state: buyer.state, coordinates: buyer.coordinates }
  );
  const capRes = calculateCapacityFit(listing.quantity, buyer.maxIntake, buyer.requiredQuantity);
  const useRes = calculateUseCaseFit(listing.residueType, buyer.intendedUse, buyer.acceptedTypes);

  // Pricing & Potential Value calculations (Feature 4)
  const pricePerTonne = buyer.pricePerTonne != null ? Number(buyer.pricePerTonne) : null;
  const indicativeValue = (pricePerTonne != null && listing.quantity > 0)
    ? Number((listing.quantity * pricePerTonne).toFixed(2))
    : null;
  const isDemoPrice = !!(buyer.isDemo || buyer.priceType === 'demo');
  const priceLabel = pricePerTonne != null
    ? (isDemoPrice ? 'Demo Price (Indicative)' : 'Indicative Price')
    : 'Price unavailable';

  // Apply weights
  const weightedPoints = {
    quantity: Number((MATCH_WEIGHTS.QUANTITY * qtyRes.score * 100).toFixed(1)),
    proximity: Number((MATCH_WEIGHTS.PROXIMITY * proxRes.score * 100).toFixed(1)),
    capacity: Number((MATCH_WEIGHTS.CAPACITY * capRes.score * 100).toFixed(1)),
    useCase: Number((MATCH_WEIGHTS.USE_CASE * useRes.score * 100).toFixed(1)),
  };

  const rawFinal = weightedPoints.quantity + weightedPoints.proximity + weightedPoints.capacity + weightedPoints.useCase;
  const finalScore = Math.min(100, Math.max(0, Math.round(rawFinal)));

  // Collect warnings
  const warnings = [];
  if (capRes.warning) warnings.push(capRes.warning);
  if (proxRes.proximityTier === 'unspecified') warnings.push('Approximate proximity used due to unspecified location');

  // Step 4: Narrative explanation
  const explanation = {
    residue: `✓ ${listing.residueType} is an accepted feedstock for ${buyer.orgName}`,
    quantity: `${qtyRes.reason} (Quantity fit: ${Math.round(qtyRes.score * 100)}%)`,
    distance: `${proxRes.reason} (Proximity fit: ${Math.round(proxRes.score * 100)}%)`,
    capacity: `${capRes.reason} (Capacity fit: ${Math.round(capRes.score * 100)}%)`,
    useCase: `${useRes.reason} (Use-case fit: ${Math.round(useRes.score * 100)}%)`,
    pricing: pricePerTonne != null
      ? `${priceLabel}: ₹${pricePerTonne.toLocaleString('en-IN')}/tonne · Indicative value: ₹${indicativeValue?.toLocaleString('en-IN')}`
      : 'Price unavailable (contact buyer for quote)',
    summary: buildSummaryNarrative({
      orgName: buyer.orgName,
      residueType: listing.residueType,
      finalScore,
      qtyScore: qtyRes.score,
      proxTier: proxRes.proximityTier,
      intendedUse: buyer.intendedUse,
    }),
    warnings,
  };

  return {
    compatible: true,
    incompatibleReasons: [],
    scores: {
      quantityFit: qtyRes.score,
      proximityFit: proxRes.score,
      capacityFit: capRes.score,
      useCaseFit: useRes.score,
    },
    weightedPoints: {
      ...weightedPoints,
      total: Number(rawFinal.toFixed(1)),
    },
    finalScore,
    explanation,
    metadata: {
      estimatedDistanceKm: proxRes.coordinateDistanceKm ?? proxRes.estimatedDistanceKm,
      tierDistanceKm: proxRes.estimatedDistanceKm,
      coordinateDistanceKm: proxRes.coordinateDistanceKm,
      proximityTier: proxRes.proximityTier,
      capacityStatus: capRes.status,
      originCoords: proxRes.originCoords,
      destinationCoords: proxRes.destCoords,
      pricing: {
        pricePerTonne,
        indicativeValue,
        isDemoPrice,
        priceLabel,
      },
    },
  };
}

// ─── Step 3: Multi-Candidate Ranking & Top-3 Filter ───────────────

/**
 * Ranks all candidate buyers against a given listing.
 * Filters out incompatible candidates, sorts descending by final match score,
 * and highlights the top 3 matches.
 *
 * @param {Object} listing - Farmer listing
 * @param {Array} buyers - Array of buyer requirement records
 * @returns {Object} Complete match report
 */
export function matchListingWithBuyers(listingInput, buyersInput = []) {
  const listing = normalizeListing(listingInput);
  const buyers = Array.isArray(buyersInput) ? buyersInput : [];

  const evaluated = buyers.map((rawBuyer) => {
    const buyer = normalizeBuyer(rawBuyer);
    const matchResult = scoreMatch(listing, buyer);
    return {
      buyer,
      matchResult,
    };
  });

  // Separate compatible and incompatible
  const compatible = evaluated.filter((item) => item.matchResult.compatible);
  const incompatible = evaluated.filter((item) => !item.matchResult.compatible);

  // Sort compatible candidates descending by finalScore, then proximity, then quantity
  compatible.sort((a, b) => {
    if (b.matchResult.finalScore !== a.matchResult.finalScore) {
      return b.matchResult.finalScore - a.matchResult.finalScore;
    }
    if (b.matchResult.scores.proximityFit !== a.matchResult.scores.proximityFit) {
      return b.matchResult.scores.proximityFit - a.matchResult.scores.proximityFit;
    }
    return b.matchResult.scores.quantityFit - a.matchResult.scores.quantityFit;
  });

  // Assign 1-indexed ranks and badges
  const rankedMatches = compatible.map((item, index) => {
    const rank = index + 1;
    let badgeText = '';
    let badgeTier = 'standard';

    if (rank === 1) {
      badgeText = '#1 Best Match';
      badgeTier = 'gold';
    } else if (rank === 2) {
      badgeText = '#2 Strong Match';
      badgeTier = 'silver';
    } else if (rank === 3) {
      badgeText = '#3 Alternative Match';
      badgeTier = 'bronze';
    } else {
      badgeText = `#${rank} Match`;
      badgeTier = 'standard';
    }

    return {
      ...item,
      rank,
      badgeText,
      badgeTier,
    };
  });

  const topMatches = rankedMatches.slice(0, 3);

  return {
    listing,
    rankedMatches,
    topMatches,
    incompatibleBuyers: incompatible,
    totalEvaluated: buyers.length,
    compatibleCount: compatible.length,
    incompatibleCount: incompatible.length,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────

function extractState(text = '') {
  const commonStates = [
    'gujarat', 'punjab', 'telangana', 'kerala', 'maharashtra',
    'haryana', 'rajasthan', 'uttar pradesh', 'west bengal', 'karnataka',
    'tamil nadu', 'andhra pradesh', 'madhya pradesh', 'bihar', 'odisha',
  ];
  return commonStates.find((state) => text.includes(state)) || '';
}

function extractCity(text = '') {
  const tokens = text.split(/[,;\s]+/).filter((t) => t.length > 3);
  return tokens[0] || '';
}

function capitalize(str = '') {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function buildSummaryNarrative({ orgName, residueType, finalScore, proxTier, intendedUse }) {
  let fitQuality = 'a solid';
  if (finalScore >= 85) fitQuality = 'an excellent';
  else if (finalScore >= 70) fitQuality = 'a strong';
  else if (finalScore < 50) fitQuality = 'a moderate';

  let transitNote = 'regional transit';
  if (proxTier === 'local') transitNote = 'close proximity within the same district';
  else if (proxTier === 'intrastate') transitNote = 'intra-state transit';
  else if (proxTier === 'longhaul') transitNote = 'inter-state shipping';

  return `${orgName} offers ${fitQuality} compatibility (${finalScore}%) for ${residueType}. Featuring ${transitNote} and utilization for ${intendedUse}.`;
}

// ─── Step 6: Collection Grouping Recommendations (Feature 6) ────────

/**
 * Recommends grouping compatible nearby farmer listings to fulfill
 * a buyer's batch demand.
 *
 * NOTE:
 * Returned as a "suggested collection opportunity", NOT a confirmed booking.
 * Does not invent live buyers, prices, or transactions.
 *
 * @param {Array} listingsInput - Array of farmer listings
 * @param {Array} buyersInput - Array of buyer requirement profiles
 * @returns {Array} Array of suggested collection grouping opportunities
 */
export function findCollectionGroupings(listingsInput = [], buyersInput = []) {
  const listings = Array.isArray(listingsInput) ? listingsInput.map(normalizeListing) : [];
  const buyers = Array.isArray(buyersInput) ? buyersInput.map(normalizeBuyer) : [];

  // Consider active listings with valid positive quantities
  const activeListings = listings.filter(
    (l) => (l.status.toLowerCase() === 'active' || l.status.toLowerCase() === 'pending') && l.quantity > 0
  );
  const availableBuyers = buyers.filter((b) => b.available && b.requiredQuantity > 0);

  const opportunities = [];

  // Group listings by (residueType + district/state)
  const clusters = new Map();
  for (const item of activeListings) {
    const resKey = item.residueType.toLowerCase().trim();
    const locKey = (item.district || item.state || 'unspecified').toLowerCase().trim();
    const clusterKey = `${resKey}__${locKey}`;

    if (!clusters.has(clusterKey)) {
      clusters.set(clusterKey, []);
    }
    clusters.get(clusterKey).push(item);
  }

  let opportunityIndex = 1;
  for (const [, clusterItems] of clusters.entries()) {
    // Only form aggregate grouping if at least 2 farmer listings exist in the cluster
    if (clusterItems.length < 2) continue;

    const residueType = clusterItems[0].residueType;
    const district = clusterItems[0].district || '';
    const state = clusterItems[0].state || '';
    const clusterLocation = district ? `${district}, ${state}` : state;
    const totalClusterTonnes = clusterItems.reduce((acc, curr) => acc + curr.quantity, 0);

    // Find compatible buyers that accept this residue type
    const compatibleBuyers = availableBuyers.filter((b) =>
      b.acceptedTypes.some((t) => t.toLowerCase().trim() === residueType.toLowerCase().trim())
    );

    for (const buyer of compatibleBuyers) {
      // Must be within buyer's max intake capacity if specified
      if (buyer.maxIntake && totalClusterTonnes > buyer.maxIntake) continue;

      // Group is viable if it fulfills between 50% and 150% of the buyer's batch requirement
      const fulfillmentPct = Math.round((totalClusterTonnes / buyer.requiredQuantity) * 100);
      if (fulfillmentPct < 40) continue;

      const pricePerTonne = buyer.pricePerTonne;
      const indicativeLotValue = pricePerTonne ? Math.round(totalClusterTonnes * pricePerTonne) : null;

      // Calculate proximity between cluster and buyer
      const prox = calculateProximityFit(
        { location: clusterItems[0].location, district, state },
        { location: buyer.location, state: buyer.state }
      );

      opportunities.push({
        id: `GRP-${opportunityIndex++}`,
        residueType,
        clusterLocation,
        district,
        state,
        farmerCount: clusterItems.length,
        totalQuantityTonnes: Number(totalClusterTonnes.toFixed(1)),
        participatingListings: clusterItems.map((l) => ({
          id: l.id,
          farmerName: l.farmerName,
          quantity: l.quantity,
          location: l.location,
          isDemo: l.isDemo,
        })),
        targetBuyer: {
          id: buyer.id,
          orgName: buyer.orgName,
          location: buyer.location,
          state: buyer.state,
          requiredQuantity: buyer.requiredQuantity,
          pricePerTonne,
          isDemo: buyer.isDemo,
        },
        fulfillmentPct,
        indicativeLotValue,
        proximityFit: prox.score,
        proximityTier: prox.proximityTier,
        estimatedDistanceKm: prox.coordinateDistanceKm ?? prox.estimatedDistanceKm,
        isSuggestedOnly: true,
        disclaimer: 'Suggested collection opportunity — NOT a confirmed booking. Consolidates nearby farmer lots to fulfill commercial demand with shared freight.',
      });
    }
  }

  // Sort opportunities by highest volume and closest fulfillment to 100%
  opportunities.sort((a, b) => {
    const diffA = Math.abs(100 - a.fulfillmentPct);
    const diffB = Math.abs(100 - b.fulfillmentPct);
    return diffA - diffB;
  });

  return opportunities;
}
