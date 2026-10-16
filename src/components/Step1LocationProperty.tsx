import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Search, 
  Home, 
  Store, 
  Building2, 
  Warehouse, 
  CheckCircle2, 
  ArrowRight, 
  Plus, 
  Minus, 
  Sliders, 
  AlertCircle,
  Loader2,
  Sparkles,
  Info,
  Layers,
  ShieldCheck,
  AlertTriangle,
  Ruler,
  Check,
  Camera,
  FileText,
  Scan
} from 'lucide-react';
import { 
  PropertyCategory, 
  LocationData, 
  PropertyDetails,
  FloorConfig,
  MunicipalSanctionStatus,
  AreaMeasurementMode
} from '../types/property';
import { 
  fetchPincodeDetails, 
  formatIndianCurrency, 
  POPULAR_PINCODES 
} from '../utils/tierRates';

interface Step1Props {
  location: LocationData;
  setLocation: React.Dispatch<React.SetStateAction<LocationData>>;
  property: PropertyDetails;
  setProperty: React.Dispatch<React.SetStateAction<PropertyDetails>>;
  onNext: () => void;
}

export const Step1LocationProperty: React.FC<Step1Props> = ({
  location,
  setLocation,
  property,
  setProperty,
  onNext,
}) => {
  const [pincodeInput, setPincodeInput] = useState<string>(location.pincode);
  const [isEditingRate, setIsEditingRate] = useState<boolean>(false);
  const [rateInput, setRateInput] = useState<number>(
    location.userAdjustedRate || location.baseRatePerSqFt
  );

  // Sync internal rate input if location base rate changes
  useEffect(() => {
    setRateInput(location.userAdjustedRate || location.baseRatePerSqFt);
  }, [location.baseRatePerSqFt, location.userAdjustedRate]);

  // Handle live pincode search when 6 digits are reached
  const handlePincodeSearch = async (pinToQuery: string) => {
    const cleanPin = pinToQuery.trim().replace(/\D/g, '');
    if (cleanPin.length !== 6) return;

    setLocation((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const details = await fetchPincodeDetails(cleanPin);
      setLocation((prev) => ({
        ...prev,
        ...details,
        isLoading: false,
        error: null,
      }));
    } catch (err: any) {
      setLocation((prev) => ({
        ...prev,
        isLoading: false,
        error: err.message || 'Failed to fetch postal records.',
      }));
    }
  };

  const handlePincodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPincodeInput(val);
    if (val.length === 6) {
      handlePincodeSearch(val);
    }
  };

  const handleSelectSamplePincode = (pin: string) => {
    setPincodeInput(pin);
    handlePincodeSearch(pin);
  };

  const handleLocalityChange = (newLocality: string) => {
    setLocation((prev) => ({
      ...prev,
      locality: newLocality,
    }));
  };

  const effectiveRate = location.userAdjustedRate || location.baseRatePerSqFt;

  const calculateProvisionalCarpetArea = (p: PropertyDetails): number => {
    if (p.category === 'residential') {
      const commonArea = 350;
      const bedArea = (p.bedrooms || 2) * 150;
      const bathArea = (p.bathrooms || 2) * 45;
      const balcArea = (p.balconies || 1) * 50;
      const subtotal = commonArea + bedArea + bathArea + balcArea;
      const circulation = Math.round(subtotal * 0.10);
      const singleFloor = subtotal + circulation;
      const floors = Math.max(1, p.numberOfFloors || 1);
      return singleFloor * floors;
    } else if (p.category === 'retail') {
      return 350 * Math.max(1, p.numberOfFloors || 1);
    } else if (p.category === 'commercial') {
      return 800 * Math.max(1, p.numberOfFloors || 1);
    } else {
      return 1500 * Math.max(1, p.numberOfFloors || 1);
    }
  };

  const isAiCameraMode = property.areaMeasurementMode !== 'manual_deed';
  const provisionalArea = calculateProvisionalCarpetArea(property);
  const activeCarpetArea = isAiCameraMode 
    ? (property.carpetAreaSqFt || provisionalArea)
    : (property.carpetAreaSqFt || provisionalArea);

  // Single-floor base area fallback
  const singleFloorArea = property.singleFloorCarpetAreaSqFt || 
    (property.numberOfFloors > 1 ? Math.round(activeCarpetArea / property.numberOfFloors) : activeCarpetArea);

  // Default plot area for Row House (1.5x) or Villa (2.0x)
  const defaultPlotArea = property.plotAreaSqFt || Math.round(
    singleFloorArea * (property.subType === 'row_house' ? 1.5 : 2.0)
  );

  // Dynamic Indian Banking Baseline Valuation
  let estimatedMarketValue = 0;
  let sanctionedEligibleValue = 0;

  if (property.category === 'residential') {
    if (property.subType === 'row_house') {
      // Gated Row House (Composite Method)
      // Land Value = (Fixed Plot Area × Pincode Base Rate × 0.75)
      // Construction Value = (Total Combined Carpet Area × ₹2,800/sq.ft)
      const landVal = Math.round(defaultPlotArea * effectiveRate * 0.75);
      const constructionVal = Math.round(activeCarpetArea * 2800);
      estimatedMarketValue = landVal + constructionVal;

      if (property.municipalSanctionStatus === 'ground_floor_only' && property.numberOfFloors >= 2) {
        // Exclude unapproved upper floor construction
        const sanctionedFloorArea = singleFloorArea;
        const sanctionedConstrVal = Math.round(sanctionedFloorArea * 2800);
        sanctionedEligibleValue = landVal + sanctionedConstrVal;
      } else {
        sanctionedEligibleValue = estimatedMarketValue;
      }
    } else if (property.subType === 'independent_house') {
      // Independent Villa (Composite Land + Building Method)
      // Land Value = (Fixed Plot Area × Pincode Base Rate × 0.85)
      // Construction Value = (Total Combined Carpet Area × ₹3,200/sq.ft)
      const landVal = Math.round(defaultPlotArea * effectiveRate * 0.85);
      const constructionVal = Math.round(activeCarpetArea * 3200);
      estimatedMarketValue = landVal + constructionVal;

      if (property.municipalSanctionStatus === 'ground_floor_only' && property.numberOfFloors >= 2) {
        const sanctionedFloorArea = singleFloorArea;
        const sanctionedConstrVal = Math.round(sanctionedFloorArea * 3200);
        sanctionedEligibleValue = landVal + sanctionedConstrVal;
      } else {
        sanctionedEligibleValue = estimatedMarketValue;
      }
    } else if (property.subType === 'builder_floor') {
      // Builder Floor: Built-up = Carpet × 1.15, UDS multiplier (1.15x for 1F, 1.20x for 2F, 1.25x for 3+F)
      const udsMult = property.numberOfFloors >= 3 ? 1.25 : property.numberOfFloors === 2 ? 1.20 : 1.15;
      const builtUpArea = Math.round(activeCarpetArea * 1.15);
      estimatedMarketValue = Math.round(builtUpArea * effectiveRate * udsMult);

      if (property.municipalSanctionStatus === 'ground_floor_only' && property.numberOfFloors >= 2) {
        sanctionedEligibleValue = Math.round(estimatedMarketValue / property.numberOfFloors);
      } else {
        sanctionedEligibleValue = estimatedMarketValue;
      }
    } else {
      // Apartment Flat: Super Built-up = Carpet × 1.25, Duplex multiplier 1.10x for 2+ floors
      const duplexMult = (property.numberOfFloors >= 2 || property.floorConfig === '2_floors' || property.floorConfig === '3_plus_floors') ? 1.10 : 1.0;
      const superBuiltUpArea = Math.round(activeCarpetArea * 1.25);
      estimatedMarketValue = Math.round(superBuiltUpArea * effectiveRate * duplexMult);
      sanctionedEligibleValue = estimatedMarketValue;
    }
  } else if (property.category === 'retail') {
    // Retail Shop with Mezzanine / Upper Floor: Ground 100% rate, Mezzanine/Upper 50% rate
    if (property.floorConfig === 'ground_plus_mezzanine') {
      const gfArea = Math.round(activeCarpetArea * 0.67);
      const mezArea = activeCarpetArea - gfArea;
      const gfVal = gfArea * effectiveRate;
      const mezVal = mezArea * effectiveRate * 0.5;
      estimatedMarketValue = Math.round((gfVal + mezVal) * 1.15);
      sanctionedEligibleValue = estimatedMarketValue;
    } else if (property.numberOfFloors >= 2) {
      const gfArea = Math.round(activeCarpetArea / property.numberOfFloors);
      const upperArea = activeCarpetArea - gfArea;
      const gfVal = gfArea * effectiveRate;
      const upperVal = upperArea * effectiveRate * 0.5;
      estimatedMarketValue = Math.round((gfVal + upperVal) * 1.15);

      if (property.municipalSanctionStatus === 'ground_floor_only') {
        sanctionedEligibleValue = Math.round(gfVal * 1.15);
      } else {
        sanctionedEligibleValue = estimatedMarketValue;
      }
    } else {
      estimatedMarketValue = Math.round(activeCarpetArea * 1.15 * effectiveRate);
      sanctionedEligibleValue = estimatedMarketValue;
    }
  } else if (property.category === 'commercial') {
    estimatedMarketValue = Math.round(activeCarpetArea * 1.25 * effectiveRate);
    sanctionedEligibleValue = estimatedMarketValue;
  } else {
    // Industrial
    estimatedMarketValue = Math.round(activeCarpetArea * 1.10 * effectiveRate);
    sanctionedEligibleValue = estimatedMarketValue;
  }

  // Max loan calculation based on Sanctioned Eligible Collateral Value
  const maxLoanEligible = Math.round(sanctionedEligibleValue * 0.75); // Standard 75% LTV

  // Category Configuration Cards
  const categories: Array<{
    id: PropertyCategory;
    title: string;
    subtitle: string;
    icon: React.ElementType;
    examples: string;
  }> = [
    {
      id: 'residential',
      title: 'Residential',
      subtitle: 'Apartment, Builder Floor & Villa',
      icon: Home,
      examples: 'Gated flats, independent bungalows, penthouses',
    },
    {
      id: 'retail',
      title: 'Retail & Store',
      subtitle: 'Kirana, Showroom & High-Street',
      icon: Store,
      examples: 'Corner shops, commercial retail, brand stores',
    },
    {
      id: 'commercial',
      title: 'Commercial Office',
      subtitle: 'IT Tech Parks & Corporate Suites',
      icon: Building2,
      examples: 'Grade-A tech hubs, coworking, clinics',
    },
    {
      id: 'industrial',
      title: 'Industrial & Shed',
      subtitle: 'Logistics Hub & Manufacturing',
      icon: Warehouse,
      examples: 'PEB warehouses, factory godowns, cold storage',
    },
  ];

  // Quick area presets for residential
  const residentialAreaPresets = [
    { label: '1 BHK (650 sq.ft)', area: 650, beds: 1, baths: 1 },
    { label: '2 BHK (1,150 sq.ft)', area: 1150, beds: 2, baths: 2 },
    { label: '3 BHK (1,600 sq.ft)', area: 1600, beds: 3, baths: 3 },
    { label: '4 BHK+ (2,400 sq.ft)', area: 2400, beds: 4, baths: 4 },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Title & Intro */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700 tracking-wider uppercase mb-1">
            <span>Appraisal Step 01</span>
            <span aria-hidden="true">·</span>
            <span>Circle Rate &amp; Base Value</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Location &amp; Property Categorization
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Input your 6-digit Indian Postal Pincode to pull government registry rates, 
            detect city tier, and configure your property specs for appraisal.
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-600">
          <Info className="w-4 h-4 text-slate-500 shrink-0" />
          <span>Rates benchmarked to RBI, State Sub-Registrar &amp; NHB index</span>
        </div>
      </div>

      {/* SECTION 1: PINCODE & REAL-TIME POSTAL FETCH */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-indigo-600" />
              1. Indian Pincode &amp; Locality Detection
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Direct connection to India Post directory (`api.postalpincode.in`)
            </p>
          </div>

          {location.tier && !location.isLoading && (
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-slate-700">Classified Tier:</span>
              <span className="font-bold px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-800 border border-indigo-200">
                {location.tier}
              </span>
            </div>
          )}
        </div>

        {/* Pincode Input Box & Quick Samples */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-semibold text-sm">
                IN PIN
              </div>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={pincodeInput}
                onChange={handlePincodeChange}
                placeholder="Enter 6-digit Pincode (e.g., 560001)"
                className="w-full pl-20 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-base font-semibold placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all tabular-nums"
              />
              {location.isLoading && (
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-indigo-600">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => handlePincodeSearch(pincodeInput)}
              disabled={pincodeInput.length !== 6 || location.isLoading}
              className="px-6 py-3 bg-indigo-600 text-white font-semibold text-sm rounded-xl hover:bg-indigo-700 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>Fetch Locality</span>
            </button>
          </div>

          {/* Quick 1-Click Pincode shortcuts */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-500">
            <span className="font-medium text-slate-600">Quick Test Locations:</span>
            {Object.entries(POPULAR_PINCODES).slice(0, 6).map(([pin, meta]) => (
              <button
                key={pin}
                type="button"
                onClick={() => handleSelectSamplePincode(pin)}
                className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer text-[11px] font-medium ${
                  pincodeInput === pin
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {pin} · {meta.district}
              </button>
            ))}
          </div>
        </div>

        {/* Error notification if pincode failed */}
        {location.error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-800 text-xs sm:text-sm">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Unable to fetch postal records</p>
              <p className="text-red-700 mt-0.5">{location.error}</p>
            </div>
          </div>
        )}

        {/* DETECTED LOCALITY & BASE RATE CARD */}
        {location.district && !location.isLoading && (
          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              {/* Locality details */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Verified India Post Location</span>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                  {location.availableLocalities.length > 1 ? (
                    <div className="flex items-center gap-2">
                      <label htmlFor="localitySelect" className="text-xs text-slate-500 font-medium">
                        Locality:
                      </label>
                      <select
                        id="localitySelect"
                        value={location.locality}
                        onChange={(e) => handleLocalityChange(e.target.value)}
                        className="bg-white border border-slate-300 text-slate-900 font-bold text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                      >
                        {location.availableLocalities.map((loc) => (
                          <option key={loc} value={loc}>
                            {loc}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <span className="text-base font-bold text-slate-900">
                      {location.locality}
                    </span>
                  )}
                  <span className="text-slate-400 font-normal">|</span>
                  <span className="text-sm font-semibold text-slate-700">
                    {location.district}, {location.state}
                  </span>
                  <span className="text-xs text-slate-500">
                    (PIN: {location.pincode})
                  </span>
                </div>
              </div>

              {/* Base Rate Badge & Adjustment Trigger */}
              <div className="flex items-center gap-4 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Estimated Base Rate
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-extrabold text-slate-900 tabular-nums">
                      {formatIndianCurrency(effectiveRate)}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">/ sq.ft</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsEditingRate(!isEditingRate)}
                  className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>{isEditingRate ? 'Done' : 'Fine-Tune'}</span>
                </button>
              </div>
            </div>

            {/* Optional Rate Fine-tuning drawer */}
            {isEditingRate && (
              <div className="pt-2 pb-1 space-y-3 bg-white p-4 rounded-xl border border-indigo-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">
                    Adjust Micro-Market Base Rate per sq.ft (INR):
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setLocation((prev) => ({ ...prev, userAdjustedRate: null }));
                      setRateInput(location.baseRatePerSqFt);
                    }}
                    className="text-xs text-indigo-600 hover:underline cursor-pointer"
                  >
                    Reset to government default ({formatIndianCurrency(location.baseRatePerSqFt)}/sq.ft)
                  </button>
                </div>

                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={2000}
                    max={40000}
                    step={250}
                    value={rateInput}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setRateInput(val);
                      setLocation((prev) => ({ ...prev, userAdjustedRate: val }));
                    }}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                  <div className="w-32 shrink-0">
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-500 text-xs font-semibold">
                        ₹
                      </span>
                      <input
                        type="number"
                        min={1000}
                        max={100000}
                        step={100}
                        value={rateInput}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setRateInput(val);
                          setLocation((prev) => ({ ...prev, userAdjustedRate: val }));
                        }}
                        className="w-full pl-6 pr-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 tabular-nums focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500">
                  Tip: Circle rates vary by street width, sub-zone (e.g. prime avenue vs interior lane), and floor rise.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION 2: PROPERTY CATEGORY SELECTION */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            2. Select Property Category
          </h2>
          <p className="text-xs text-slate-500">
            Choose the structural classification to load the corresponding bank appraisal guidelines
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map((cat) => {
            const isSelected = property.category === cat.id;
            const CatIcon = cat.icon;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setProperty((prev) => ({ ...prev, category: cat.id }))}
                className={`flex flex-col text-left p-5 rounded-2xl transition-all cursor-pointer relative ${
                  isSelected
                    ? 'bg-indigo-50/50 border-2 border-indigo-600 shadow-sm ring-4 ring-indigo-500/10'
                    : 'bg-white border border-slate-200 hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    <CatIcon className="w-6 h-6" />
                  </div>
                  {isSelected && (
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                      ✓
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-slate-900 mb-1">
                  {cat.title}
                </h3>
                <p className="text-xs font-medium text-slate-600 mb-3">
                  {cat.subtitle}
                </p>
                <p className="text-[11px] text-slate-400 mt-auto pt-2 border-t border-slate-100">
                  {cat.examples}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: CATEGORY-SPECIFIC SPECIFICATIONS */}
      {property.category === 'residential' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Home className="w-4 h-4 text-indigo-600" />
                Residential Specifications &amp; Room Counters
              </h3>
              <p className="text-xs text-slate-500">
                Configure carpet area and identical room counts to speed up Step 2 video capture
              </p>
            </div>
            <div className="text-xs font-medium text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
              Identical Room Multiplier Active
            </div>
          </div>

          {/* 1. Sub-type selector (Apartment Flat, Builder Floor, Independent Villa, Gated Row House) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Residential Type
              </label>
              <span className="text-xs text-slate-500 font-medium">
                Drives structural loading &amp; collateral valuation engine
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { 
                  id: 'apartment', 
                  label: 'Apartment Flat',
                  desc: '25% Common Area Loading · 1.0x (1.10x Duplex)' 
                },
                { 
                  id: 'builder_floor', 
                  label: 'Builder Floor',
                  desc: '15% Loading · High Undivided Land Share (UDS)' 
                },
                { 
                  id: 'independent_house', 
                  label: 'Independent Villa',
                  desc: 'Composite: Land (85% Base) + Constr (₹3,200/sqft)' 
                },
                { 
                  id: 'row_house', 
                  label: 'Gated Row House',
                  desc: 'Composite: Land (75% Base) + Constr (₹2,800/sqft)' 
                },
              ].map((sub) => {
                const isSelected = property.subType === sub.id;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => {
                      const baseSingle = property.singleFloorCarpetAreaSqFt || 
                        (property.numberOfFloors > 1 ? Math.round(property.carpetAreaSqFt / property.numberOfFloors) : property.carpetAreaSqFt);
                      
                      let newPlot = property.plotAreaSqFt;
                      if (sub.id === 'row_house') {
                        newPlot = Math.round(baseSingle * 1.5);
                      } else if (sub.id === 'independent_house') {
                        newPlot = Math.round(baseSingle * 2.0);
                      }

                      setProperty((prev) => ({
                        ...prev,
                        subType: sub.id,
                        plotAreaSqFt: newPlot,
                        singleFloorCarpetAreaSqFt: baseSingle,
                      }));
                    }}
                    className={`p-3 text-left rounded-xl border transition-all cursor-pointer relative ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-indigo-500/20'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold">{sub.label}</span>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                    </div>
                    <span className={`text-[10px] block leading-tight ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                      {sub.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Number of Floors Being Valued */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Number of Floors Being Valued</span>
                </label>
                <p className="text-[11px] text-slate-500">
                  Select structural levels to be surveyed and collateralized
                </p>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-100/70 text-indigo-800">
                {property.numberOfFloors === 1 ? 'Single Level' : property.numberOfFloors === 2 ? 'Duplex / G+1' : 'Multi-Storey (3+)'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {[
                { id: '1_floor' as FloorConfig, count: 1, label: '1 Floor (Single Level)' },
                { id: '2_floors' as FloorConfig, count: 2, label: '2 Floors (G+1 / Duplex)' },
                { id: '3_plus_floors' as FloorConfig, count: 3, label: '3+ Floors (Multi-Level)' },
              ].map((fl) => {
                const isSelected = (property.numberOfFloors || 1) === fl.count;
                return (
                  <button
                    key={fl.id}
                    type="button"
                    onClick={() => {
                      const singleArea = property.singleFloorCarpetAreaSqFt || 
                        (property.numberOfFloors > 1 ? Math.round(property.carpetAreaSqFt / property.numberOfFloors) : property.carpetAreaSqFt);
                      const combinedArea = property.isMultiFloorMultiplierEnabled
                        ? Math.round(singleArea * fl.count)
                        : property.carpetAreaSqFt;

                      setProperty((prev) => ({
                        ...prev,
                        floorConfig: fl.id,
                        numberOfFloors: fl.count,
                        singleFloorCarpetAreaSqFt: singleArea,
                        carpetAreaSqFt: combinedArea,
                      }));
                    }}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {fl.label}
                  </button>
                );
              })}
            </div>

            {/* Per-Floor vs Total Area Toggle */}
            <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="multiFloorMultiplierToggle"
                  checked={!!property.isMultiFloorMultiplierEnabled}
                  onChange={(e) => {
                    const enabled = e.target.checked;
                    const singleArea = property.singleFloorCarpetAreaSqFt || 
                      (property.numberOfFloors > 1 ? Math.round(property.carpetAreaSqFt / property.numberOfFloors) : property.carpetAreaSqFt);
                    const combined = enabled 
                      ? Math.round(singleArea * (property.numberOfFloors || 1)) 
                      : singleArea;

                    setProperty((prev) => ({
                      ...prev,
                      isMultiFloorMultiplierEnabled: enabled,
                      singleFloorCarpetAreaSqFt: singleArea,
                      carpetAreaSqFt: combined,
                    }));
                  }}
                  className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                />
                <label htmlFor="multiFloorMultiplierToggle" className="text-xs font-semibold text-slate-800 cursor-pointer select-none">
                  Multiply single-floor carpet area by number of floors
                </label>
              </div>

              <span className="text-[11px] text-slate-500 font-medium">
                {property.isMultiFloorMultiplierEnabled ? (
                  <span className="text-emerald-700 font-semibold">
                    ✓ Total: {(singleFloorArea * (property.numberOfFloors || 1)).toLocaleString('en-IN')} sq.ft ({singleFloorArea} sq.ft × {property.numberOfFloors || 1} Floors)
                  </span>
                ) : (
                  <span>Entering combined area across all floors directly</span>
                )}
              </span>
            </div>
          </div>

          {/* 3. Municipal Sanction Check (When 2+ Floors for Villa, Row House, or Builder Floor) */}
          {(property.numberOfFloors >= 2 || property.floorConfig === '2_floors' || property.floorConfig === '3_plus_floors') &&
            (property.subType === 'independent_house' || property.subType === 'row_house' || property.subType === 'builder_floor') && (
            <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/90 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-700" />
                    <span>Municipal Sanction Check (Approved Floor Plan)</span>
                  </h4>
                  <p className="text-xs text-amber-800 mt-0.5">
                    Are all floors on the Approved Municipal Plan? Indian banks only lend against municipally sanctioned floor area.
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                  LTV Eligibility Impact
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setProperty((prev) => ({ ...prev, municipalSanctionStatus: 'all_floors_sanctioned' }))}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                    (property.municipalSanctionStatus || 'all_floors_sanctioned') === 'all_floors_sanctioned'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold block">Yes, All Floors Sanctioned</span>
                    <span className={`text-[11px] block mt-0.5 ${
                      (property.municipalSanctionStatus || 'all_floors_sanctioned') === 'all_floors_sanctioned' ? 'text-emerald-100' : 'text-slate-500'
                    }`}>
                      Full 100% construction value counted for bank loan LTV
                    </span>
                  </div>
                  {(property.municipalSanctionStatus || 'all_floors_sanctioned') === 'all_floors_sanctioned' && (
                    <Check className="w-4 h-4 text-white shrink-0 ml-2" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setProperty((prev) => ({ ...prev, municipalSanctionStatus: 'ground_floor_only' }))}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                    property.municipalSanctionStatus === 'ground_floor_only'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold block">Only Ground Floor Approved</span>
                    <span className={`text-[11px] block mt-0.5 ${
                      property.municipalSanctionStatus === 'ground_floor_only' ? 'text-amber-100' : 'text-slate-500'
                    }`}>
                      Upper floors valued for market estimate, but excluded from bank loan
                    </span>
                  </div>
                  {property.municipalSanctionStatus === 'ground_floor_only' && (
                    <AlertTriangle className="w-4 h-4 text-white shrink-0 ml-2" />
                  )}
                </button>
              </div>

              {property.municipalSanctionStatus === 'ground_floor_only' && (
                <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-100/60 p-2.5 rounded-lg border border-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>
                    <strong>Valuation Note:</strong> The appraisal will calculate Total Market Value for your reference, but institutional bank LTV will only be sanctioned against the Ground Floor.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* 4. Room Counts (Bedrooms, Bathrooms, Balconies) */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Room Counts
                </span>
                <p className="text-xs text-slate-500">
                  Pre-specify rooms so AI can detect primary zones and auto-extrapolate unfilmed duplicate rooms
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Bedrooms Counter */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-slate-900">Bedrooms</span>
                  <span className="text-xs font-semibold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded">
                    BHK
                  </span>
                </div>

                <div className="flex items-center justify-between bg-white p-2 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setProperty((prev) => {
                        const newBeds = Math.max(1, prev.bedrooms - 1);
                        const updated = { ...prev, bedrooms: newBeds };
                        if (prev.areaMeasurementMode !== 'manual_deed') {
                          updated.carpetAreaSqFt = calculateProvisionalCarpetArea(updated);
                        }
                        return updated;
                      });
                    }}
                    className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                    title="Decrease bedrooms"
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  <div className="text-center px-4">
                    <span className="text-2xl font-black text-slate-900 tabular-nums">
                      {property.bedrooms}
                    </span>
                    <span className="text-[11px] text-slate-500 block font-medium">
                      Bedrooms
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setProperty((prev) => {
                        const newBeds = Math.min(10, prev.bedrooms + 1);
                        const updated = { ...prev, bedrooms: newBeds };
                        if (prev.areaMeasurementMode !== 'manual_deed') {
                          updated.carpetAreaSqFt = calculateProvisionalCarpetArea(updated);
                        }
                        return updated;
                      });
                    }}
                    className="w-9 h-9 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 flex items-center justify-center transition-colors cursor-pointer"
                    title="Increase bedrooms"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Bathrooms Counter */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-slate-900">Bathrooms</span>
                  <span className="text-xs font-semibold text-slate-600 bg-slate-200/70 px-2 py-0.5 rounded">
                    Wet Area
                  </span>
                </div>

                <div className="flex items-center justify-between bg-white p-2 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setProperty((prev) => {
                        const newBaths = Math.max(1, prev.bathrooms - 1);
                        const updated = { ...prev, bathrooms: newBaths };
                        if (prev.areaMeasurementMode !== 'manual_deed') {
                          updated.carpetAreaSqFt = calculateProvisionalCarpetArea(updated);
                        }
                        return updated;
                      });
                    }}
                    className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                    title="Decrease bathrooms"
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  <div className="text-center px-4">
                    <span className="text-2xl font-black text-slate-900 tabular-nums">
                      {property.bathrooms}
                    </span>
                    <span className="text-[11px] text-slate-500 block font-medium">
                      Baths
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setProperty((prev) => {
                        const newBaths = Math.min(10, prev.bathrooms + 1);
                        const updated = { ...prev, bathrooms: newBaths };
                        if (prev.areaMeasurementMode !== 'manual_deed') {
                          updated.carpetAreaSqFt = calculateProvisionalCarpetArea(updated);
                        }
                        return updated;
                      });
                    }}
                    className="w-9 h-9 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 flex items-center justify-center transition-colors cursor-pointer"
                    title="Increase bathrooms"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Balconies Counter */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-slate-900">Balconies / Utility</span>
                  <span className="text-xs font-semibold text-slate-600 bg-slate-200/70 px-2 py-0.5 rounded">
                    Open Area
                  </span>
                </div>

                <div className="flex items-center justify-between bg-white p-2 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setProperty((prev) => {
                        const newBalcs = Math.max(0, prev.balconies - 1);
                        const updated = { ...prev, balconies: newBalcs };
                        if (prev.areaMeasurementMode !== 'manual_deed') {
                          updated.carpetAreaSqFt = calculateProvisionalCarpetArea(updated);
                        }
                        return updated;
                      });
                    }}
                    className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                    title="Decrease balconies"
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  <div className="text-center px-4">
                    <span className="text-2xl font-black text-slate-900 tabular-nums">
                      {property.balconies}
                    </span>
                    <span className="text-[11px] text-slate-500 block font-medium">
                      Balconies
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setProperty((prev) => {
                        const newBalcs = Math.min(8, prev.balconies + 1);
                        const updated = { ...prev, balconies: newBalcs };
                        if (prev.areaMeasurementMode !== 'manual_deed') {
                          updated.carpetAreaSqFt = calculateProvisionalCarpetArea(updated);
                        }
                        return updated;
                      });
                    }}
                    className="w-9 h-9 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 flex items-center justify-center transition-colors cursor-pointer"
                    title="Increase balconies"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3B: RETAIL / STORE SPECIFICATIONS */}
      {property.category === 'retail' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Store className="w-4 h-4 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">
              Retail &amp; High-Street Store Details
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                Store Format
              </label>
              <select
                value={property.subType}
                onChange={(e) => setProperty((prev) => ({ ...prev, subType: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="high_street">High-Street Main Road Retail</option>
                <option value="kirana_store">Kirana &amp; Convenience Store</option>
                <option value="showroom">Flagship Commercial Showroom</option>
                <option value="mall_shop">Shopping Mall Retail Unit</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                Carpet Area (sq.ft)
              </label>
              <input
                type="number"
                value={property.carpetAreaSqFt || ''}
                onChange={(e) =>
                  setProperty((prev) => ({
                    ...prev,
                    carpetAreaSqFt: Number(e.target.value) || 0,
                  }))
                }
                placeholder="e.g. 850"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 tabular-nums"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                Road Frontage Width (Feet)
              </label>
              <input
                type="number"
                value={property.frontageFeet || 20}
                onChange={(e) =>
                  setProperty((prev) => ({
                    ...prev,
                    frontageFeet: Number(e.target.value) || 15,
                  }))
                }
                placeholder="e.g. 25"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 tabular-nums"
              />
            </div>
          </div>

          {/* Retail Multi-Floor & Mezzanine Selector */}
          <div className="pt-3 border-t border-slate-100 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span>Store Floor Configuration</span>
              </label>
              <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                Ground 100% Rate · Mezzanine / Upper 50% Rate
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: '1_floor' as FloorConfig, count: 1, label: '1 Floor (Ground Only)' },
                { id: 'ground_plus_mezzanine' as FloorConfig, count: 2, label: 'Ground + Mezzanine/Loft' },
                { id: '2_floors' as FloorConfig, count: 2, label: '2 Floors (G+1)' },
                { id: '3_plus_floors' as FloorConfig, count: 3, label: '3+ Floors' },
              ].map((fl) => {
                const isSelected = property.floorConfig === fl.id;
                return (
                  <button
                    key={fl.id}
                    type="button"
                    onClick={() => setProperty((prev) => ({ ...prev, floorConfig: fl.id, numberOfFloors: fl.count }))}
                    className={`py-2 px-2.5 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {fl.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3C: COMMERCIAL OFFICE SPECIFICATIONS */}
      {property.category === 'commercial' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Building2 className="w-4 h-4 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">
              Commercial Office Specs
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                Building Type
              </label>
              <select
                value={property.subType}
                onChange={(e) => setProperty((prev) => ({ ...prev, subType: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="tech_park">Grade-A IT SEZ Tech Park</option>
                <option value="standalone_office">Standalone Commercial Office</option>
                <option value="coworking">Coworking Space Floor</option>
                <option value="medical_clinic">Medical Clinic / Diagnostic Suite</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                Super Built-up Area (sq.ft)
              </label>
              <input
                type="number"
                value={property.carpetAreaSqFt || ''}
                onChange={(e) =>
                  setProperty((prev) => ({
                    ...prev,
                    carpetAreaSqFt: Number(e.target.value) || 0,
                  }))
                }
                placeholder="e.g. 3500"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 tabular-nums"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                Workstation Capacity
              </label>
              <input
                type="number"
                value={property.seatingCapacity || 40}
                onChange={(e) =>
                  setProperty((prev) => ({
                    ...prev,
                    seatingCapacity: Number(e.target.value) || 20,
                  }))
                }
                placeholder="e.g. 45"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 tabular-nums"
              />
            </div>
          </div>

          {/* Commercial Floors */}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>Office Floors Being Valued</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: '1_floor' as FloorConfig, count: 1, label: '1 Floor (Single Plate)' },
                { id: '2_floors' as FloorConfig, count: 2, label: '2 Floors (Duplex Suite)' },
                { id: '3_plus_floors' as FloorConfig, count: 3, label: '3+ Floors (Multi-Level)' },
              ].map((fl) => {
                const isSelected = (property.numberOfFloors || 1) === fl.count;
                return (
                  <button
                    key={fl.id}
                    type="button"
                    onClick={() => setProperty((prev) => ({ ...prev, floorConfig: fl.id, numberOfFloors: fl.count }))}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {fl.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3D: INDUSTRIAL / WAREHOUSE */}
      {property.category === 'industrial' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Warehouse className="w-4 h-4 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">
              Industrial Shed &amp; Logistics Warehouse
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                Structure Type
              </label>
              <select
                value={property.subType}
                onChange={(e) => setProperty((prev) => ({ ...prev, subType: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="logistics_warehouse">Pre-Engineered Building (PEB) Warehouse</option>
                <option value="rcc_shed">Reinforced Cement Concrete (RCC) Shed</option>
                <option value="light_manufacturing">Light Manufacturing Industrial Shed</option>
                <option value="cold_storage">Temperature-Controlled Cold Storage</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                Covered Shed Area (sq.ft)
              </label>
              <input
                type="number"
                value={property.carpetAreaSqFt || ''}
                onChange={(e) =>
                  setProperty((prev) => ({
                    ...prev,
                    carpetAreaSqFt: Number(e.target.value) || 0,
                  }))
                }
                placeholder="e.g. 8000"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 tabular-nums"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                Clear Ceiling Height (Feet)
              </label>
              <input
                type="number"
                value={property.ceilingHeightFeet || 24}
                onChange={(e) =>
                  setProperty((prev) => ({
                    ...prev,
                    ceilingHeightFeet: Number(e.target.value) || 20,
                  }))
                }
                placeholder="e.g. 28"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 tabular-nums"
              />
            </div>
          </div>

          {/* Industrial Floors */}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>Facility Levels</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: '1_floor' as FloorConfig, count: 1, label: 'Single Level Bay' },
                { id: 'ground_plus_mezzanine' as FloorConfig, count: 2, label: 'Ground + Mezzanine Office' },
                { id: '2_floors' as FloorConfig, count: 2, label: '2+ Floor Complex' },
              ].map((fl) => {
                const isSelected = property.floorConfig === fl.id;
                return (
                  <button
                    key={fl.id}
                    type="button"
                    onClick={() => setProperty((prev) => ({ ...prev, floorConfig: fl.id, numberOfFloors: fl.count }))}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {fl.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: AREA MEASUREMENT METHOD CHOICE CARD */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Ruler className="w-4 h-4 text-indigo-600" />
              How do you want to measure your property area?
            </h3>
            <p className="text-xs text-slate-500">
              Choose whether to have Gemini AI measure your sq.ft from video or enter Deed figures directly
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
            {isAiCameraMode ? 'AI Camera Auto-Measurement' : 'Manual Deed Entry'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* OPTION A: AI Camera Measurement (Default - Recommended) */}
          <button
            type="button"
            onClick={() => {
              setProperty((prev) => ({
                ...prev,
                areaMeasurementMode: 'ai_camera',
                carpetAreaSqFt: prev.carpetAreaSqFt || calculateProvisionalCarpetArea(prev),
              }));
            }}
            className={`p-5 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
              isAiCameraMode
                ? 'bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white border-indigo-600 shadow-md ring-2 ring-indigo-500/30'
                : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                  isAiCameraMode ? 'bg-indigo-500 text-white' : 'bg-indigo-100 text-indigo-800'
                }`}>
                  Option A · Recommended
                </span>
                {isAiCameraMode && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              </div>

              <div className="flex items-center gap-2.5 mb-2">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  isAiCameraMode ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-400/30' : 'bg-indigo-50 text-indigo-600'
                }`}>
                  <Camera className="w-5 h-5" />
                </div>
                <h4 className="text-sm sm:text-base font-extrabold leading-tight">
                  AI Camera Measurement
                </h4>
              </div>

              <p className={`text-xs font-medium leading-relaxed mb-3 ${isAiCameraMode ? 'text-indigo-200' : 'text-slate-600'}`}>
                I don't know my exact sq.ft — let AI estimate area &amp; condition from video in Step 2.
              </p>

              <div className={`p-3 rounded-xl text-xs space-y-1.5 ${
                isAiCameraMode ? 'bg-white/10 text-slate-200 border border-white/10' : 'bg-slate-50 text-slate-600 border border-slate-200/60'
              }`}>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>Gemini Spatial Vision Model Active</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Detects standard 7ft doors, 2x2ft floor tiles, ceiling heights, and room perimeters to automatically calculate room dimensions.
                </p>
              </div>
            </div>

            <div className={`mt-4 pt-3 border-t text-xs flex items-center justify-between ${
              isAiCameraMode ? 'border-indigo-800/60 text-indigo-300' : 'border-slate-100 text-slate-500'
            }`}>
              <span>Provisional Area: <strong>~{provisionalArea.toLocaleString('en-IN')} sq.ft</strong></span>
              <span className="font-semibold text-[11px]">Finalizes in Step 2 →</span>
            </div>
          </button>

          {/* OPTION B: Manual Deed / RERA Area */}
          <button
            type="button"
            onClick={() => {
              setProperty((prev) => ({
                ...prev,
                areaMeasurementMode: 'manual_deed',
              }));
            }}
            className={`p-5 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
              !isAiCameraMode
                ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-indigo-500/30'
                : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                  !isAiCameraMode ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-700'
                }`}>
                  Option B · Manual Deed
                </span>
                {!isAiCameraMode && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              </div>

              <div className="flex items-center gap-2.5 mb-2">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  !isAiCameraMode ? 'bg-slate-800 text-slate-300 border border-slate-700' : 'bg-slate-100 text-slate-700'
                }`}>
                  <FileText className="w-5 h-5" />
                </div>
                <h4 className="text-sm sm:text-base font-extrabold leading-tight">
                  I know my exact Deed / RERA Carpet Area
                </h4>
              </div>

              <p className={`text-xs font-medium leading-relaxed mb-3 ${!isAiCameraMode ? 'text-slate-300' : 'text-slate-600'}`}>
                Enter sq.ft manually, use Step 2 video only to grade interior luxury &amp; condition.
              </p>

              <div className={`p-3 rounded-xl text-xs space-y-1.5 ${
                !isAiCameraMode ? 'bg-white/10 text-slate-200 border border-white/10' : 'bg-slate-50 text-slate-600 border border-slate-200/60'
              }`}>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-300">
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>Exact Registered Figure</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Use the carpet area mentioned in your Registered Sale Deed, Allotment Letter, or RERA filing.
                </p>
              </div>
            </div>

            <div className={`mt-4 pt-3 border-t text-xs flex items-center justify-between ${
              !isAiCameraMode ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-500'
            }`}>
              <span>Current Input: <strong>{property.carpetAreaSqFt ? `${property.carpetAreaSqFt.toLocaleString('en-IN')} sq.ft` : 'None specified'}</strong></span>
              <span className="font-semibold text-[11px]">Numeric box opens below</span>
            </div>
          </button>
        </div>

        {/* ONLY SHOW NUMERIC CARPET AREA INPUT BOX IF OPTION B IS EXPLICITLY CLICKED */}
        {!isAiCameraMode && (
          <div className="mt-4 p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <span>Enter Deed / RERA Carpet Area</span>
                </h4>
                <p className="text-xs text-slate-500">
                  Specify the precise RERA carpet area from your legal deed documents
                </p>
              </div>
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                Deed Input Active
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                  Total Carpet Area (sq.ft)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={100}
                    max={50000}
                    step={25}
                    value={property.carpetAreaSqFt || ''}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      const numFloors = Math.max(1, property.numberOfFloors || 1);
                      const single = numFloors > 1 ? Math.round(val / numFloors) : val;
                      let updatedPlot = property.plotAreaSqFt;
                      if (property.subType === 'row_house') {
                        updatedPlot = Math.round(single * 1.5);
                      } else if (property.subType === 'independent_house') {
                        updatedPlot = Math.round(single * 2.0);
                      }
                      setProperty((prev) => ({
                        ...prev,
                        carpetAreaSqFt: val,
                        singleFloorCarpetAreaSqFt: single,
                        plotAreaSqFt: updatedPlot,
                      }));
                    }}
                    placeholder="e.g. 1150"
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold text-base focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 tabular-nums"
                  />
                  <span className="absolute inset-y-0 right-0 pr-4 flex items-center text-xs font-semibold text-slate-400 pointer-events-none">
                    sq.ft
                  </span>
                </div>
              </div>

              {/* Plot area if villa or row house */}
              {(property.subType === 'independent_house' || property.subType === 'row_house') && (
                <div>
                  <label className="text-xs font-bold text-indigo-900 uppercase tracking-wider block mb-1.5">
                    Total Plot / Land Area (sq.ft)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={200}
                      max={50000}
                      step={25}
                      value={property.plotAreaSqFt || defaultPlotArea}
                      onChange={(e) =>
                        setProperty((prev) => ({
                          ...prev,
                          plotAreaSqFt: Number(e.target.value) || 0,
                        }))
                      }
                      placeholder="e.g. 2400"
                      className="w-full px-4 py-2.5 bg-white border border-indigo-200 rounded-xl text-slate-900 font-bold text-base focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 tabular-nums"
                    />
                    <span className="absolute inset-y-0 right-0 pr-4 flex items-center text-xs font-semibold text-indigo-500 pointer-events-none">
                      plot sq.ft
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Presets */}
            {property.category === 'residential' && (
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200/70">
                <span className="text-xs font-medium text-slate-500 mr-1">Quick BHK Presets:</span>
                {residentialAreaPresets.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      const numFloors = Math.max(1, property.numberOfFloors || 1);
                      const combined = preset.area * numFloors;
                      const plotDefault = Math.round(preset.area * (property.subType === 'row_house' ? 1.5 : 2.0));
                      setProperty((prev) => ({
                        ...prev,
                        singleFloorCarpetAreaSqFt: preset.area,
                        carpetAreaSqFt: combined,
                        plotAreaSqFt: (prev.subType === 'row_house' || prev.subType === 'independent_house') ? plotDefault : prev.plotAreaSqFt,
                        bedrooms: preset.beds,
                        bathrooms: preset.baths,
                      }));
                    }}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                      property.carpetAreaSqFt === preset.area
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* SUMMARY BANNER & NEXT STEP BUTTON */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300 tracking-wider uppercase">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Real-Time Valuation Baseline</span>
          </div>

          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <div>
              <span className="text-xs text-slate-400 block">Indicative Fair Value</span>
              <span className="text-2xl sm:text-3xl font-extrabold text-white tabular-nums tracking-tight">
                {formatIndianCurrency(estimatedMarketValue, true)}
              </span>
            </div>

            <div className="border-l border-slate-700 pl-6 hidden sm:block">
              <span className="text-xs text-slate-400 block">Est. Bank Loan LTV (75%)</span>
              <span className="text-xl sm:text-2xl font-bold text-emerald-400 tabular-nums">
                {formatIndianCurrency(maxLoanEligible, true)}
              </span>
            </div>

            <div className="border-l border-slate-700 pl-6 hidden lg:block">
              <span className="text-xs text-slate-400 block">Rate / sq.ft</span>
              <span className="text-lg font-semibold text-slate-200 tabular-nums">
                {formatIndianCurrency(effectiveRate)}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 max-w-xl">
            <span>
              Location: <strong className="text-white font-medium">{location.locality || 'Locality pending'}, {location.district}</strong>
            </span>
            <span>·</span>
            <span>
              Carpet Area: <strong className="text-white font-medium">
                {isAiCameraMode 
                  ? `~${activeCarpetArea.toLocaleString('en-IN')} sq.ft (AI Camera in Step 2)` 
                  : `${(property.carpetAreaSqFt || activeCarpetArea).toLocaleString('en-IN')} sq.ft (Deed)`}
              </strong>
            </span>
            <span>·</span>
            <span>
              Type: <strong className="text-white font-medium capitalize">{property.subType.replace('_', ' ')}</strong>
            </span>
            <span>·</span>
            <span>
              Floors: <strong className="text-white font-medium">{property.numberOfFloors || 1} Level(s)</strong>
            </span>
            {(property.subType === 'independent_house' || property.subType === 'row_house') && (
              <>
                <span>·</span>
                <span className="text-indigo-300 font-medium">
                  Plot: {(property.plotAreaSqFt || defaultPlotArea).toLocaleString('en-IN')} sq.ft
                </span>
              </>
            )}
            {property.municipalSanctionStatus === 'ground_floor_only' && (property.numberOfFloors >= 2 || property.floorConfig === '2_floors' || property.floorConfig === '3_plus_floors') && (
              <>
                <span>·</span>
                <span className="text-amber-400 font-semibold">
                  Only Ground Floor Sanctioned (Bank LTV: {formatIndianCurrency(sanctionedEligibleValue, true)})
                </span>
              </>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onNext}
          disabled={!isAiCameraMode && (!property.carpetAreaSqFt || property.carpetAreaSqFt <= 0)}
          className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base rounded-xl transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-3 shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          <span>{isAiCameraMode ? 'Next: AI Video Scan' : 'Next: Guided Video Scan'}</span>
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};
