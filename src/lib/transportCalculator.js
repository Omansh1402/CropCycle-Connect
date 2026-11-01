// src/lib/transportCalculator.js
// ─────────────────────────────────────────────────────────────────
// CropCycle Connect – Smart Interstate Transportation Cost Calculator
//
// Calculates estimated freight and delivered procurement costs
// based on road travel distance (OSRM), vehicle payload capacity,
// distance freight rates, toll charges, handling, and border permits.
//
// "Do not hardcode fictional trucking prices. Every estimated cost
// must show its assumptions. Clearly label results as an indicative estimate."
// ─────────────────────────────────────────────────────────────────

export const VEHICLE_CONFIGS = {
  tractor_trolley: {
    id: 'tractor_trolley',
    labelKey: 'transport.vehicle.tractor_trolley.label',
    categoryKey: 'transport.vehicle.tractor_trolley.category',
    descriptionKey: 'transport.vehicle.tractor_trolley.description',
    label: 'Tractor Trolley',
    category: 'Local Farm Transit (< 60 km)',
    payloadTonnes: 4,
    ratePerKm: 32,
    fixedTripCharge: 800,
    loadingPerTonne: 150,
    unloadingPerTonne: 150,
    tollPerKm: 0, // Agricultural tractors typically exempt from NHAI tolls
    interstateFee: 0,
    maxPracticalDistanceKm: 65,
    description: 'Direct farm-to-depot transit for smallholder agricultural lots.',
  },
  small_truck: {
    id: 'small_truck',
    labelKey: 'transport.vehicle.small_truck.label',
    categoryKey: 'transport.vehicle.small_truck.category',
    descriptionKey: 'transport.vehicle.small_truck.description',
    label: 'Small Commercial Truck (Tata 407 / 709)',
    category: 'Intra-District & Short Haul (50–250 km)',
    payloadTonnes: 8,
    ratePerKm: 38,
    fixedTripCharge: 1500,
    loadingPerTonne: 180,
    unloadingPerTonne: 180,
    tollPerKm: 3.5,
    interstateFee: 600,
    maxPracticalDistanceKm: 350,
    description: 'Light commercial vehicle suitable for narrow rural link roads.',
  },
  medium_truck: {
    id: 'medium_truck',
    labelKey: 'transport.vehicle.medium_truck.label',
    categoryKey: 'transport.vehicle.medium_truck.category',
    descriptionKey: 'transport.vehicle.medium_truck.description',
    label: 'Medium Commercial Truck (6–10 Wheeler)',
    category: 'Regional Haulage (150–600 km)',
    payloadTonnes: 15,
    ratePerKm: 52,
    fixedTripCharge: 2800,
    loadingPerTonne: 200,
    unloadingPerTonne: 200,
    tollPerKm: 5.5,
    interstateFee: 1000,
    maxPracticalDistanceKm: 800,
    description: 'Standard industrial carrier for baled and bundled biomass lots.',
  },
  heavy_truck: {
    id: 'heavy_truck',
    labelKey: 'transport.vehicle.heavy_truck.label',
    categoryKey: 'transport.vehicle.heavy_truck.category',
    descriptionKey: 'transport.vehicle.heavy_truck.description',
    label: 'Heavy Goods Multi-Axle Truck (12–14 Wheeler / Trailer)',
    category: 'Interstate Long-Haul (> 500 km)',
    payloadTonnes: 28,
    ratePerKm: 68,
    fixedTripCharge: 4500,
    loadingPerTonne: 220,
    unloadingPerTonne: 220,
    tollPerKm: 8.5,
    interstateFee: 1400,
    maxPracticalDistanceKm: 2500,
    description: 'High-capacity multi-axle freight carrier designed for inter-state arterial corridors.',
  },
};

/**
 * Automatically select the most practical vehicle based on quantity and road distance.
 */
export function recommendVehicle(quantityTonnes, distanceKm) {
  const qty = Number(quantityTonnes) || 0;
  const dist = Number(distanceKm) || 0;

  if (dist <= 50 && qty <= 6) return 'tractor_trolley';
  if (dist <= 200 && qty <= 10) return 'small_truck';
  if (dist > 400 || qty >= 25) return 'heavy_truck';
  return 'medium_truck';
}

