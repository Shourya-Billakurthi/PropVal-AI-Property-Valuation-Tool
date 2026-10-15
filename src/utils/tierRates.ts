import { CityTier, LocationData, PropertyCategory, PropertyBoosters } from '../types/property';

// Curated list of Tier-1 Districts/Cities in India
export const TIER_1_DISTRICTS: Record<string, number> = {
  // Mumbai MMR
  mumbai: 19500,
  'mumbai suburban': 18500,
  thane: 13500,
  'navi mumbai': 14000,
  raigad: 9500,

  // Delhi NCR
  delhi: 15500,
  'new delhi': 18000,
  'central delhi': 19000,
  'south delhi': 22000,
  'south west delhi': 14500,
  'north delhi': 13500,
  'east delhi': 12500,
  'west delhi': 13000,
  gurgaon: 14500,
  gurugram: 14500,
  'gautam buddha nagar': 13000,
  noida: 13500,
  'greater noida': 9500,
  faridabad: 9000,
  ghaziabad: 8500,

  // Bengaluru Urban & Rural
  bengaluru: 13500,
  'bangalore urban': 13500,
  'bangalore rural': 8500,
  bangalore: 13500,

  // Hyderabad & Cyberabad
  hyderabad: 13000,
  rangareddy: 11500,
  medchal: 9500,
  'medchal malkajgiri': 9500,

  // Chennai
  chennai: 11500,
  kancheepuram: 8000,
  chengalpattu: 7500,
  tiruvallur: 7000,

  // Pune
  pune: 11000,
  'pimpri chinchwad': 9500,

  // Kolkata
  kolkata: 9500,
  howrah: 7000,
  'north 24 parganas': 7500,
  'south 24 parganas': 7000,

  // Ahmedabad
  ahmedabad: 8500,
  gandhinagar: 8000,
};

// Tier-2 Urban Districts/Cities in India
export const TIER_2_DISTRICTS: string[] = [
  'jaipur', 'lucknow', 'chandigarh', 'surat', 'ernakulam', 'kochi', 'indore',
  'coimbatore', 'nagpur', 'bhopal', 'visakhapatnam', 'vadodara', 'patna',
  'bhubaneswar', 'dehradun', 'mysuru', 'mysore', 'ludhiana', 'agra', 'nashik',
  'rajkot', 'varanasi', 'meerut', 'raipur', 'ranchi', 'jodhpur', 'amritsar',
  'gwalior', 'jabalpur', 'vijayawada', 'mangaluru', 'mangalore', 'kozhikode',
  'thiruvananthapuram', 'tiruchirappalli', 'hubli', 'dharwad', 'jalandhar',
  'salem', 'warangal', 'nellore', 'guntur', 'udaipur', 'aurangabad', 'chhatrapati sambhaji nagar',
  'panaji', 'north goa', 'south goa', 'shimla', 'mohali', 'panchkula', 'tirupati'
];

/**
 * Calculates city tier and estimated base rate per sq.ft based on district and state
 */
export function determineTierAndBaseRate(
  district: string,
  state: string,
  locality?: string
): { tier: CityTier; baseRate: number } {
  const normDistrict = (district || '').toLowerCase().trim();
  const normLocality = (locality || '').toLowerCase().trim();

  // Check Tier 1 direct match
  for (const [key, rate] of Object.entries(TIER_1_DISTRICTS)) {
    if (normDistrict.includes(key) || normLocality.includes(key) || key.includes(normDistrict)) {
      return { tier: 'Tier-1 Metro', baseRate: rate };
    }
  }

  // Check Tier 2 direct match
  const isTier2 = TIER_2_DISTRICTS.some(
    d => normDistrict.includes(d) || normLocality.includes(d) || d.includes(normDistrict)
  );

  if (isTier2) {
    return { tier: 'Tier-2 Urban', baseRate: 6500 };
  }

  // Tier 3 default for semi-urban / rural
  return { tier: 'Tier-3 Semi-Urban / Rural', baseRate: 3200 };
}

/**
 * Curated offline fallback directory of popular Indian pincodes
 * Ensures instant testing & reliability even if external network/CORS blocks the postal API
 */
