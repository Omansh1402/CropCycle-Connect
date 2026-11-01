// src/data/sampleData.js
// ⚠️ All entries below are SAMPLE / DEMONSTRATION DATA only.
// They are not real organisations or individuals.

export const RESIDUE_TYPES = [
  'Paddy Straw',
  'Wheat Straw',
  'Sugarcane Bagasse',
  'Cotton Stalks',
  'Maize Stalks',
  'Groundnut Shells',
  'Mustard Stalks',
  'Soybean Stalks',
  'Sunflower Stalks',
  'Banana Pseudostems',
];

export const INTENDED_USES = [
  'Biofuel / Energy Generation',
  'Animal Feed / Fodder',
  'Compost / Organic Fertiliser',
  'Paper & Pulp Manufacturing',
  'Mushroom Cultivation',
  'Bio-CNG Production',
  'Cardboard / Packaging',
  'Construction Material',
  'Biochar Production',
];

export const PICKUP_PREFERENCES = [
  'Self-pickup by buyer',
  'Farmer delivers to buyer',
  'Third-party logistics arranged',
  'Government collection point',
];

// Sample farmer listings (demonstration only)
export const sampleListings = [
  {
    id: 'L001',
    farmerName: 'Rajesh Patel',
    location: 'Anand, Gujarat',
    district: 'Anand',
    state: 'Gujarat',
    coordinates: [22.5645, 72.9289],
    residueType: 'Paddy Straw',
    quantity: 18,
    availabilityDate: '2026-11-10',
    pickupPreference: 'Self-pickup by buyer',
    status: 'Active',
    postedDate: '2026-10-20',
    contact: 'rajesh.demo@example.com',
    isDemo: true,
  },
  {
    id: 'L002',
    farmerName: 'Sunita Verma',
    location: 'Ludhiana, Punjab',
    district: 'Ludhiana',
    state: 'Punjab',
    coordinates: [30.9010, 75.8573],
    residueType: 'Wheat Straw',
    quantity: 32,
    availabilityDate: '2026-11-18',
    pickupPreference: 'Third-party logistics arranged',
    status: 'Active',
    postedDate: '2026-10-21',
    contact: 'sunita.demo@example.com',
    isDemo: true,
  },
  {
    id: 'L003',
    farmerName: 'Mohan Reddy',
    location: 'Nalgonda, Telangana',
    district: 'Nalgonda',
    state: 'Telangana',
    coordinates: [17.0575, 79.2684],
    residueType: 'Cotton Stalks',
    quantity: 7,
    availabilityDate: '2026-12-01',
    pickupPreference: 'Farmer delivers to buyer',
    status: 'Pending',
    postedDate: '2026-10-22',
    contact: 'mohan.demo@example.com',
    isDemo: true,
  },
  {
    id: 'L004',
    farmerName: 'Priya Nair',
    location: 'Palakkad, Kerala',
    district: 'Palakkad',
    state: 'Kerala',
    coordinates: [10.7867, 76.6548],
    residueType: 'Banana Pseudostems',
    quantity: 4,
    availabilityDate: '2026-11-05',
    pickupPreference: 'Farmer delivers to buyer',
    status: 'Matched',
    postedDate: '2026-10-18',
    contact: 'priya.demo@example.com',
    isDemo: true,
  },
];

