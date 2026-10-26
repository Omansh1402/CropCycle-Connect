// src/lib/geo.js
// ─────────────────────────────────────────────────────────────────
// CropCycle Connect – Geographic & Routing Services
//
// Provides verified coordinates for Indian agricultural regions,
// Haversine spherical distance calculation, and OpenStreetMap (OSRM)
// road routing with robust offline/error fallbacks.
//
// "Do not invent live locations, buyers, road distances, prices or
// completed transactions. Only display road routes when a routing
// service successfully provides them."
// ─────────────────────────────────────────────────────────────────

/**
 * Curated dictionary of verified real-world coordinates [latitude, longitude]
 * for agricultural regions, industrial hubs, and towns featured in CropCycle Connect.
 */
export const KNOWN_COORDINATES = {
  // Gujarat
  'anand': [22.5645, 72.9289],
  'khambhat': [22.3135, 72.6190],
  'vadodara': [22.3072, 73.1812],
  'ahmedabad': [23.0225, 72.5714],
  'surat': [21.1702, 72.8311],
  'rajkot': [22.3039, 70.8022],
  'gandhinagar': [23.2156, 72.6369],
  'bharuch': [21.7051, 72.9959],
  'mehsana': [23.5880, 72.3693],

  // Punjab & Haryana
  'ludhiana': [30.9010, 75.8573],
  'amritsar': [31.6340, 74.8723],
  'jalandhar': [31.3260, 75.5762],
  'patiala': [30.3398, 76.3869],
  'bathinda': [30.2110, 74.9455],
  'karnal': [29.6857, 76.9905],
  'panipat': [29.3909, 76.9635],
  'chandigarh': [30.7333, 76.7794],
  'delhi': [28.6139, 77.2090],

  // Telangana & Andhra Pradesh
  'nalgonda': [17.0575, 79.2684],
  'hyderabad': [17.3850, 78.4867],
  'warangal': [17.9689, 79.5941],
  'khammam': [17.2473, 80.1514],
  'vijayawada': [16.5062, 80.6480],
  'guntur': [16.3067, 80.4365],

  // Kerala & Tamil Nadu & Karnataka
  'palakkad': [10.7867, 76.6548],
  'thrissur': [10.5276, 76.2144],
  'kochi': [9.9312, 76.2673],
  'coimbatore': [11.0168, 76.9558],
  'chennai': [13.0827, 80.2707],
  'bengaluru': [12.9716, 77.5946],
  'mysuru': [12.2958, 76.6394],

  // Maharashtra
  'pune': [18.5204, 73.8567],
  'mumbai': [19.0760, 72.8777],
  'nashik': [19.9975, 73.7898],
  'nagpur': [21.1458, 79.0882],
  'aurangabad': [19.8762, 75.3433],
  'solapur': [17.6599, 75.9064],
  'kolhapur': [16.7050, 74.2433],

  // West Bengal & North-East
  'kolkata': [22.5726, 88.3639],
  'howrah': [22.5958, 88.2636],
  'bardhaman': [23.2324, 87.8615],
  'siliguri': [26.7271, 88.3953],

  // Uttar Pradesh & Madhya Pradesh & Rajasthan
  'lucknow': [26.8467, 80.9462],
  'kanpur': [26.4499, 80.3319],
  'varanasi': [25.3176, 82.9739],
  'agra': [27.1767, 78.0081],
  'bhopal': [23.2599, 77.4126],
  'indore': [22.7196, 75.8577],
  'gwalior': [26.2183, 78.1828],
  'jaipur': [26.9124, 75.7873],
  'udaipur': [24.5854, 73.7125],
  'jodhpur': [26.2389, 73.0243],
};

/**
 * Resolves [latitude, longitude] from an entity or text string.
 * Supports:
 * - Direct coordinates array: [lat, lon]
 * - Object with lat/lng or latitude/longitude
 * - Text search matching known districts/cities in India
 *
 * Returns null if location is unknown (never invents fake coordinates).
 */
export function resolveCoordinates(input) {
  if (!input) return null;

  // 1. Array format [lat, lon]
  if (Array.isArray(input) && input.length >= 2) {
    const lat = Number(input[0]);
    const lon = Number(input[1]);
    if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      return [lat, lon];
    }
  }

  // 2. Object with explicit lat / lon properties
  if (typeof input === 'object') {
    if (input.coordinates && Array.isArray(input.coordinates)) {
      return resolveCoordinates(input.coordinates);
    }
    const lat = Number(input.latitude ?? input.lat);
    const lon = Number(input.longitude ?? input.lon ?? input.lng);
    if (!isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0) {
      return [lat, lon];
    }
  }

  // 3. String or object location text matching
  const text = typeof input === 'object'
    ? `${input.location || ''} ${input.district || ''} ${input.state || ''}`.toLowerCase()
    : String(input).toLowerCase();

  if (!text.trim()) return null;

  // Search known coordinates dictionary for keyword matches
  for (const [key, coords] of Object.entries(KNOWN_COORDINATES)) {
    // Regex boundary or substring check
    const regex = new RegExp(`\\b${key}\\b`, 'i');
    if (regex.test(text) || text.includes(key)) {
      return coords;
    }
  }

  return null;
}