export const POPULAR_PINCODES: Record<string, {
  district: string;
  state: string;
  circle: string;
  localities: string[];
  sampleTag: string;
}> = {
  '560001': {
    district: 'Bengaluru',
    state: 'Karnataka',
    circle: 'Karnataka Circle',
    localities: ['Bangalore G.P.O.', 'MG Road', 'Cubbon Park', 'Shivajinagar'],
    sampleTag: 'Bengaluru Central (Tier 1)',
  },
  '560034': {
    district: 'Bengaluru',
    state: 'Karnataka',
    circle: 'Karnataka Circle',
    localities: ['Koramangala 4th Block', 'Koramangala I Block', 'Madiwala'],
    sampleTag: 'Koramangala Tech Hub',
  },
  '400001': {
    district: 'Mumbai',
    state: 'Maharashtra',
    circle: 'Maharashtra Circle',
    localities: ['Mumbai G.P.O.', 'Fort', 'Ballard Estate', 'Marine Lines'],
    sampleTag: 'South Mumbai (Tier 1)',
  },
  '400050': {
    district: 'Mumbai Suburban',
    state: 'Maharashtra',
    circle: 'Maharashtra Circle',
    localities: ['Bandra West', 'Bandra Reclamation', 'Pali Hill'],
    sampleTag: 'Bandra West, Mumbai',
  },
  '110001': {
    district: 'New Delhi',
    state: 'Delhi',
    circle: 'Delhi Circle',
    localities: ['Connaught Place', 'Barakhamba Road', 'Janpath'],
    sampleTag: 'Connaught Place, Delhi',
  },
  '122002': {
    district: 'Gurugram',
    state: 'Haryana',
    circle: 'Haryana Circle',
    localities: ['DLF Phase 2', 'Cyber City', 'Sikanderpur', 'Sector 25'],
    sampleTag: 'DLF Cyber City, Gurugram',
  },
  '500081': {
    district: 'Hyderabad',
    state: 'Telangana',
    circle: 'Andhra Pradesh & Telangana Circle',
    localities: ['Madhapur', 'HITEC City', 'Cyber Towers', 'Kavuri Hills'],
    sampleTag: 'HITEC City, Hyderabad',
  },
  '600001': {
    district: 'Chennai',
    state: 'Tamil Nadu',
    circle: 'Tamil Nadu Circle',
    localities: ['Chennai G.P.O.', 'Parrys', 'George Town'],
    sampleTag: 'Chennai G.P.O. (Tier 1)',
  },
  '411001': {
    district: 'Pune',
    state: 'Maharashtra',
    circle: 'Maharashtra Circle',
    localities: ['Pune H.O', 'Camp', 'Station Road', 'Bund Garden'],
    sampleTag: 'Pune Camp (Tier 1)',
  },
  '302001': {
    district: 'Jaipur',
    state: 'Rajasthan',
    circle: 'Rajasthan Circle',
    localities: ['Jaipur G.P.O.', 'C Scheme', 'Ashok Nagar', 'M.I. Road'],
    sampleTag: 'Jaipur Central (Tier 2)',
  },
  '226001': {
    district: 'Lucknow',
    state: 'Uttar Pradesh',
    circle: 'Uttar Pradesh Circle',
    localities: ['Lucknow G.P.O.', 'Hazratganj', 'Lalbagh', 'Kaiserbagh'],
    sampleTag: 'Hazratganj, Lucknow (Tier 2)',
  },
  '682001': {
    district: 'Ernakulam',
    state: 'Kerala',
    circle: 'Kerala Circle',
    localities: ['Kochi Fort', 'Ernakulam H.O', 'Marine Drive'],
    sampleTag: 'Kochi Marine Drive (Tier 2)',
  },
  '452001': {
    district: 'Indore',
    state: 'Madhya Pradesh',
    circle: 'Madhya Pradesh Circle',
    localities: ['Indore G.P.O.', 'MG Road', 'Sarafa', 'Chhotigwaltoli'],
    sampleTag: 'Indore Central (Tier 2)',
  },
  '248001': {
    district: 'Dehradun',
    state: 'Uttarakhand',
    circle: 'Uttarakhand Circle',
    localities: ['Dehradun G.P.O.', 'Rajpur Road', 'Clock Tower'],
    sampleTag: 'Dehradun (Tier 2)',
  },
  '171001': {
    district: 'Shimla',
    state: 'Himachal Pradesh',
    circle: 'Himachal Pradesh Circle',
    localities: ['Shimla G.P.O.', 'The Mall', 'Ridge'],
    sampleTag: 'Shimla Hills (Tier 3)',
  },
};