/**
 * Calculates complete transportation expense breakdown.
 *
 * @param {Object} params
 * @param {number} params.distanceKm - Road distance in kilometers
 * @param {number} params.quantityTonnes - Total residue batch volume
 * @param {string} [params.vehicleType] - 'tractor_trolley' | 'small_truck' | 'medium_truck' | 'heavy_truck'
 * @param {boolean} [params.isInterstate] - Whether the journey crosses state lines
 * @param {boolean} [params.includeEmptyReturn] - Whether to factor empty return leg charges
 * @param {number} [params.customRatePerKm] - User/Transporter quotation override
 * @param {number} [params.customFixedCharge] - User/Transporter fixed charge override
 * @returns {Object} Complete calculation breakdown
 */
export function calculateTransportationCost({
  distanceKm,
  quantityTonnes,
  vehicleType = 'medium_truck',
  isInterstate = false,
  includeEmptyReturn = false,
  customRatePerKm = null,
  customFixedCharge = null,
  customVehiclePayload = null,
} = {}) {
  const dist = Number(distanceKm);
  const qty = Number(quantityTonnes);

  // If distance or quantity is missing/invalid, return safe unavailable status
  if (isNaN(dist) || dist <= 0 || isNaN(qty) || qty <= 0) {
    return {
      available: false,
      reason: isNaN(dist) || dist <= 0
        ? 'Road distance could not be determined. Please specify exact origin and destination locations.'
        : 'Invalid residue quantity specified.',
      reasonKey: isNaN(dist) || dist <= 0 ? 'transport.error.distance' : 'transport.error.quantity',
      reasonParams: {},
      trips: 0,
      totalTransportationCost: null,
      costPerTonne: null,
      breakdown: null,
      disclaimer: 'Transportation calculation unavailable without verified route distance.',
      disclaimerKey: 'transport.disclaimer.unavailable',
    };
  }

  const baseConfig = VEHICLE_CONFIGS[vehicleType] || VEHICLE_CONFIGS.medium_truck;
  const payloadCapacity = Number(customVehiclePayload || baseConfig.payloadTonnes);
  const ratePerKm = customRatePerKm != null ? Number(customRatePerKm) : baseConfig.ratePerKm;
  const fixedTripCharge = customFixedCharge != null ? Number(customFixedCharge) : baseConfig.fixedTripCharge;

  // Trips: Ceiling of total quantity / payload capacity
  const trips = Math.ceil(qty / payloadCapacity);

  // Per-trip component costs
  const distanceChargePerTrip = Number((dist * ratePerKm).toFixed(2));
  const tollChargesPerTrip = Number((dist * baseConfig.tollPerKm).toFixed(2));

  // Loading & unloading handling (based on capacity carried per trip)
  const averageTonnagePerTrip = qty / trips;
  const handlingPerTrip = Number(
    (averageTonnagePerTrip * (baseConfig.loadingPerTonne + baseConfig.unloadingPerTonne)).toFixed(2)
  );

  // Interstate border permit / RTO transit charge
  const interstateFeePerTrip = isInterstate ? baseConfig.interstateFee : 0;

  // Empty return leg (typically ~60% of distance charge if backhaul freight is unavailable)
  const emptyReturnPerTrip = includeEmptyReturn ? Number((distanceChargePerTrip * 0.60).toFixed(2)) : 0;

  // Cost per trip
  const costPerTrip = Number(
    (
      distanceChargePerTrip +
      fixedTripCharge +
      tollChargesPerTrip +
      handlingPerTrip +
      interstateFeePerTrip +
      emptyReturnPerTrip
    ).toFixed(2)
  );

  // Total logistics cost for all trips
  const totalTransportationCost = Number((trips * costPerTrip).toFixed(2));
  const costPerTonne = Number((totalTransportationCost / qty).toFixed(2));

  return {
    available: true,
    distanceKm: dist,
    totalQuantityTonnes: qty,
    vehicleConfig: {
      id: baseConfig.id,
      labelKey: baseConfig.labelKey,
      categoryKey: baseConfig.categoryKey,
      descriptionKey: baseConfig.descriptionKey,
      label: baseConfig.label,
      category: baseConfig.category,
      payloadCapacity,
      ratePerKm,
      isCustomQuote: customRatePerKm != null || customFixedCharge != null,
    },
    isInterstate,
    includeEmptyReturn,
    trips,
    costPerTrip,
    totalTransportationCost,
    costPerTonne,
    breakdown: {
      distanceChargePerTrip,
      fixedTripCharge,
      tollChargesPerTrip,
      handlingPerTrip,
      interstateFeePerTrip,
      emptyReturnPerTrip,
      totalDistanceCharge: Number((trips * distanceChargePerTrip).toFixed(2)),
      totalFixedCharges: Number((trips * fixedTripCharge).toFixed(2)),
      totalTolls: Number((trips * tollChargesPerTrip).toFixed(2)),
      totalHandling: Number((trips * handlingPerTrip).toFixed(2)),
      totalInterstateFees: Number((trips * interstateFeePerTrip).toFixed(2)),
      totalEmptyReturn: Number((trips * emptyReturnPerTrip).toFixed(2)),
    },
    disclaimer: 'Indicative Transportation Estimate — Confirm Final Price With Transporter.',
    disclaimerKey: 'transport.disclaimer.estimate',
  };
}