/**
 * Calculates direct great-circle distance (in kilometers) between two coordinates
 * using the Haversine formula on a spherical Earth (mean radius 6,371 km).
 *
 * @param {Array|Object} coord1 - [lat1, lon1] or { lat, lon }
 * @param {Array|Object} coord2 - [lat2, lon2] or { lat, lon }
 * @returns {number|null} Distance in km rounded to 1 decimal place, or null if coordinates invalid.
 */
export function calculateHaversineDistanceKm(coord1, coord2) {
  const c1 = resolveCoordinates(coord1);
  const c2 = resolveCoordinates(coord2);

  if (!c1 || !c2) return null;

  const [lat1, lon1] = c1;
  const [lat2, lon2] = c2;

  const R = 6371; // Earth's mean radius in km
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Number(distance.toFixed(1));
}

/**
 * Cache for road route lookups to prevent redundant HTTP requests
 * during rendering or re-evaluation.
 */
const routeCache = new Map();

/**
 * Fetches actual driving road route using the OpenStreetMap (OSRM) driving API.
 * Only returns road routes when the service successfully responds.
 * If the service fails, times out, or returns an error, it returns success: false
 * so the caller can fall back to direct distance without breaking.
 *
 * @param {Array} originCoords - [lat, lon]
 * @param {Array} destCoords - [lat, lon]
 * @param {number} timeoutMs - Timeout in milliseconds (default 4000ms)
 * @returns {Promise<Object>} Routing result
 */
export async function fetchRoadRoute(originCoords, destCoords, timeoutMs = 4000) {
  const origin = resolveCoordinates(originCoords);
  const dest = resolveCoordinates(destCoords);

  if (!origin || !dest) {
    return {
      success: false,
      roadDistanceKm: null,
      roadDurationMinutes: null,
      geometry: null,
      provider: null,
      reason: 'Valid coordinates not available for routing',
    };
  }

  const [lat1, lon1] = origin;
  const [lat2, lon2] = dest;

  const cacheKey = `${lat1.toFixed(4)},${lon1.toFixed(4)};${lat2.toFixed(4)},${lon2.toFixed(4)}`;
  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey);
  }

  const url = `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=full&geometries=geojson`;

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    const res = await fetch(url, {
      signal: controller?.signal,
      headers: {
        'Accept': 'application/json',
      },
    });

    if (timer) clearTimeout(timer);

    if (!res.ok) {
      throw new Error(`OSRM HTTP error: ${res.status}`);
    }

    const data = await res.json();

    if (data.code === 'Ok' && Array.isArray(data.routes) && data.routes.length > 0) {
      const primaryRoute = data.routes[0];
      const roadDistanceKm = Number((primaryRoute.distance / 1000).toFixed(1));
      const roadDurationMinutes = Math.round(primaryRoute.duration / 60);

      // GeoJSON coordinates are [lon, lat], Leaflet polyline expects [lat, lon]
      const geometry = Array.isArray(primaryRoute.geometry?.coordinates)
        ? primaryRoute.geometry.coordinates.map(([lon, lat]) => [lat, lon])
        : [];

      const result = {
        success: true,
        roadDistanceKm,
        roadDurationMinutes,
        geometry,
        provider: 'OpenStreetMap (OSRM Driving Service)',
        reason: null,
      };

      routeCache.set(cacheKey, result);
      return result;
    }

    return {
      success: false,
      roadDistanceKm: null,
      roadDurationMinutes: null,
      geometry: null,
      provider: null,
      reason: data.message || 'No road route found between points',
    };
  } catch (err) {
    if (timer) clearTimeout(timer);
    return {
      success: false,
      roadDistanceKm: null,
      roadDurationMinutes: null,
      geometry: null,
      provider: null,
      reason: err.name === 'AbortError' ? 'Routing service request timed out' : (err.message || 'Routing service unreachable'),
    };
  }
}

/**
 * Format distance in a human-friendly manner.
 */
export function formatDistance(distanceKm, isRoad = false) {
  if (distanceKm == null || isNaN(distanceKm)) {
    return 'Distance unlisted';
  }
  const prefix = isRoad ? 'Road distance: ~' : 'Estimated distance: ';
  return `${prefix}${distanceKm} km`;
}