/**
 * Fetch locality, district, state from India Post API
 */
export async function fetchPincodeDetails(pincode: string): Promise<Partial<LocationData>> {
  const cleanPin = pincode.trim().replace(/\D/g, '');

  if (cleanPin.length !== 6) {
    throw new Error('Please enter a valid 6-digit Indian Pincode.');
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6500);

    const res = await fetch(`https://api.postalpincode.in/pincode/${cleanPin}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Postal directory returned status: ${res.status}`);
    }

    const data = await res.json();

    if (Array.isArray(data) && data.length > 0 && data[0].Status === 'Success') {
      const postOffices = data[0].PostOffice || [];
      if (postOffices.length > 0) {
        const primary = postOffices[0];
        const allLocalities = Array.from(
          new Set(postOffices.map((po: { Name: string }) => po.Name).filter(Boolean))
        ) as string[];

        const district = primary.District || primary.Division || 'Urban';
        const state = primary.State || 'India';
        const circle = primary.Circle || '';
        const defaultLocality = allLocalities[0] || 'Main Area';

        const { tier, baseRate } = determineTierAndBaseRate(district, state, defaultLocality);

        return {
          pincode: cleanPin,
          locality: defaultLocality,
          availableLocalities: allLocalities,
          district,
          state,
          circle,
          tier,
          baseRatePerSqFt: baseRate,
          userAdjustedRate: null,
          error: null,
        };
      }
    }

    // If API returned "No records found"
    if (Array.isArray(data) && data[0]?.Status === 'Error') {
      // Check fallback popular pins
      if (POPULAR_PINCODES[cleanPin]) {
        const fb = POPULAR_PINCODES[cleanPin];
        const { tier, baseRate } = determineTierAndBaseRate(fb.district, fb.state, fb.localities[0]);
        return {
          pincode: cleanPin,
          locality: fb.localities[0],
          availableLocalities: fb.localities,
          district: fb.district,
          state: fb.state,
          circle: fb.circle,
          tier,
          baseRatePerSqFt: baseRate,
          userAdjustedRate: null,
          error: null,
        };
      }
      throw new Error('No postal records found for this pincode. Please verify the 6 digits or choose from sample locations.');
    }

    throw new Error('Unexpected response format from Postal Pincode Directory.');
  } catch (err: any) {
    // If network error occurred, check if we have cached popular pincodes
    if (POPULAR_PINCODES[cleanPin]) {
      const fb = POPULAR_PINCODES[cleanPin];
      const { tier, baseRate } = determineTierAndBaseRate(fb.district, fb.state, fb.localities[0]);
      return {
        pincode: cleanPin,
        locality: fb.localities[0],
        availableLocalities: fb.localities,
        district: fb.district,
        state: fb.state,
        circle: fb.circle,
        tier,
        baseRatePerSqFt: baseRate,
        userAdjustedRate: null,
        error: null,
      };
    }

    throw err instanceof Error ? err : new Error('Unable to connect to Postal API. Please check your internet connection.');
  }
}

/**
 * Format currency in Indian standard (Crores / Lakhs / Thousands)
 */