// Sample buyer organisations (demonstration only — not real)
export const sampleBuyers = [
  {
    id: 'B001',
    orgName: 'GreenFuel Renewables Pvt. Ltd.',
    location: 'Vadodara, Gujarat',
    state: 'Gujarat',
    coordinates: [22.3072, 73.1812],
    acceptedTypes: ['Paddy Straw', 'Wheat Straw', 'Sugarcane Bagasse'],
    requiredQuantity: 50,
    maxIntake: 200,
    intendedUse: 'Biofuel / Energy Generation',
    pricePerTonne: 2200, // Demo price (₹2,200/tonne)
    priceType: 'demo',
    available: true,
    matchScore: 92,
    description:
      'A renewable energy company converting agricultural residues into clean biofuel pellets and biogas.',
    contact: 'procurement.demo@greenfuel-example.com',
    phone: '+91 (DEMO) 98765 00001',
    isDemo: true,
  },
  {
    id: 'B002',
    orgName: 'AgriCompost Cooperative',
    location: 'Anand, Gujarat',
    state: 'Gujarat',
    coordinates: [22.5645, 72.9289],
    acceptedTypes: ['Paddy Straw', 'Cotton Stalks', 'Groundnut Shells', 'Maize Stalks'],
    requiredQuantity: 20,
    maxIntake: 80,
    intendedUse: 'Compost / Organic Fertiliser',
    pricePerTonne: 1850, // Demo price (₹1,850/tonne)
    priceType: 'demo',
    available: true,
    matchScore: 85,
    description:
      'A farmer-owned cooperative processing residues into certified organic compost for local farms.',
    contact: 'buy.demo@agricompost-example.com',
    phone: '+91 (DEMO) 98765 00002',
    isDemo: true,
  },
  {
    id: 'B003',
    orgName: 'BioGas India Initiative',
    location: 'Hyderabad, Telangana',
    state: 'Telangana',
    coordinates: [17.3850, 78.4867],
    acceptedTypes: ['Sugarcane Bagasse', 'Cotton Stalks', 'Soybean Stalks'],
    requiredQuantity: 100,
    maxIntake: 500,
    intendedUse: 'Bio-CNG Production',
    pricePerTonne: 2500, // Demo price (₹2,500/tonne)
    priceType: 'demo',
    available: true,
    matchScore: 78,
    description:
      'Government-partnered initiative producing compressed bio-gas from crop residues for vehicle fuel.',
    contact: 'ops.demo@biogas-example.com',
    phone: '+91 (DEMO) 98765 00003',
    isDemo: true,
  },
  {
    id: 'B004',
    orgName: 'Mushroom Valley Farms',
    location: 'Kolkata, West Bengal',
    state: 'West Bengal',
    coordinates: [22.5726, 88.3639],
    acceptedTypes: ['Paddy Straw', 'Wheat Straw'],
    requiredQuantity: 10,
    maxIntake: 40,
    intendedUse: 'Mushroom Cultivation',
    pricePerTonne: null, // Price unavailable
    priceType: null,
    available: false,
    matchScore: 70,
    description:
      'Premium mushroom cultivation enterprise using paddy straw as the primary growing substrate.',
    contact: 'supply.demo@mushroomvalley-example.com',
    phone: '+91 (DEMO) 98765 00004',
    isDemo: true,
  },
  {
    id: 'B005',
    orgName: 'PaperLeaf Industries',
    location: 'Pune, Maharashtra',
    state: 'Maharashtra',
    coordinates: [18.5204, 73.8567],
    acceptedTypes: ['Sugarcane Bagasse', 'Banana Pseudostems', 'Wheat Straw'],
    requiredQuantity: 75,
    maxIntake: 300,
    intendedUse: 'Paper & Pulp Manufacturing',
    pricePerTonne: null, // Price unavailable
    priceType: null,
    available: true,
    matchScore: 68,
    description:
      'Eco-friendly paper manufacturer substituting wood pulp with agricultural residue fibres.',
    contact: 'raw.demo@paperleaf-example.com',
    phone: '+91 (DEMO) 98765 00005',
    isDemo: true,
  },
];

// Sample match results (demonstration only)
export const sampleMatches = [
  {
    id: 'M001',
    listingId: 'L001',
    buyerId: 'B001',
    matchScore: 92,
    status: 'Pending Response',
    matchedOn: '2026-10-23',
    notes: 'Strong location match — both within 65 km. Residue type and quantity align well.',
  },
  {
    id: 'M002',
    listingId: 'L001',
    buyerId: 'B002',
    matchScore: 85,
    status: 'Accepted',
    matchedOn: '2026-10-22',
    notes: 'Cooperative nearby. Compost use suits paddy straw quality.',
  },
  {
    id: 'M003',
    listingId: 'L002',
    buyerId: 'B001',
    matchScore: 78,
    status: 'Pending Response',
    matchedOn: '2026-10-24',
    notes: 'Wheat straw is a secondary accepted type for this buyer.',
  },
];

// Dashboard summary stats (demonstration only)
export const dashboardStats = {
  totalListings: 4,
  activeMatches: 3,
  tonsRedirected: 61,
  co2Saved: 91.5, // approximate kg CO2 per ton
};