/**
 * Calculates Final Delivered Cost Per Tonne and Total Order Value.
 * Formula:
 *   Final Delivered Cost Per Tonne = Purchase Price Per Tonne + Transportation Cost Per Tonne + Other Applicable Charges Per Tonne
 *   Total Order Delivered Cost = Total Quantity × Final Delivered Cost Per Tonne
 */
export function calculateDeliveredCost({
  purchasePricePerTonne,
  transportCostPerTonne,
  otherChargesPerTonne = 0,
  quantityTonnes,
} = {}) {
  const purchase = purchasePricePerTonne != null ? Number(purchasePricePerTonne) : null;
  const transport = transportCostPerTonne != null ? Number(transportCostPerTonne) : null;
  const other = Number(otherChargesPerTonne) || 0;
  const qty = Number(quantityTonnes);

  if (purchase == null || transport == null || isNaN(qty) || qty <= 0) {
    return {
      available: false,
      deliveredCostPerTonne: null,
      totalDeliveredCost: null,
      purchasePricePerTonne: purchase,
      transportCostPerTonne: transport,
      otherChargesPerTonne: other,
      totalQuantityTonnes: qty,
      reason: purchase == null
        ? 'Crop residue purchase price is unlisted.'
        : 'Transportation freight cost could not be calculated.',
      reasonKey: purchase == null ? 'transport.delivered.purchaseMissing' : 'transport.delivered.freightMissing',
      reasonParams: {},
      disclaimer: 'Delivered cost calculation requires verified purchase rate and road freight estimate.',
      disclaimerKey: 'transport.disclaimer.delivered',
    };
  }

  const deliveredCostPerTonne = Number((purchase + transport + other).toFixed(2));
  const totalPurchaseCost = Number((qty * purchase).toFixed(2));
  const totalTransportCost = Number((qty * transport).toFixed(2));
  const totalOtherCost = Number((qty * other).toFixed(2));
  const totalDeliveredCost = Number((qty * deliveredCostPerTonne).toFixed(2));

  return {
    available: true,
    purchasePricePerTonne: purchase,
    transportCostPerTonne: transport,
    otherChargesPerTonne: other,
    deliveredCostPerTonne,
    totalQuantityTonnes: qty,
    totalPurchaseCost,
    totalTransportCost,
    totalOtherCost,
    totalDeliveredCost,
    disclaimer: 'Indicative Transportation Estimate — Confirm Final Price With Transporter.',
    disclaimerKey: 'transport.disclaimer.estimate',
  };
}


// Compatibility alias
export const VEHICLE_PROFILES = VEHICLE_CONFIGS;
