import React, { useState } from 'react';
import { Header } from './components/Header';
import { StepProgressBar } from './components/StepProgressBar';
import { Step1LocationProperty } from './components/Step1LocationProperty';
import { Step2VideoScan } from './components/Step2VideoScan';
import { Step3Boosters } from './components/Step3Boosters';
import { Step4ValuationReport } from './components/Step4ValuationReport';
import { 
  LocationData, 
  PropertyDetails, 
  PropertyBoosters,
  ScanResultsMap,
  GeminiValuationSurvey 
} from './types/property';
import { determineTierAndBaseRate, POPULAR_PINCODES } from './utils/tierRates';

export default function App() {
  // Step state
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [scanResults, setScanResults] = useState<ScanResultsMap>({});
  const [geminiSurvey, setGeminiSurvey] = useState<GeminiValuationSurvey | null>(null);

  // Initial location seeded with Bengaluru 560001 default
  const initialPin = '560001';
  const defaultPinMeta = POPULAR_PINCODES[initialPin];
  const { tier, baseRate } = determineTierAndBaseRate(
    defaultPinMeta.district,
    defaultPinMeta.state,
    defaultPinMeta.localities[0]
  );

  const [location, setLocation] = useState<LocationData>({
    pincode: initialPin,
    locality: defaultPinMeta.localities[0],
    availableLocalities: defaultPinMeta.localities,
    district: defaultPinMeta.district,
    state: defaultPinMeta.state,
    circle: defaultPinMeta.circle,
    tier,
    baseRatePerSqFt: baseRate,
    userAdjustedRate: null,
    isLoading: false,
    error: null,
  });

  // Central Property State
  const [property, setProperty] = useState<PropertyDetails>({
    category: 'residential',
    subType: 'apartment',
    carpetAreaSqFt: 1150,
    singleFloorCarpetAreaSqFt: 1150,
    plotAreaSqFt: 2300,
    numberOfFloors: 1,
    floorConfig: '1_floor',
    isMultiFloorMultiplierEnabled: false,
    municipalSanctionStatus: 'all_floors_sanctioned',
    bedrooms: 2,
    bathrooms: 2,
    balconies: 1,
    ageYears: 2,
    floorLevel: 'middle',
    frontageFeet: 25,
    seatingCapacity: 40,
    ceilingHeightFeet: 24,
    powerLoadKva: 50,
  });

  // Boosters State
  const [boosters, setBoosters] = useState<PropertyBoosters>({
    selectedSmartChips: ['Covered Parking', 'Gated Society', 'OC Available'],
    propertyAge: 'under_5_yrs',
    ownershipTitleType: 'freehold_registered',
    additionalContext: '',
  });

  const handleNextFromStep1 = () => {
    setCompletedSteps((prev) => Array.from(new Set([...prev, 1])));
    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNextFromStep2 = () => {
    setCompletedSteps((prev) => Array.from(new Set([...prev, 2])));
    setCurrentStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNextFromStep3 = () => {
    setCompletedSteps((prev) => Array.from(new Set([...prev, 3])));
    setCurrentStep(4);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReset = () => {
    setCurrentStep(1);
    setCompletedSteps([]);
    setScanResults({});
    setGeminiSurvey(null);
    setLocation({
      pincode: initialPin,
      locality: defaultPinMeta.localities[0],
      availableLocalities: defaultPinMeta.localities,
      district: defaultPinMeta.district,
      state: defaultPinMeta.state,
      circle: defaultPinMeta.circle,
      tier,
      baseRatePerSqFt: baseRate,
      userAdjustedRate: null,
      isLoading: false,
      error: null,
    });
    setProperty({
      category: 'residential',
      subType: 'apartment',
      carpetAreaSqFt: 1150,
      singleFloorCarpetAreaSqFt: 1150,
      plotAreaSqFt: 2300,
      numberOfFloors: 1,
      floorConfig: '1_floor',
      isMultiFloorMultiplierEnabled: false,
      municipalSanctionStatus: 'all_floors_sanctioned',
      bedrooms: 2,
      bathrooms: 2,
      balconies: 1,
      ageYears: 2,
      floorLevel: 'middle',
      frontageFeet: 25,
      seatingCapacity: 40,
      ceilingHeightFeet: 24,
      powerLoadKva: 50,
    });
    setBoosters({
      selectedSmartChips: ['Covered Parking', 'Gated Society', 'OC Available'],
      propertyAge: 'under_5_yrs',
      ownershipTitleType: 'freehold_registered',
      additionalContext: '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Header */}
      <Header
        currentStep={currentStep}
        onNavigateStep={(step) => {
          setCurrentStep(step);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onReset={handleReset}
      />

      {/* 4-Step Wizard Progress Bar */}
      <StepProgressBar
        currentStep={currentStep}
        onStepClick={(step) => {
          setCurrentStep(step);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        completedSteps={completedSteps}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {currentStep === 1 && (
          <Step1LocationProperty
            location={location}
            setLocation={setLocation}
            property={property}
            setProperty={setProperty}
            onNext={handleNextFromStep1}
          />
        )}

        {currentStep === 2 && (
          <Step2VideoScan
            location={location}
            property={property}
            scanResults={scanResults}
            setScanResults={setScanResults}
            onNext={handleNextFromStep2}
            onPrev={() => {
              setCurrentStep(1);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {currentStep === 3 && (
          <Step3Boosters
            boosters={boosters}
            setBoosters={setBoosters}
            location={location}
            property={property}
            scanResults={scanResults}
            onSurveyCalculated={(survey) => {
              setGeminiSurvey(survey);
              handleNextFromStep3();
            }}
            onPrev={() => {
              setCurrentStep(2);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {currentStep === 4 && (
          <Step4ValuationReport
            location={location}
            property={property}
            boosters={boosters}
            scanResults={scanResults}
            geminiSurvey={geminiSurvey}
            onEditSpecs={() => {
              setCurrentStep(1);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onReset={handleReset}
          />
        )}
      </main>

      {/* Clean quiet footer compliant with anti-slop rules */}
      <footer className="bg-white border-t border-slate-200 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900">PropVal AI</span>
            <span aria-hidden="true">·</span>
            <span>Indian Property Valuation &amp; Loan-to-Value Eligibility Engine</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-500">
            <span>India Post Postal Directory</span>
            <span aria-hidden="true">·</span>
            <span>NHB RESIDEX Benchmark</span>
            <span aria-hidden="true">·</span>
            <span>RBI Master Circular Compliant</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
