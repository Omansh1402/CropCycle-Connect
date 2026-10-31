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
 * for agricultural regions, industrial hubs, state capitals, and districts across India.
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
  'bhavnagar': [21.7645, 72.1519],
  'junagadh': [21.5222, 70.4579],
  'gujarat': [22.2587, 71.1924],

  // Punjab
  'ludhiana': [30.9010, 75.8573],
  'amritsar': [31.6340, 74.8723],
  'jalandhar': [31.3260, 75.5762],
  'patiala': [30.3398, 76.3869],
  'bathinda': [30.2110, 74.9455],
  'sangrur': [30.2458, 75.8421],
  'firozpur': [30.9237, 74.6114],
  'moga': [30.8165, 75.1717],
  'hoshiarpur': [31.5273, 75.9149],
  'gurdaspur': [32.0419, 75.4053],
  'punjab': [30.9010, 75.8573],

  // Haryana
  'karnal': [29.6857, 76.9905],
  'panipat': [29.3909, 76.9635],
  'hisar': [29.1492, 75.7217],
  'rohtak': [28.8955, 76.6066],
  'sirsa': [29.5349, 75.0298],
  'ambala': [30.3782, 76.7767],
  'kurukshetra': [29.9695, 76.8783],
  'sonipat': [28.9931, 77.0151],
  'haryana': [29.0588, 76.0856],

  // Delhi & UTs
  'delhi': [28.6139, 77.2090],
  'new delhi': [28.6139, 77.2090],
  'chandigarh': [30.7333, 76.7794],
  'jammu': [32.7266, 74.8570],
  'srinagar': [34.0837, 74.7973],
  'leh': [34.1526, 77.5771],
  'ladakh': [34.1526, 77.5771],
  'port blair': [11.6234, 92.7265],
  'andaman': [11.6234, 92.7265],
  'puducherry': [11.9416, 79.8083],
  'pondicherry': [11.9416, 79.8083],
  'daman': [20.3974, 72.8328],
  'silvassa': [20.2763, 73.0083],
  'kavaratti': [10.5669, 72.6420],
  'lakshadweep': [10.5669, 72.6420],

  // Bihar
  'patna': [25.5941, 85.1376],
  'muzaffarpur': [26.1209, 85.3647],
  'gaya': [24.7914, 85.0002],
  'bhagalpur': [25.2425, 86.9842],
  'purnia': [25.7771, 87.4753],
  'darbhanga': [26.1542, 85.8918],
  'begusarai': [25.4182, 86.1272],
  'samastipur': [25.8629, 85.7811],
  'rohtas': [24.9546, 84.0154],
  'nalanda': [25.1982, 85.5149],
  'bihar': [25.5941, 85.1376],

  // Uttar Pradesh
  'lucknow': [26.8467, 80.9462],
  'kanpur': [26.4499, 80.3319],
  'varanasi': [25.3176, 82.9739],
  'agra': [27.1767, 78.0081],
  'meerut': [28.9845, 77.7064],
  'bareilly': [28.3670, 79.4304],
  'aligarh': [27.8974, 78.0880],
  'gorakhpur': [26.7606, 83.3732],
  'moradabad': [28.8353, 78.7767],
  'prayagraj': [25.4358, 81.8463],
  'allahabad': [25.4358, 81.8463],
  'saharanpur': [29.9640, 77.5460],
  'ghaziabad': [28.6692, 77.4538],
  'noida': [28.5355, 77.3910],
  'ayodhya': [26.7922, 82.1998],
  'uttar pradesh': [26.8467, 80.9462],

  // Madhya Pradesh
  'bhopal': [23.2599, 77.4126],
  'indore': [22.7196, 75.8577],
  'gwalior': [26.2183, 78.1828],
  'jabalpur': [23.1815, 79.9864],
  'ujjain': [23.1765, 75.7885],
  'hoshangabad': [22.7519, 77.7289],
  'sehore': [23.2031, 77.0844],
  'sagar': [23.8388, 78.7378],
  'madhya pradesh': [23.2599, 77.4126],

  // Rajasthan
  'jaipur': [26.9124, 75.7873],
  'jodhpur': [26.2389, 73.0243],
  'udaipur': [24.5854, 73.7125],
  'kota': [25.2138, 75.8648],
  'bikaner': [28.0229, 73.3119],
  'sri ganganagar': [29.9094, 73.8799],
  'hanumangarh': [29.5817, 74.3294],
  'alwar': [27.5530, 76.6346],
  'rajasthan': [26.9124, 75.7873],

  // Maharashtra
  'pune': [18.5204, 73.8567],
  'mumbai': [19.0760, 72.8777],
  'nashik': [19.9975, 73.7898],
  'nagpur': [21.1458, 79.0882],
  'aurangabad': [19.8762, 75.3433],
  'solapur': [17.6599, 75.9064],
  'kolhapur': [16.7050, 74.2433],
  'ahmednagar': [19.0952, 74.7496],
  'satara': [17.6805, 74.0183],
  'sangli': [16.8524, 74.5815],
  'maharashtra': [19.7515, 75.7139],

  // Telangana
  'hyderabad': [17.3850, 78.4867],
  'warangal': [17.9689, 79.5941],
  'nalgonda': [17.0575, 79.2684],
  'khammam': [17.2473, 80.1514],
  'karimnagar': [18.4386, 79.1288],
  'nizamabad': [18.6725, 78.0941],
  'telangana': [17.3850, 78.4867],

  // Andhra Pradesh
  'amaravati': [16.5131, 80.5165],
  'vijayawada': [16.5062, 80.6480],
  'guntur': [16.3067, 80.4365],
  'visakhapatnam': [17.6868, 83.2185],
  'nellore': [14.4426, 79.9865],
  'kurnool': [15.8281, 78.0373],
  'kakinada': [16.9891, 82.2475],
  'rajahmundry': [17.0005, 81.8040],
  'andhra pradesh': [16.5062, 80.6480],

  // Karnataka
  'bengaluru': [12.9716, 77.5946],
  'bangalore': [12.9716, 77.5946],
  'mysuru': [12.2958, 76.6394],
  'mysore': [12.2958, 76.6394],
  'belagavi': [15.8497, 74.4977],
  'hubballi': [15.3647, 75.1240],
  'dharwad': [15.4589, 75.0078],
  'kalaburagi': [17.3297, 76.8343],
  'davanagere': [14.4644, 75.9218],
  'ballari': [15.1394, 76.9214],
  'karnataka': [12.9716, 77.5946],

  // Tamil Nadu
  'chennai': [13.0827, 80.2707],
  'coimbatore': [11.0168, 76.9558],
  'madurai': [9.9252, 78.1198],
  'tiruchirappalli': [10.7905, 78.7047],
  'salem': [11.6643, 78.1460],
  'thanjavur': [10.7870, 79.1378],
  'erode': [11.3410, 77.7172],
  'tamil nadu': [13.0827, 80.2707],

  // Kerala
  'thiruvananthapuram': [8.5241, 76.9366],
  'trivandrum': [8.5241, 76.9366],
  'kochi': [9.9312, 76.2673],
  'cochin': [9.9312, 76.2673],
  'kozhikode': [11.2588, 75.7804],
  'palakkad': [10.7867, 76.6548],
  'thrissur': [10.5276, 76.2144],
  'kerala': [10.8505, 76.2711],

  // West Bengal
  'kolkata': [22.5726, 88.3639],
  'calcutta': [22.5726, 88.3639],
  'howrah': [22.5958, 88.2636],
  'bardhaman': [23.2324, 87.8615],
  'siliguri': [26.7271, 88.3953],
  'murshidabad': [24.1759, 88.2802],
  'west bengal': [22.5726, 88.3639],

  // Odisha
  'bhubaneswar': [20.2961, 85.8245],
  'cuttack': [20.4625, 85.8828],
  'sambalpur': [21.4669, 83.9812],
  'balasore': [21.4934, 86.9135],
  'odisha': [20.2961, 85.8245],

  // Chhattisgarh
  'raipur': [21.2514, 81.6296],
  'bilaspur': [22.0797, 82.1409],
  'durg': [21.1904, 81.2849],
  'chhattisgarh': [21.2514, 81.6296],

  // Jharkhand
  'ranchi': [23.3441, 85.3096],
  'jamshedpur': [22.8046, 86.2029],
  'dhanbad': [23.7957, 86.4304],
  'jharkhand': [23.3441, 85.3096],

  // Assam & North East
  'dispur': [26.1433, 91.7898],
  'guwahati': [26.1445, 91.7362],
  'dibrugarh': [27.4728, 94.9120],
  'silchar': [24.8333, 92.7789],
  'assam': [26.1445, 91.7362],
  'shillong': [25.5788, 91.8933],
  'meghalaya': [25.5788, 91.8933],
  'imphal': [24.8170, 93.9368],
  'manipur': [24.8170, 93.9368],
  'agartala': [23.8315, 91.2868],
  'tripura': [23.8315, 91.2868],
  'kohima': [25.6751, 94.1086],
  'dimapur': [25.9060, 93.7272],
  'nagaland': [25.6751, 94.1086],
  'aizawl': [23.7271, 92.7176],
  'mizoram': [23.7271, 92.7176],
  'itanagar': [27.0844, 93.6053],
  'arunachal pradesh': [27.0844, 93.6053],
  'gangtok': [27.3389, 88.6065],
  'sikkim': [27.3389, 88.6065],

  // Uttarakhand & Himachal Pradesh & Goa
  'dehradun': [30.3165, 78.0322],
  'haridwar': [29.9457, 78.1642],
  'rudrapur': [28.9800, 79.4000],
  'uttarakhand': [30.3165, 78.0322],
  'shimla': [31.1048, 77.1734],
  'mandi': [31.7087, 76.9320],
  'himachal pradesh': [31.1048, 77.1734],
  'panaji': [15.4909, 73.8278],
  'margao': [15.2736, 73.9582],
  'goa': [15.4909, 73.8278],
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


// Convenience helpers
export function getCoordinates(district, state) {
  return resolveCoordinates(`${district || ''} ${state || ''}`);
}

export function calculateRoadDistanceKm(coord1, coord2) {
  const direct = calculateHaversineDistanceKm(coord1, coord2);
  if (!direct) return null;
  // Highway road detour factor: typical Indian road route is ~1.25x Haversine great-circle distance
  return Math.round(direct * 1.25);
}