export function formatIndianCurrency(amount: number, compact: boolean = false): string {
  if (isNaN(amount) || amount <= 0) return '₹0';

  if (compact) {
    if (amount >= 10000000) {
      const cr = amount / 10000000;
      return `₹${cr.toFixed(2)} Cr`;
    }
    if (amount >= 100000) {
      const lk = amount / 100000;
      return `₹${lk.toFixed(2)} L`;
    }
    return `₹${Math.round(amount).toLocaleString('en-IN')}`;
  }

  // Full format with Indian grouping
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export function getSmartChipsForCategory(cat: PropertyCategory): Array<{ label: string; boost: number; desc: string }> {
  switch (cat) {
    case 'residential':
      return [
        { label: 'Covered Parking', boost: 5, desc: 'Dedicated stilt or basement vehicle bay' },
        { label: 'Gated Society', boost: 6, desc: '24/7 security with perimeter access control' },
        { label: 'Elevator/Lift', boost: 4, desc: 'Dual automatic passenger lifts with ARD' },
        { label: 'Park/Main Road Facing', boost: 4, desc: 'Scenic park view or premier avenue elevation' },
        { label: 'Modular Kitchen', boost: 3, desc: 'Branded hardware with granite slab & hob' },
        { label: 'OC Available', boost: 8, desc: 'Occupancy Certificate issued by municipal body' },
      ];

    case 'retail':
      return [
        { label: 'Corner Plot', boost: 8, desc: 'Double road frontage with dual display visibility' },
        { label: 'Main Road Facing (>40ft)', boost: 7, desc: 'Direct arterial highway or 40ft+ road access' },
        { label: 'Mezzanine/Loft Floor', boost: 5, desc: 'Built-in storage or upper manager cabin' },
        { label: 'Water Connection', boost: 3, desc: 'Dedicated municipal commercial water meter' },
        { label: 'Currently Rented Out', boost: 6, desc: 'Active rental yield with formal lease agreement' },
      ];

    case 'commercial':
      return [
        { label: 'Grade-A Building', boost: 10, desc: 'LEED certified campus with premium glass façade' },
        { label: 'Central HVAC', boost: 6, desc: 'Chilled water central air conditioning plant' },
        { label: '100% Power Backup', boost: 5, desc: 'Heavy-duty DG sync panel with N+1 redundancy' },
        { label: 'Metro Proximity (<500m)', boost: 8, desc: 'High transit convenience for staff & clients' },
        { label: 'Multi-Level Car Parking', boost: 4, desc: 'Ample allotted reserved visitor parking' },
      ];

    case 'industrial':
      return [
        { label: 'Heavy Power Load (>100 KVA)', boost: 10, desc: 'HT industrial connection with dedicated substation transformer' },
        { label: 'Dock Leveller & Shutter', boost: 6, desc: 'Hydraulic ramp for multi-axle freight containers' },
        { label: 'Pollution Board (PCB) NOC', boost: 8, desc: 'Consent to Operate (CTO) red/orange zone clearance' },
        { label: 'Fire Safety NOC & Sprinklers', boost: 7, desc: 'Active water hydrant ring with automatic ceiling heads' },
        { label: 'Proximity to National Highway', boost: 8, desc: 'Zero truck transit restrictions directly on arterial corridor' },
      ];

    default:
      return [];
  }
}

export function calculateNetBoosterMultiplier(boosters: PropertyBoosters, category: PropertyCategory): number {
  let totalMultiplier = 0;
  const smartChips = getSmartChipsForCategory(category);

  // 1. Smart chips
  smartChips.forEach((chip) => {
    if (boosters.selectedSmartChips?.includes(chip.label)) {
      totalMultiplier += chip.boost;
    }
  });

  // 2. Property Age Multiplier
  switch (boosters.propertyAge) {
    case 'under_5_yrs':
      totalMultiplier += 4;
      break;
    case '5_to_15_yrs':
      totalMultiplier += 0;
      break;
    case '15_to_30_yrs':
      totalMultiplier -= 8;
      break;
    case '30_plus_yrs':
      totalMultiplier -= 18;
      break;
  }

  // 3. Ownership / Title Type Multiplier
  switch (boosters.ownershipTitleType) {
    case 'freehold_registered':
      totalMultiplier += 5;
      break;
    case 'leasehold_society':
      totalMultiplier += 0;
      break;
    case 'gaothan_unregistered':
      totalMultiplier -= 15;
      break;
  }

  return totalMultiplier;
}
