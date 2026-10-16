export type PropertyCategory = 'residential' | 'retail' | 'commercial' | 'industrial';

export type ResidentialSubtype = 'apartment' | 'independent_house' | 'villa' | 'builder_floor';
export type RetailSubtype = 'high_street' | 'kirana_store' | 'showroom' | 'mall_shop';
export type CommercialSubtype = 'tech_park' | 'standalone_office' | 'coworking' | 'medical_clinic';
export type IndustrialSubtype = 'logistics_warehouse' | 'rcc_shed' | 'light_manufacturing' | 'cold_storage';

export type CityTier = 'Tier-1 Metro' | 'Tier-2 Urban' | 'Tier-3 Semi-Urban / Rural';

export interface LocationData {
  pincode: string;
  locality: string;
  availableLocalities: string[];
  district: string;
  state: string;
  circle: string;
  tier: CityTier;
  baseRatePerSqFt: number;
  userAdjustedRate: number | null;
  isLoading: boolean;
  error: string | null;
}

export type FloorConfig = '1_floor' | '2_floors' | '3_plus_floors' | 'ground_plus_mezzanine';
export type MunicipalSanctionStatus = 'all_floors_sanctioned' | 'ground_floor_only';
export type AreaMeasurementMode = 'ai_camera' | 'manual_deed';

export interface RoomDimensionBreakdown {
  roomName: string;
  category: 'filmed' | 'extrapolated' | 'manual';
  lengthFt: number;
  widthFt: number;
  sqFt: number;
  conditionScore?: number;
  referenceUsed: string;
  isExtrapolated?: boolean;
}

export interface PropertyDetails {
  category: PropertyCategory;
  subType: string;
  areaMeasurementMode: AreaMeasurementMode; // 'ai_camera' (Default) | 'manual_deed'
  carpetAreaSqFt: number; // Combined total carpet area across all floors
  aiMeasuredCarpetAreaSqFt?: number; // AI calculated carpet area from Step 2 video scan
  aiRoomBreakdown?: RoomDimensionBreakdown[]; // Room-by-room dimensions breakdown
  singleFloorCarpetAreaSqFt?: number; // Base area for single level
  plotAreaSqFt?: number; // Total Plot / Land Area (sq.ft) for Villa / Row House
  numberOfFloors: number; // Number of floors being valued (1, 2, 3+)
  floorConfig: FloorConfig;
  isMultiFloorMultiplierEnabled?: boolean; // Toggle to multiply single-floor area by floor count
  municipalSanctionStatus?: MunicipalSanctionStatus; // 'all_floors_sanctioned' | 'ground_floor_only'
  // Residential specific counters
  bedrooms: number;
  bathrooms: number;
  balconies: number;
  ageYears: number;
  floorLevel: 'ground' | 'middle' | 'top_penthouse';
  // Commercial / Retail specific
  frontageFeet?: number;
  seatingCapacity?: number;
  ceilingHeightFeet?: number;
  powerLoadKva?: number;
}

export type PropertyAgeOption = 'under_5_yrs' | '5_to_15_yrs' | '15_to_30_yrs' | '30_plus_yrs';
export type OwnershipTitleOption = 'freehold_registered' | 'leasehold_society' | 'gaothan_unregistered';

export interface PropertyBoosters {
  selectedSmartChips: string[];
  propertyAge: PropertyAgeOption;
  ownershipTitleType: OwnershipTitleOption;
  additionalContext: string;
  // Legacy / supplemental compatibility
  hasOccupancyCertificate?: boolean;
  hasReraRegistration?: boolean;
  isGatedSociety?: boolean;
  hasLiftAndPowerBackup?: boolean;
  hasClubhouseAmenities?: boolean;
  roadWidthFeet?: number;
  distanceToMetroKm?: number;
}


export interface ValuationSummary {
  fairMarketValue: number;
  realizableValue: number;
  distressSaleValue: number;
  indicativeBaseRate: number;
  totalAreaSqFt: number;
  maxEligibleLoanAmount: number;
  indicativeEmi: number;
  confidenceScore: number;
}

export interface CaptureZone {
  id: string;
  name: string;
  description: string;
  guidance: string;
  required: boolean;
  scaleReference: string;
}

export interface ZoneScanResult {
  zoneId: string;
  zoneName: string;
  videoBlobUrl?: string;
  extractedKeyframes: string[]; // 4 base64 data URLs
  isManualFallback: boolean;
  manualDimensions?: {
    lengthFt: number;
    widthFt: number;
    heightFt: number;
    flooringType: string;
    wallCondition: string;
  };
  aiDetectedDimensions?: {
    lengthFt: number;
    widthFt: number;
    sqFt: number;
    conditionScore: number;
    referenceUsed: string;
    notes?: string;
  };
  isAnalyzing?: boolean;
  capturedAt: string;
}

export type ScanResultsMap = Record<string, ZoneScanResult>;

export interface ZoneDimension {
  zoneName: string;
  estimatedLengthFt: number;
  estimatedWidthFt: number;
  estimatedSqFt: number;
  visualReferenceUsed: string;
}

export interface GeminiValuationSurvey {
  zoneWiseDimensions: ZoneDimension[];
  totalCarpetAreaSqFt: number;
  totalBuiltUpAreaSqFt: number;
  conditionScore: number;
  conditionMultiplier: number;
  smartChipBonusPercent: number;
  detectedVisualFeatures: string[];
  discrepancyOrRiskNotes: string[];
  confidenceLevel: 'High' | 'Medium' | 'Low' | string;
  calculatedAt?: string;
}

