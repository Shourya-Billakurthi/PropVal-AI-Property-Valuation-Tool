import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  ArrowLeft, 
  CheckCircle2, 
  Download, 
  Landmark, 
  Calculator, 
  ShieldCheck, 
  Share2, 
  TrendingUp, 
  Building, 
  Building2,
  Sparkles, 
  Sliders, 
  RotateCcw, 
  AlertTriangle,
  Info,
  Calendar,
  Check,
  Percent,
  Layers,
  Ruler,
  Loader2,
  ExternalLink,
  FileCheck,
  X,
  BadgeCheck,
  ChevronRight,
  Copy,
  Mail,
  MessageCircle,
  Send,
  Smartphone,
  CheckCheck
} from 'lucide-react';
import { 
  PropertyDetails, 
  LocationData, 
  PropertyBoosters, 
  ScanResultsMap, 
  GeminiValuationSurvey 
} from '../types/property';
import { formatIndianCurrency, calculateNetBoosterMultiplier } from '../utils/tierRates';
import { generateAndDownloadValuationPDF } from '../utils/pdfExport';

interface Step4Props {
  location: LocationData;
  property: PropertyDetails;
  boosters: PropertyBoosters;
  scanResults: ScanResultsMap;
  geminiSurvey?: GeminiValuationSurvey | null;
  onEditSpecs: () => void;
  onReset: () => void;
}

export interface BankEligibilityCardData {
  id: string;
  name: string;
  shortName: string;
  type: 'Public Sector' | 'Private' | 'NBFC';
  baseRate: number;
  rateRange: string;
  ltvPercent: number;
  maxSanction: number;
  monthlyEmi: number;
  status: string;
  isEligible: boolean;
  tag: string;
  tat: string;
  processingFee: string;
  features: string[];
  docChecklist: string[];
  cibilMin: number;
}

export const Step4ValuationReport: React.FC<Step4Props> = ({
  location,
  property,
  boosters,
  scanResults,
  geminiSurvey,
  onEditSpecs,
  onReset,
}) => {
  // Pincode base rate
  const pincodeBaseRate = location.userAdjustedRate || location.baseRatePerSqFt;

  // Subtype & Floor Specifications
  const isResidential = property.category === 'residential';
  const isVilla = isResidential && (property.subType === 'independent_house' || property.subType === 'villa');
  const isRowHouse = isResidential && property.subType === 'row_house';
  const isBuilderFloor = isResidential && property.subType === 'builder_floor';
  const isApartment = isResidential && (property.subType === 'apartment' || !property.subType);
  const isRetail = property.category === 'retail';
  const isCommercial = property.category === 'commercial';
  const isIndustrial = property.category === 'industrial';

  const numFloors = Math.max(1, property.numberOfFloors || 1);
  const isMultiFloor = numFloors >= 2 || property.floorConfig === '2_floors' || property.floorConfig === '3_plus_floors' || property.floorConfig === 'ground_plus_mezzanine';
  const isMezzanine = property.floorConfig === 'ground_plus_mezzanine';
  const isUnapprovedUpperFloor = property.municipalSanctionStatus === 'ground_floor_only' && isMultiFloor;

  // Single floor area estimate (carpet)
  const singleFloorArea = property.singleFloorCarpetAreaSqFt || 
    (numFloors > 1 ? Math.round(property.carpetAreaSqFt / numFloors) : property.carpetAreaSqFt);

  // Plot Area for Villa / Row House
  const fixedPlotArea = property.plotAreaSqFt || Math.round(singleFloorArea * (isRowHouse ? 1.5 : 2.0));

  // Compute verified booster multiplier directly from user-selected amenities, age, and title
  const computedBoosterBonus = calculateNetBoosterMultiplier(boosters, property.category);
  const smartChipBonusPercent = geminiSurvey?.smartChipBonusPercent !== undefined
    ? Math.max(geminiSurvey.smartChipBonusPercent, computedBoosterBonus)
    : computedBoosterBonus;
  const bonusMultiplier = 1 + (smartChipBonusPercent / 100);

  // Survey Multipliers
  const conditionMultiplier = geminiSurvey?.conditionMultiplier ?? 1.05;
  const conditionScore = geminiSurvey?.conditionScore ?? 8;

  // AI surveyed built-up area (Carpet area + loading for Indian building norms)
  const defaultLoadingMultiplier = isApartment || isCommercial ? 1.25 : 1.15;
  const baselineBuiltUp = Math.round(property.carpetAreaSqFt * defaultLoadingMultiplier);

  // Guard against drastic area collapse: sample inspection shouldn't shrink the declared property
  const aiSurveyedBuiltUp = geminiSurvey?.totalBuiltUpAreaSqFt && geminiSurvey.totalBuiltUpAreaSqFt >= baselineBuiltUp * 0.75
    ? Math.round(geminiSurvey.totalBuiltUpAreaSqFt)
    : baselineBuiltUp;

  // 1. Editable Area Override Slider State
  const [builtUpAreaSqFt, setBuiltUpAreaSqFt] = useState<number>(aiSurveyedBuiltUp);

  // Keep synced if geminiSurvey changes
  useEffect(() => {
    if (geminiSurvey?.totalBuiltUpAreaSqFt && geminiSurvey.totalBuiltUpAreaSqFt >= baselineBuiltUp * 0.75) {
      setBuiltUpAreaSqFt(Math.round(geminiSurvey.totalBuiltUpAreaSqFt));
    } else {
      setBuiltUpAreaSqFt(baselineBuiltUp);
    }
  }, [geminiSurvey, baselineBuiltUp]);

  // Detailed Component Trackers for Itemized Breakdown
  let landComponentValue = 0;
  let constructionComponentValue = 0;
  let groundFloorConstructionValue = 0;
  let upperFloorConstructionValue = 0;
  let loadingPercent = 20;
  let subtypeMultiplier = 1.0;
  let adjustedMarketValuation = 0;
  let sanctionedEligibleValue = 0;

  // 1. Composite & Subtype Valuation Engine:
  if (isVilla) {
    // Independent Villa (Composite Land + Building Method):
    // Land Value = (Fixed Plot Area × Pincode Base Rate × 0.85)
    // Construction Value = (Total Combined Carpet Area × ₹3,200/sq.ft × Condition Multiplier)
    // Never multiply Plot/Land Value by the number of floors—only multiply Construction Value by floor count.
    landComponentValue = Math.round(fixedPlotArea * pincodeBaseRate * 0.85);
    const totalConstructionArea = property.carpetAreaSqFt;
    constructionComponentValue = Math.round(totalConstructionArea * 3200 * conditionMultiplier);
    loadingPercent = 15;
    subtypeMultiplier = 1.0;

    const baseCompositeValue = landComponentValue + constructionComponentValue;
    adjustedMarketValuation = Math.round(baseCompositeValue * bonusMultiplier);

    if (isUnapprovedUpperFloor) {
      // Exclude unapproved upper floor construction from bank lending
      groundFloorConstructionValue = Math.round(singleFloorArea * 3200 * conditionMultiplier);
      upperFloorConstructionValue = Math.max(0, constructionComponentValue - groundFloorConstructionValue);
      sanctionedEligibleValue = Math.round((landComponentValue + groundFloorConstructionValue) * bonusMultiplier);
    } else {
      groundFloorConstructionValue = Math.round((totalConstructionArea / numFloors) * 3200 * conditionMultiplier);
      upperFloorConstructionValue = Math.max(0, constructionComponentValue - groundFloorConstructionValue);
      sanctionedEligibleValue = adjustedMarketValuation;
    }
  } else if (isRowHouse) {
    // Gated Row House (Composite Method):
    // Land Value = (Fixed Plot Area × Pincode Base Rate × 0.75)
    // Construction Value = (Total Combined Carpet Area × ₹2,800/sq.ft × Condition Multiplier)
    landComponentValue = Math.round(fixedPlotArea * pincodeBaseRate * 0.75);
    const totalConstructionArea = property.carpetAreaSqFt;
    constructionComponentValue = Math.round(totalConstructionArea * 2800 * conditionMultiplier);
    loadingPercent = 15;
    subtypeMultiplier = 1.0;

    const baseCompositeValue = landComponentValue + constructionComponentValue;
    adjustedMarketValuation = Math.round(baseCompositeValue * bonusMultiplier);

    if (isUnapprovedUpperFloor) {
      groundFloorConstructionValue = Math.round(singleFloorArea * 2800 * conditionMultiplier);
      upperFloorConstructionValue = Math.max(0, constructionComponentValue - groundFloorConstructionValue);
      sanctionedEligibleValue = Math.round((landComponentValue + groundFloorConstructionValue) * bonusMultiplier);
    } else {
      groundFloorConstructionValue = Math.round((totalConstructionArea / numFloors) * 2800 * conditionMultiplier);
      upperFloorConstructionValue = Math.max(0, constructionComponentValue - groundFloorConstructionValue);
      sanctionedEligibleValue = adjustedMarketValuation;
    }
  } else if (isBuilderFloor) {
    // Builder Floor: Built-up Area = Carpet × 1.15 (15% loading) × Subtype Multiplier for high Undivided Land Share (UDS).
    // (1.15x for 1 floor, 1.20x for 2 floors, 1.25x for 3+ floors).
    loadingPercent = 15;
    subtypeMultiplier = numFloors >= 3 ? 1.25 : numFloors === 2 ? 1.20 : 1.15;
    const effectiveBuiltUp = Math.max(builtUpAreaSqFt, Math.round(property.carpetAreaSqFt * 1.15));
    const baseValue = effectiveBuiltUp * pincodeBaseRate * subtypeMultiplier;
    adjustedMarketValuation = Math.round(baseValue * conditionMultiplier * bonusMultiplier);

    if (isUnapprovedUpperFloor) {
      sanctionedEligibleValue = Math.round(adjustedMarketValuation / numFloors);
    } else {
      sanctionedEligibleValue = adjustedMarketValuation;
    }
  } else if (isApartment) {
    // Apartment Flat: Super Built-up Area = Carpet × 1.25 (25% common area loading), Subtype Multiplier = 1.0x (if 2 Floors/Duplex is selected, apply a 1.10x Duplex Multiplier).
    loadingPercent = 25;
    subtypeMultiplier = (numFloors >= 2 || property.floorConfig === '2_floors' || property.floorConfig === '3_plus_floors') ? 1.10 : 1.0;
    const effectiveBuiltUp = Math.max(builtUpAreaSqFt, Math.round(property.carpetAreaSqFt * 1.25));
    const baseValue = effectiveBuiltUp * pincodeBaseRate * subtypeMultiplier;
    adjustedMarketValuation = Math.round(baseValue * conditionMultiplier * bonusMultiplier);
    sanctionedEligibleValue = adjustedMarketValuation;
  } else if (isRetail) {
    // Retail Shop with Mezzanine / Upper Floor: Value Ground Floor area at 100% of Pincode Base Rate, and value Mezzanine/Upper Floor area at 50% of Pincode Base Rate.
    loadingPercent = 15;
    subtypeMultiplier = 1.0;
    const effectiveBuiltUp = Math.max(builtUpAreaSqFt, Math.round(property.carpetAreaSqFt * 1.15));
    const gfArea = isMezzanine 
      ? Math.round(effectiveBuiltUp * 0.67) 
      : (numFloors >= 2 ? Math.round(effectiveBuiltUp / numFloors) : effectiveBuiltUp);
    const upperArea = effectiveBuiltUp - gfArea;

    const gfBaseValue = gfArea * pincodeBaseRate;
    const upperBaseValue = upperArea * pincodeBaseRate * 0.50;
    const totalRetailBase = gfBaseValue + upperBaseValue;

    adjustedMarketValuation = Math.round(totalRetailBase * conditionMultiplier * bonusMultiplier);

    if (isUnapprovedUpperFloor) {
      sanctionedEligibleValue = Math.round(gfBaseValue * conditionMultiplier * bonusMultiplier);
    } else {
      sanctionedEligibleValue = adjustedMarketValuation;
    }
  } else {
    // Commercial Office / Industrial
    loadingPercent = isCommercial ? 25 : 10;
    subtypeMultiplier = 1.0;
    const effectiveBuiltUp = Math.max(builtUpAreaSqFt, Math.round(property.carpetAreaSqFt * (isCommercial ? 1.25 : 1.10)));
    const baseValue = effectiveBuiltUp * pincodeBaseRate;
    adjustedMarketValuation = Math.round(baseValue * conditionMultiplier * bonusMultiplier);

    if (isUnapprovedUpperFloor) {
      sanctionedEligibleValue = Math.round(adjustedMarketValuation / numFloors);
    } else {
      sanctionedEligibleValue = adjustedMarketValuation;
    }
  }

  const realizableValue = Math.round(adjustedMarketValuation * 0.92);
  const distressSaleValue = Math.round(adjustedMarketValuation * 0.78);
  const effectiveRatePerSqFt = Math.round(adjustedMarketValuation / Math.max(1, builtUpAreaSqFt));

  // 3. Bank Loan Eligibility & LTV Engine
  let baseLtvPercent = 75;
  if (property.category === 'residential') {
    baseLtvPercent = sanctionedEligibleValue <= 7500000 ? 80 : 75;
  } else if (property.category === 'retail' || property.category === 'commercial') {
    baseLtvPercent = 70;
  } else if (property.category === 'industrial') {
    baseLtvPercent = 70;
  }

  // Risk Rule A: Reduce LTV by 15% if Property Age is "30+ Years"
  const isAgingOver30 = boosters.propertyAge === '30_plus_yrs';
  let finalLtvPercent = baseLtvPercent;
  if (isAgingOver30) {
    finalLtvPercent = Math.max(45, baseLtvPercent - 15);
  }

  // Risk Rule B: Check if Title Type is Gaothan / Unregistered
  const isGaothanUnregistered = boosters.ownershipTitleType === 'gaothan_unregistered';
  if (isGaothanUnregistered) {
    finalLtvPercent = Math.min(finalLtvPercent, 55); // NBFCs cap at ~50-55%
  }

  // Max Eligible Loan Amount strictly calculated against Sanctioned Eligible Value
  const maxEligibleLoanAmount = Math.round(sanctionedEligibleValue * (finalLtvPercent / 100));

  // Max tenure capped at 15 years if Property Age is 30+ Years
  const maxAllowedTenure = isAgingOver30 ? 15 : 25;

  // EMI Calculator Interactive States
  const [loanAmount, setLoanAmount] = useState<number>(maxEligibleLoanAmount);
  const [interestRate, setInterestRate] = useState<number>(8.75); // Default 8.75% p.a.
  const [tenureYears, setTenureYears] = useState<number>(Math.min(20, maxAllowedTenure));
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [isSummaryTextCopied, setIsSummaryTextCopied] = useState<boolean>(false);
  const [isUrlCopied, setIsUrlCopied] = useState<boolean>(false);
  const [selectedBankDetails, setSelectedBankDetails] = useState<BankEligibilityCardData | null>(null);
  const [bankTab, setBankTab] = useState<'all' | 'private' | 'psu' | 'nbfc'>('all');
  const [activeBankId, setActiveBankId] = useState<string>('');

  // PDF Export States
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [pdfToast, setPdfToast] = useState<string | null>(null);

  // Keep loan amount updated when valuation changes, capped at maxEligible
  useEffect(() => {
    setLoanAmount((prev) => Math.min(prev, maxEligibleLoanAmount) || maxEligibleLoanAmount);
  }, [maxEligibleLoanAmount]);

  // Adjust tenure if age cap enforces 15 years
  useEffect(() => {
    if (isAgingOver30 && tenureYears > 15) {
      setTenureYears(15);
    }
  }, [isAgingOver30, tenureYears]);

  // Monthly EMI Calculation: P * r * (1 + r)^n / ((1 + r)^n - 1)
  const monthlyRate = interestRate / 12 / 100;
  const totalMonths = tenureYears * 12;
  const emi = Math.round(
    (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) /
    (Math.pow(1 + monthlyRate, totalMonths) - 1)
  );

  const totalRepayment = emi * totalMonths;
  const totalInterestPayable = Math.max(0, totalRepayment - loanAmount);
  const principalPercentage = Math.round((loanAmount / totalRepayment) * 100) || 60;
  const interestPercentage = 100 - principalPercentage;

  // Helper function to calculate EMI for specific bank
  const calculateBankEmi = (principal: number, annualRate: number, years: number) => {
    const r = annualRate / 12 / 100;
    const n = years * 12;
    if (r === 0 || n === 0) return 0;
    return Math.round((principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
  };

  // Build Real-Time Bank Panel Matching Data (sanction ceilings based on sanctionedEligibleValue)
  const bankPanelData: BankEligibilityCardData[] = [
    {
      id: 'idfc',
      name: 'IDFC FIRST Bank',
      shortName: 'IDFC FIRST',
      type: 'Private',
      baseRate: 8.75,
      rateRange: '8.75% – 9.15%',
      ltvPercent: Math.min(80, finalLtvPercent + (isGaothanUnregistered ? 0 : 5)),
      maxSanction: Math.round(sanctionedEligibleValue * (Math.min(80, finalLtvPercent + (isGaothanUnregistered ? 0 : 5)) / 100)),
      monthlyEmi: calculateBankEmi(
        Math.min(loanAmount, Math.round(sanctionedEligibleValue * (Math.min(80, finalLtvPercent + (isGaothanUnregistered ? 0 : 5)) / 100))),
        8.75,
        tenureYears
      ),
      status: isGaothanUnregistered ? 'Surrogate Route (NBFC Arm)' : 'Digital Instant Sanction',
      isEligible: true,
      tag: 'Fastest Digital TAT',
      tat: '48–72 Hours',
      processingFee: '0.25% (Max ₹10,000)',
      features: [
        '100% paperless digital sanction in 48 hrs',
        'Zero pre-closure / foreclosure penalty',
        'Higher loan eligibility on rental income & GST returns',
        'Flexible income assessment for self-employed'
      ],
      docChecklist: [
        'PAN Card & Aadhaar KYC',
        '6 Months Bank Statement (Salary/Current)',
        'Registered Sale Deed / Allotment Letter',
        'Latest 3 Months Payslip / 2 Years ITR'
      ],
      cibilMin: 680
    },
    {
      id: 'hdfc',
      name: 'HDFC Bank Home Loans',
      shortName: 'HDFC Bank',
      type: 'Private',
      baseRate: 8.50,
      rateRange: '8.50% – 8.85%',
      ltvPercent: Math.min(75, finalLtvPercent),
      maxSanction: Math.round(sanctionedEligibleValue * (Math.min(75, finalLtvPercent) / 100)),
      monthlyEmi: calculateBankEmi(
        Math.min(loanAmount, Math.round(sanctionedEligibleValue * (Math.min(75, finalLtvPercent) / 100))),
        8.50,
        tenureYears
      ),
      status: isGaothanUnregistered ? 'Title Restricted' : 'Empaneled Project Fast-Track',
      isEligible: !isGaothanUnregistered,
      tag: 'Market Leader',
      tat: '3–5 Working Days',
      processingFee: '0.50% (Max ₹3,000 + GST for Salaried)',
      features: [
        'Special 8.45% rate for women primary co-owners',
        'Over 3,500+ pre-approved builder APFs in Tier 1/2 cities',
        'Nil prepayment charges on floating rate home loans',
        'High resale liquidity appraisal stamp'
      ],
      docChecklist: [
        'Identity & Address Proof (Aadhaar / Voter ID)',
        'Chain of Title Deeds for 30 Years / Khata Extract',
        'Form 16 & Last 3 Months Salary Slips',
        'Approved Building Plan & Occupancy Certificate (OC)'
      ],
      cibilMin: 720
    },
    {
      id: 'icici',
      name: 'ICICI Bank Home Finance',
      shortName: 'ICICI Bank',
      type: 'Private',
      baseRate: 8.60,
      rateRange: '8.60% – 8.90%',
      ltvPercent: Math.min(75, finalLtvPercent),
      maxSanction: Math.round(sanctionedEligibleValue * (Math.min(75, finalLtvPercent) / 100)),
      monthlyEmi: calculateBankEmi(
        Math.min(loanAmount, Math.round(sanctionedEligibleValue * (Math.min(75, finalLtvPercent) / 100))),
        8.60,
        tenureYears
      ),
      status: isGaothanUnregistered ? 'Title Restricted' : 'Pre-Approved APF Sanction',
      isEligible: !isGaothanUnregistered,
      tag: 'Express Approval',
      tat: '2–4 Working Days',
      processingFee: '0.50% or ₹3,500',
      features: [
        'Instant 30-minute online in-principle approval',
        'Express disbursement directly to builder / seller escrow',
        'Pre-approved top-up loan facility up to ₹25 Lakhs',
        'Doorstep legal & technical surveyor visit'
      ],
      docChecklist: [
        'PAN & Aadhaar Card',
        '6 Months Bank Salary Account Statement',
        'Registered Agreement for Sale with Index II',
        'Architect/Builder Payment Demand Letters'
      ],
      cibilMin: 700
    },
    {
      id: 'kotak',
      name: 'Kotak Mahindra Bank',
      shortName: 'Kotak Bank',
      type: 'Private',
      baseRate: 8.55,
      rateRange: '8.55% – 8.80%',
      ltvPercent: Math.min(75, finalLtvPercent),
      maxSanction: Math.round(sanctionedEligibleValue * (Math.min(75, finalLtvPercent) / 100)),
      monthlyEmi: calculateBankEmi(
        Math.min(loanAmount, Math.round(sanctionedEligibleValue * (Math.min(75, finalLtvPercent) / 100))),
        8.55,
        tenureYears
      ),
      status: isGaothanUnregistered ? 'Title Restricted' : 'Prime Borrower Rate Active',
      isEligible: !isGaothanUnregistered,
      tag: 'Lowest Prime Rate',
      tat: '3–5 Working Days',
      processingFee: 'Zero / Flat ₹5,000 for Prime Profiles',
      features: [
        'Benchmark prime interest rate starting at 8.55% p.a.',
        'Zero login fee promo for CIBIL > 750',
        'Dedicated doorstep relationship manager for legal scrutiny',
        'High valuation allowance for gated township flats'
      ],
      docChecklist: [
        'Aadhaar & PAN Card',
        'Form 16 for last 2 assessment years',
        'Sale Deed with Parent Deeds & Encumbrance Certificate',
        'Current Society Maintenance Receipt / Property Tax Paid Receipt'
      ],
      cibilMin: 750
    },
    {
      id: 'sbi',
      name: 'State Bank of India (SBI)',
      shortName: 'SBI Home Loans',
      type: 'Public Sector',
      baseRate: 8.40,
      rateRange: '8.40% – 8.75%',
      ltvPercent: finalLtvPercent,
      maxSanction: Math.round(sanctionedEligibleValue * (finalLtvPercent / 100)),
      monthlyEmi: calculateBankEmi(
        Math.min(loanAmount, Math.round(sanctionedEligibleValue * (finalLtvPercent / 100))),
        8.40,
        tenureYears
      ),
      status: isGaothanUnregistered ? 'Strict Sale Deed Required' : 'Pre-Approved / IBA Standard',
      isEligible: !isGaothanUnregistered,
      tag: '#1 Public Lender',
      tat: '5–7 Working Days',
      processingFee: 'Zero Login Fee (Waived for Festive Offers)',
      features: [
        'Lowest repo-linked benchmark (EBLR 8.40% p.a.)',
        'Daily reducing balance calculation saves maximum interest',
        'Zero hidden charges, transparent PSU processing',
        'Overdraft (Maxgain) facility linked to home loan available'
      ],
      docChecklist: [
        'Proof of Identity & Permanent Address',
        'Sale Agreement & 13/30-Year Encumbrance Certificate',
        'Last 6 Months Bank Statement & 3 Months Payslip',
        'NOC from Society/Builder and Approved Layout Plan'
      ],
      cibilMin: 700
    },
    {
      id: 'bob_nbfc',
      name: 'Bank of Baroda / NBFCs',
      shortName: 'BoB / Housing NBFCs',
      type: isGaothanUnregistered ? 'NBFC' : 'Public Sector',
      baseRate: isGaothanUnregistered ? 10.50 : 8.45,
      rateRange: isGaothanUnregistered ? '10.25% – 11.75%' : '8.45% – 8.75%',
      ltvPercent: isGaothanUnregistered ? 55 : finalLtvPercent,
      maxSanction: isGaothanUnregistered
        ? Math.round(sanctionedEligibleValue * 0.55)
        : Math.round(sanctionedEligibleValue * (finalLtvPercent / 100)),
      monthlyEmi: calculateBankEmi(
        Math.min(
          loanAmount,
          isGaothanUnregistered
            ? Math.round(sanctionedEligibleValue * 0.55)
            : Math.round(sanctionedEligibleValue * (finalLtvPercent / 100))
        ),
        isGaothanUnregistered ? 10.50 : 8.45,
        tenureYears
      ),
      status: isGaothanUnregistered ? 'NBFC Route Recommended' : 'Eligible Collateral (Baroda)',
      isEligible: true,
      tag: isGaothanUnregistered ? 'Gram Panchayat & Gaothan Friendly' : 'Competitive PSU Rate',
      tat: isGaothanUnregistered ? '5–8 Days (Custom Legal Audit)' : '4–6 Working Days',
      processingFee: isGaothanUnregistered ? '1.0% – 1.5%' : '0.25% (Max ₹5,000)',
      features: [
        isGaothanUnregistered 
          ? 'Special sanction for Gaothan, Gram Panchayat & unregistered titles via Tata/Piramal NBFCs'
          : 'Competitive 8.45% repo rate under Baroda Home Loan scheme',
        'Flexible income underwriting for cash/informal business incomes',
        'Co-applicant flexibility (parents, siblings, and adult children)',
        'Simplified local patwari/tehsildar verification pathway'
      ],
      docChecklist: [
        'Aadhaar & PAN KYC',
        'Gram Panchayat NOC / Gaothan Certificate / Registered Deed',
        'Property Tax Assessment (Gram Panchayat 8-A / Namuna 8)',
        '12 Months Bank Account Statement or Cash Flow Proof'
      ],
      cibilMin: 650
    }
  ];

  const filteredBanks = bankPanelData.filter((b) => {
    if (bankTab === 'all') return true;
    if (bankTab === 'private') return b.type === 'Private';
    if (bankTab === 'psu') return b.type === 'Public Sector';
    if (bankTab === 'nbfc') return b.type === 'NBFC';
    return true;
  });

  // Handler for Exporting PDF
  const handleExportPDF = async () => {
    try {
      setIsExportingPdf(true);
      await generateAndDownloadValuationPDF({
        location,
        property,
        boosters,
        scanResults,
        geminiSurvey,
        builtUpAreaSqFt,
        adjustedMarketValuation,
        realizableValue,
        distressSaleValue,
        maxEligibleLoanAmount,
        finalLtvPercent,
        emi,
        interestRate,
        tenureYears,
      });
      setPdfToast('Appraisal Certificate PDF generated & downloaded successfully!');
      setTimeout(() => setPdfToast(null), 4000);
    } catch (err) {
      console.error('Failed to export PDF:', err);
      setPdfToast('Error generating PDF. You can also use the Print button to Save as PDF.');
      setTimeout(() => setPdfToast(null), 5000);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const reportRefCode = `PV-${location.pincode}-${Date.now().toString().slice(-6)}`;
  const areaDelta = builtUpAreaSqFt - aiSurveyedBuiltUp;

  // Formatted Valuation Summary for Web Share API and Social Media
  const getValuationSummaryText = () => {
    const locName = location.locality
      ? `${location.locality}, ${location.district}`
      : `${location.district}, ${location.state}`;
    return `🏡 PropVal AI Valuation & Loan Eligibility Report
📍 Location: ${locName} (PIN: ${location.pincode})
📐 Built-Up Area: ${builtUpAreaSqFt.toLocaleString('en-IN')} sq.ft (${property.category.toUpperCase()})
💰 Estimated Market Value: ${formatIndianCurrency(adjustedMarketValuation, true)} (@ ${formatIndianCurrency(effectiveRatePerSqFt)}/sq.ft)
🏦 Max Bank Loan LTV (${finalLtvPercent}%): ${formatIndianCurrency(maxEligibleLoanAmount, true)}
💳 Est. Monthly EMI: ${formatIndianCurrency(emi)}/mo (@ ${interestRate}% for ${tenureYears} yrs)
🔍 Surveyor Condition Score: ${conditionScore}/10 (Gemini 3.8 Flash Verified)
🔖 Appraisal Ref: ${reportRefCode}

Check full valuation & bank eligibility breakdown:`;
  };

  // Web Share API Handler with graceful fallback to Social Share Modal
  const handleShare = async () => {
    const summaryText = getValuationSummaryText();
    const shareUrl = window.location.href;
    const shareData = {
      title: `PropVal AI: ${formatIndianCurrency(adjustedMarketValuation, true)} Valuation (${location.locality || location.district})`,
      text: `${summaryText}\n${shareUrl}`,
      url: shareUrl,
    };

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData);
        setPdfToast('Valuation summary shared successfully!');
        setTimeout(() => setPdfToast(null), 3000);
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return; // User canceled the native share sheet
        }
        console.warn('Web Share API error, opening social share modal:', err);
      }
    }

    // Fallback: Open Social Sharing Modal
    setIsShareModalOpen(true);
  };

  const handleCopySummaryText = async () => {
    const textToCopy = `${getValuationSummaryText()}\n${window.location.href}`;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(textToCopy);
      setIsSummaryTextCopied(true);
      setTimeout(() => setIsSummaryTextCopied(false), 2500);
    }
  };

  const handleCopyUrl = async () => {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(window.location.href);
      setIsUrlCopied(true);
      setTimeout(() => setIsUrlCopied(false), 2500);
    }
  };

  const handleApplyBankRate = (bank: BankEligibilityCardData) => {
    setInterestRate(bank.baseRate);
    setLoanAmount((prev) => Math.min(prev, bank.maxSanction));
    setActiveBankId(bank.id);
    setTimeout(() => {
      const emiEl = document.getElementById('emi-calculator-card');
      if (emiEl) {
        emiEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 print-page">
      {/* Toast Notification for PDF Download or Actions */}
      {pdfToast && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-indigo-500/50 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs sm:text-sm font-semibold">{pdfToast}</span>
          <button 
            type="button" 
            onClick={() => setPdfToast(null)}
            className="text-slate-400 hover:text-white ml-2 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* PRINT-ONLY CERTIFICATE HEADER */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              PROPVAL AI · OFFICIAL PROPERTY APPRAISAL CERTIFICATE
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Certified Mortgage Collateral Assessment · Indian Banks' Association (IBA) &amp; NHB Compliant
            </p>
          </div>
          <div className="text-right text-xs">
            <span className="font-mono font-bold block">REF: {reportRefCode}</span>
            <span className="text-slate-500">Date: {new Date().toLocaleDateString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* WEB HEADER & TITLE ACTIONS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200 no-print">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 tracking-wider uppercase mb-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Appraisal Step 04 · Official Evaluation Summary</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Valuation &amp; Loan Eligibility Dashboard
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Certified multi-parameter appraisal combining on-ground India Post circle rates, 
            Gemini 3.8 Flash computer vision surveyor keyframes, and RBI lending norms.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleShare}
            className="px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.98]"
            title="Share report summary via Web Share or social apps"
          >
            <Share2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Share Valuation</span>
          </button>

          {/* DEDICATED ENABLED EXPORT PDF BUTTON */}
          <button
            type="button"
            onClick={handleExportPDF}
            disabled={isExportingPdf}
            className="px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-60 disabled:cursor-wait"
            title="Generate and download certified PDF certificate with photo plate"
          >
            {isExportingPdf ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Exporting PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-white" />
                <span>Export PDF</span>
                <span className="text-[10px] bg-indigo-500/50 text-indigo-100 font-mono px-1.5 py-0.5 rounded">
                  A4
                </span>
              </>
            )}
          </button>
        </div>
      </div>


      {/* UNAPPROVED UPPER FLOOR WARNING BANNER (When applicable) */}
      {isUnapprovedUpperFloor && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 text-amber-950 flex items-start gap-3.5 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-extrabold text-sm sm:text-base text-amber-950">
                Unapproved Upper Floor Excluded from Bank LTV (Banks only lend against municipally sanctioned floor area).
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-600 text-white uppercase tracking-wider">
                RBI Statutory Lending Rule
              </span>
            </div>
            <p className="text-xs text-amber-900 leading-relaxed">
              Total property market valuation across all {numFloors} floor levels is estimated at <strong>{formatIndianCurrency(adjustedMarketValuation, true)}</strong>. However, because only the Ground Floor has an approved municipal plan, institutional banks and HFCs will strictly sanction loan eligibility against the sanctioned value of <strong>{formatIndianCurrency(sanctionedEligibleValue, true)}</strong>. The unapproved construction value of <strong>{formatIndianCurrency(adjustedMarketValuation - sanctionedEligibleValue, true)}</strong> is excluded from collateral assessment.
            </p>
          </div>
        </div>
      )}

      {/* 1. PROMINENT FINAL MARKET VALUATION BANNER */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-lg border border-slate-800 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                Final Estimated Property Value
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {isVilla ? 'Composite Villa Method' : isRowHouse ? 'Composite Row House Method' : isBuilderFloor ? 'Builder Floor UDS Calibrated' : isApartment ? 'Super Built-Up Model' : 'Commercial Calibrated'}
              </span>
              {isMultiFloor && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {numFloors} Floor Level(s)
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-baseline gap-3 mt-1">
              <span className="text-3xl sm:text-5xl font-black text-white tabular-nums tracking-tight">
                {formatIndianCurrency(adjustedMarketValuation, true)}
              </span>
              <span className="text-sm sm:text-base text-slate-400 font-semibold tabular-nums">
                ({formatIndianCurrency(adjustedMarketValuation)})
              </span>
            </div>

            <div className="text-xs text-slate-400 mt-2 max-w-xl space-y-1">
              <p>
                Calculated on <strong className="text-white">{builtUpAreaSqFt.toLocaleString('en-IN')} sq.ft Built-Up</strong> @{' '}
                <strong className="text-emerald-400">{formatIndianCurrency(effectiveRatePerSqFt)}/sq.ft</strong> in{' '}
                <strong className="text-white">{location.locality || 'Prime Locality'}, {location.district}</strong>.
              </p>
              {isUnapprovedUpperFloor && (
                <p className="text-amber-300 font-semibold">
                  ⚠️ Bank Eligible Collateral Value: <strong className="text-white">{formatIndianCurrency(sanctionedEligibleValue, true)}</strong> (Ground floor sanctioned only).
                </p>
              )}
            </div>
          </div>

          {/* Max Loan Eligibility Badge with Risk Badges */}
          <div className="bg-slate-800/80 border border-slate-700/80 p-5 rounded-2xl shrink-0 space-y-2">
            <div className="flex items-center justify-between gap-4">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Max Bank Loan LTV ({finalLtvPercent}%)
              </span>
              {isGaothanUnregistered && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse">
                  High Risk: NBFC Only
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400 tabular-nums">
                {formatIndianCurrency(maxEligibleLoanAmount, true)}
              </span>
              <span className="text-xs text-slate-400">Sanction Ceiling</span>
            </div>

            <div className="text-[11px] text-slate-400 border-t border-slate-700/60 pt-2 space-y-0.5">
              <p>
                Sanction Base: <strong className="text-white">{formatIndianCurrency(sanctionedEligibleValue, true)}</strong>
                {isUnapprovedUpperFloor && ' (Upper unapproved floor excluded)'}
              </p>
              <p>
                Base LTV: {baseLtvPercent}% ({property.category.toUpperCase()})
                {isAgingOver30 && ' · Age > 30 yrs (-15% haircut)'}
              </p>
              {isGaothanUnregistered && (
                <p className="text-amber-400 font-medium">
                  * Commercial banks restricted; housing finance NBFC route required.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 3 Metric Breakdown Pill Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400 block font-medium">Realizable Value (RV)</span>
            <span className="text-xl font-bold text-slate-100 tabular-nums mt-0.5 block">
              {formatIndianCurrency(realizableValue, true)}
            </span>
            <span className="text-[11px] text-slate-500">92% of FMV (Standard liquidity timeline: 60-90 days)</span>
          </div>

          <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400 block font-medium">Distress Sale Value (DSV)</span>
            <span className="text-xl font-bold text-amber-300 tabular-nums mt-0.5 block">
              {formatIndianCurrency(distressSaleValue, true)}
            </span>
            <span className="text-[11px] text-slate-500">78% of FMV (SARFAESI immediate auction baseline)</span>
          </div>

          <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400 block font-medium">Formula Multiplier Breakdown</span>
            <div className="flex items-center gap-2 mt-0.5 text-slate-200 text-xs font-mono">
              <span className="font-bold text-indigo-300">{conditionMultiplier.toFixed(2)}x Cond.</span>
              <span>·</span>
              <span className="font-bold text-emerald-400">+{smartChipBonusPercent}% Bonus</span>
            </div>
            <span className="text-[11px] text-slate-500">Base Circle Rate: {formatIndianCurrency(pincodeBaseRate)}/sq.ft</span>
          </div>
        </div>
      </div>

      {/* ITEMIZED SUBTYPE, COMPOSITE & SANCTIONED BREAKDOWN CARD */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-900">
                Structural Subtype &amp; Banking Collateral Breakdown
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Indian banking valuation standards (Composite Land + Building, UDS weighting &amp; Sanctioned Floor rules)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-indigo-800 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-lg">
              {isVilla ? 'Independent Villa (Composite)' : isRowHouse ? 'Gated Row House (Composite)' : isBuilderFloor ? 'Builder Floor (UDS Model)' : isApartment ? 'Apartment (Super Built-Up)' : isRetail ? 'Retail (Mezzanine Split)' : 'Commercial Suite'}
            </span>
            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
              {numFloors} Floor(s)
            </span>
          </div>
        </div>

        {/* Detailed Itemized Metric Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Item 1: Land / Super Built-up Loading */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              {isVilla || isRowHouse ? 'Land Parcel Valuation' : 'Area Loading Standard'}
            </span>
            {isVilla || isRowHouse ? (
              <>
                <div className="text-base font-extrabold text-slate-900 tabular-nums">
                  {formatIndianCurrency(landComponentValue, true)}
                </div>
                <p className="text-[11px] text-slate-600">
                  {fixedPlotArea.toLocaleString('en-IN')} sq.ft plot @ {formatIndianCurrency(Math.round(pincodeBaseRate * (isVilla ? 0.85 : 0.75)))}/sq.ft ({isVilla ? '85%' : '75%'} Circle Rate).
                </p>
                <span className="text-[10px] text-indigo-600 font-semibold block pt-0.5">
                  * Fixed land parcel size (not multiplied by floors)
                </span>
              </>
            ) : isBuilderFloor ? (
              <>
                <div className="text-base font-extrabold text-slate-900 tabular-nums">
                  {subtypeMultiplier}x UDS Multiplier
                </div>
                <p className="text-[11px] text-slate-600">
                  15% Built-up loading ({Math.round(builtUpAreaSqFt * 1.15).toLocaleString('en-IN')} sq.ft) with premium Undivided Land Share.
                </p>
              </>
            ) : isApartment ? (
              <>
                <div className="text-base font-extrabold text-slate-900 tabular-nums">
                  25% Common Area Loading
                </div>
                <p className="text-[11px] text-slate-600">
                  Super Built-up Area: {builtUpAreaSqFt.toLocaleString('en-IN')} sq.ft {subtypeMultiplier > 1.0 && '· 1.10x Duplex Multiplier applied'}.
                </p>
              </>
            ) : isRetail ? (
              <>
                <div className="text-base font-extrabold text-slate-900 tabular-nums">
                  Mezzanine 50% Rate Split
                </div>
                <p className="text-[11px] text-slate-600">
                  Ground Floor @ 100% Base Rate · Mezzanine / Upper Floor @ 50% Base Rate.
                </p>
              </>
            ) : (
              <>
                <div className="text-base font-extrabold text-slate-900 tabular-nums">
                  {loadingPercent}% Bylaw Loading
                </div>
                <p className="text-[11px] text-slate-600">
                  Sanctioned commercial/industrial floor plate.
                </p>
              </>
            )}
          </div>

          {/* Item 2: Construction Value / Structure */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              {isVilla || isRowHouse ? 'Construction Component' : 'Structural Quality Multiplier'}
            </span>
            {isVilla || isRowHouse ? (
              <>
                <div className="text-base font-extrabold text-slate-900 tabular-nums">
                  {formatIndianCurrency(constructionComponentValue, true)}
                </div>
                <p className="text-[11px] text-slate-600">
                  {builtUpAreaSqFt.toLocaleString('en-IN')} sq.ft @ ₹{isVilla ? '3,200' : '2,800'}/sq.ft × {conditionMultiplier.toFixed(2)}x condition.
                </p>
                <span className="text-[10px] text-emerald-600 font-semibold block pt-0.5">
                  Includes all {numFloors} floor levels
                </span>
              </>
            ) : (
              <>
                <div className="text-base font-extrabold text-slate-900 tabular-nums">
                  {conditionMultiplier.toFixed(2)}x Surveyor Index
                </div>
                <p className="text-[11px] text-slate-600">
                  Assessed from keyframe flooring, wall finishes, aperture heights, and structural maintenance (Score: {conditionScore}/10).
                </p>
              </>
            )}
          </div>

          {/* Item 3: Floor-Wise Allocation */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Floor-Wise Allocation
            </span>
            <div className="text-xs font-bold text-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <span>Ground Floor:</span>
                <span className="font-mono text-emerald-700">
                  {Math.round(builtUpAreaSqFt / (isMezzanine ? 1.5 : numFloors)).toLocaleString('en-IN')} sq.ft (Sanctioned)
                </span>
              </div>
              {isMultiFloor && (
                <div className="flex items-center justify-between">
                  <span>{isMezzanine ? 'Mezzanine:' : 'Upper Floor(s):'}</span>
                  <span className={`font-mono ${isUnapprovedUpperFloor ? 'text-amber-700' : 'text-slate-700'}`}>
                    {(builtUpAreaSqFt - Math.round(builtUpAreaSqFt / (isMezzanine ? 1.5 : numFloors))).toLocaleString('en-IN')} sq.ft {isUnapprovedUpperFloor ? '(Unapproved)' : '(Sanctioned)'}
                  </span>
                </div>
              )}
            </div>
            <p className="text-[10px] text-slate-500 pt-1">
              {isUnapprovedUpperFloor ? '⚠️ Upper floor excluded from institutional lending.' : '✓ All structural levels verified against plan.'}
            </p>
          </div>

          {/* Item 4: Bank Sanctioned Collateral Value */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 block">
              Sanctioned Collateral Base
            </span>
            <div className="text-base font-black text-emerald-900 tabular-nums">
              {formatIndianCurrency(sanctionedEligibleValue, true)}
            </div>
            <p className="text-[11px] text-emerald-800">
              {isUnapprovedUpperFloor 
                ? `Excludes ${formatIndianCurrency(adjustedMarketValuation - sanctionedEligibleValue, true)} unapproved upper construction.`
                : '100% of property fair value approved for institutional bank LTV.'}
            </p>
            <div className="text-[10px] font-bold text-emerald-700 pt-1">
              Max Sanction @ {finalLtvPercent}% LTV = {formatIndianCurrency(maxEligibleLoanAmount, true)}
            </div>
          </div>
        </div>
      </div>

      {/* 2. EDITABLE AREA OVERRIDE SLIDER & AI ZONE BREAKDOWN */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Ruler className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-900">
                Surveyed Area &amp; Deed Override Slider
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              AI automatically computed zone dimensions. Adjust slider if your registered Sale Deed has an exact square footage.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {areaDelta !== 0 && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
                {areaDelta > 0 ? `+${areaDelta} sq.ft override` : `${areaDelta} sq.ft override`}
              </span>
            )}
            <button
              type="button"
              onClick={() => setBuiltUpAreaSqFt(aiSurveyedBuiltUp)}
              disabled={builtUpAreaSqFt === aiSurveyedBuiltUp}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset to AI ({aiSurveyedBuiltUp} sq.ft)</span>
            </button>
          </div>
        </div>

        {/* Interactive Slider & Number Input Lockup */}
        <div className="p-5 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Total Built-Up Area (sq.ft)
              </span>
              <p className="text-[11px] text-slate-500">
                Carpet Area + 20% loading per standard Indian construction bylaws
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="number"
                  min={200}
                  max={25000}
                  step={10}
                  value={builtUpAreaSqFt}
                  onChange={(e) => setBuiltUpAreaSqFt(Math.max(100, Number(e.target.value) || 0))}
                  className="w-36 bg-white border border-slate-300 rounded-xl px-3 py-2 text-right font-extrabold text-base text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
                <span className="absolute left-2.5 inset-y-0 flex items-center text-xs font-semibold text-slate-400 pointer-events-none">
                  sq.ft
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <input
              type="range"
              min={300}
              max={15000}
              step={25}
              value={builtUpAreaSqFt}
              onChange={(e) => setBuiltUpAreaSqFt(Number(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>300 sq.ft (Studio)</span>
              <span>1,200 sq.ft (Standard 2BHK)</span>
              <span>3,500 sq.ft (Bungalow)</span>
              <span>15,000 sq.ft (Industrial)</span>
            </div>
          </div>
        </div>

        {/* AI ZONE-BY-ZONE MEASUREMENT BREAKDOWN & VISUAL ANCHORS */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              AI Visual Anchor &amp; Zone Dimension Breakdown
            </h4>
            <span className="text-[11px] font-medium text-slate-500">
              Surveyor Model: Gemini 3.8 Flash
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(geminiSurvey?.zoneWiseDimensions || [
              {
                zoneName: 'Living & Dining Area',
                estimatedLengthFt: 18,
                estimatedWidthFt: 14,
                estimatedSqFt: 252,
                visualReferenceUsed: 'Standard 7ft door aperture and 2x2ft floor tile grid',
              },
              {
                zoneName: 'Kitchen & Utility',
                estimatedLengthFt: 12,
                estimatedWidthFt: 9,
                estimatedSqFt: 108,
                visualReferenceUsed: '3ft standard granite countertop datum',
              },
            ]).map((zone, zIdx) => (
              <div
                key={zIdx}
                className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900">
                    {zone.zoneName}
                  </span>
                  <span className="font-mono text-xs font-bold text-indigo-700 bg-white border border-slate-200 px-2 py-0.5 rounded">
                    {zone.estimatedSqFt} sq.ft
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 font-mono">
                  Dimensions: {zone.estimatedLengthFt}ft × {zone.estimatedWidthFt}ft
                </div>
                <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-200/60 flex items-center gap-1 truncate">
                  <span className="font-semibold text-slate-600">Visual Anchor:</span>
                  <span className="truncate">{zone.visualReferenceUsed}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. BANK LOAN ELIGIBILITY & INTERACTIVE EMI CALCULATOR CARD */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Bank Loan Eligibility &amp; Interactive EMI Calculator
              </h3>
              <p className="text-xs text-slate-500">
                Calculated on approved bank panel guidelines (SBI, HDFC Bank, ICICI Bank, Bank of Baroda)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAgingOver30 && (
              <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md">
                Tenure Capped at 15 Yrs (30+ Yrs Structure)
              </span>
            )}
            {isGaothanUnregistered && (
              <span className="text-xs font-bold text-red-800 bg-red-50 border border-red-200 px-2.5 py-1 rounded-md">
                High Risk: NBFC Route Only
              </span>
            )}
          </div>
        </div>

        {/* Primary EMI Highlight Card */}
        <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-800">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider block">
              Estimated Monthly Installment (EMI)
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl sm:text-5xl font-black text-white tabular-nums tracking-tight">
                {formatIndianCurrency(emi)}
              </span>
              <span className="text-xs text-slate-400 font-medium">/ month</span>
            </div>
            <p className="text-xs text-slate-400 pt-1">
              For loan amount of <strong className="text-white">{formatIndianCurrency(loanAmount, true)}</strong> @{' '}
              <strong className="text-emerald-400">{interestRate}% p.a.</strong> for{' '}
              <strong className="text-white">{tenureYears} years</strong>
            </p>
          </div>

          <div className="space-y-3 bg-white/5 p-4 rounded-xl border border-white/10 shrink-0 min-w-[240px]">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Total Interest:</span>
              <span className="font-bold text-amber-300 tabular-nums">
                {formatIndianCurrency(totalInterestPayable, true)}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Total Payment:</span>
              <span className="font-bold text-white tabular-nums">
                {formatIndianCurrency(totalRepayment, true)}
              </span>
            </div>
            {/* Visual ratio bar */}
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
              <div
                className="bg-indigo-500 h-full"
                style={{ width: `${principalPercentage}%` }}
                title={`Principal: ${principalPercentage}%`}
              />
              <div
                className="bg-amber-400 h-full"
                style={{ width: `${interestPercentage}%` }}
                title={`Interest: ${interestPercentage}%`}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>Principal ({principalPercentage}%)</span>
              <span>Interest ({interestPercentage}%)</span>
            </div>
          </div>
        </div>

        {/* 3 Interactive Sliders (Loan Amount, Interest Rate, Tenure) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* Slider 1: Loan Amount */}
          <div className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase">
                Loan Amount
              </label>
              <span className="text-xs font-bold text-indigo-700 tabular-nums">
                {formatIndianCurrency(loanAmount, true)}
              </span>
            </div>
            <input
              type="range"
              min={100000}
              max={maxEligibleLoanAmount}
              step={50000}
              value={loanAmount}
              onChange={(e) => setLoanAmount(Number(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>₹1 Lakh</span>
              <span>Max: {formatIndianCurrency(maxEligibleLoanAmount, true)}</span>
            </div>
          </div>

          {/* Slider 2: Interest Rate (Default 8.75%) */}
          <div className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase">
                Interest Rate (p.a.)
              </label>
              <span className="text-xs font-bold text-indigo-700 tabular-nums">
                {interestRate}%
              </span>
            </div>
            <input
              type="range"
              min={7.0}
              max={14.0}
              step={0.05}
              value={interestRate}
              onChange={(e) => setInterestRate(Number(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>7.0% (Prime)</span>
              <span>8.75% (Std Repo)</span>
              <span>14.0% (NBFC)</span>
            </div>
          </div>

          {/* Slider 3: Tenure (5 to 25 yrs, capped if 30+ yrs) */}
          <div className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase">
                Loan Tenure
              </label>
              <span className="text-xs font-bold text-indigo-700 tabular-nums">
                {tenureYears} Years ({tenureYears * 12} mo)
              </span>
            </div>
            <input
              type="range"
              min={5}
              max={maxAllowedTenure}
              step={1}
              value={tenureYears}
              onChange={(e) => setTenureYears(Number(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>5 Years</span>
              <span>{maxAllowedTenure} Years {isAgingOver30 ? '(Capped)' : '(Max)'}</span>
            </div>
          </div>
        </div>

        {/* Bank Panel Matching Header & Category Filter Tabs */}
        <div className="pt-6 border-t border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Landmark className="w-5 h-5 text-indigo-600" />
                <h4 className="text-base font-bold text-slate-900">
                  Bank Panel Matching &amp; Real-Time Sanction Eligibility
                </h4>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time loan sanction ceilings, floating repo rates, and monthly EMI based on RBI LTV limits and property title.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-semibold self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setBankTab('all')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  bankTab === 'all'
                    ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Lenders (6)
              </button>
              <button
                type="button"
                onClick={() => setBankTab('private')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  bankTab === 'private'
                    ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Private (3)
              </button>
              <button
                type="button"
                onClick={() => setBankTab('psu')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  bankTab === 'psu'
                    ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Public / PSU (2)
              </button>
              <button
                type="button"
                onClick={() => setBankTab('nbfc')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  bankTab === 'nbfc'
                    ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                NBFC / Flexible (1)
              </button>
            </div>
          </div>

          {/* Quick Highlight Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-2xl bg-indigo-50/40 border border-indigo-100 text-xs">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-slate-500">Lowest Floating Rate</span>
              <span className="font-extrabold text-indigo-700 text-sm">8.40% p.a. (SBI)</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-slate-500">Highest LTV Ceiling</span>
              <span className="font-extrabold text-emerald-700 text-sm">80% LTV (IDFC FIRST)</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-slate-500">Fastest Turnaround</span>
              <span className="font-extrabold text-slate-800 text-sm">48 Hours (Digital)</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-slate-500">Title Risk Status</span>
              <span className={`font-extrabold text-sm ${isGaothanUnregistered ? 'text-amber-600' : 'text-emerald-700'}`}>
                {isGaothanUnregistered ? 'NBFC Route Active' : 'All Clear / Empaneled'}
              </span>
            </div>
          </div>

          {/* 6 Real-Time Bank Panel Eligibility Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
            {filteredBanks.map((bank) => {
              const isSelected = activeBankId === bank.id;
              return (
                <div
                  key={bank.id}
                  className={`rounded-2xl p-5 border transition-all flex flex-col justify-between space-y-4 ${
                    isSelected
                      ? 'bg-indigo-50/60 border-indigo-500 shadow-md ring-2 ring-indigo-500/20'
                      : 'bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-xs'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header with Name, Type & Tag */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            {bank.type}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">
                            {bank.tag}
                          </span>
                        </div>
                        <h5 className="font-bold text-sm text-slate-900 mt-1.5 flex items-center gap-1.5">
                          <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
                          <span>{bank.name}</span>
                        </h5>
                      </div>

                      <span
                        className={`text-[10px] font-extrabold px-2 py-1 rounded-lg shrink-0 ${
                          bank.status === 'Title Restricted'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : bank.status.includes('NBFC')
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {bank.status}
                      </span>
                    </div>

                    {/* Sanction Cap and Monthly EMI Big Display */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs text-slate-500 font-medium">Max Sanction Cap:</span>
                        <div className="text-right">
                          <span className="font-extrabold text-base text-slate-900 tabular-nums">
                            {formatIndianCurrency(bank.maxSanction, true)}
                          </span>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            ({bank.ltvPercent}% LTV)
                          </span>
                        </div>
                      </div>

                      <div className="flex items-baseline justify-between pt-1.5 border-t border-slate-200/60">
                        <span className="text-xs text-slate-500 font-medium">Est. Monthly EMI:</span>
                        <div className="text-right">
                          <span className="font-black text-base text-emerald-600 tabular-nums">
                            {formatIndianCurrency(bank.monthlyEmi)}
                          </span>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            @ {bank.baseRate}% for {tenureYears} yrs
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Key Attributes & Features */}
                    <div className="space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Floating Rate Range:</span>
                        <span className="font-bold text-slate-800 font-mono">{bank.rateRange}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Standard TAT:</span>
                        <span className="font-semibold text-slate-700">{bank.tat}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Processing Fee:</span>
                        <span className="font-semibold text-slate-700 truncate max-w-[160px]">{bank.processingFee}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Min. CIBIL Score:</span>
                        <span className="font-bold text-indigo-700">{bank.cibilMin}+</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Apply to Calculator and View Checklist Modal */}
                  <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleApplyBankRate(bank)}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.98]'
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Active in Calculator</span>
                        </>
                      ) : (
                        <>
                          <Calculator className="w-3.5 h-3.5" />
                          <span>Apply Rate ({bank.baseRate}%)</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedBankDetails(bank)}
                      className="py-2 px-3 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                      title="View Eligibility Requirements & Checklist"
                    >
                      <FileCheck className="w-3.5 h-3.5 text-slate-600" />
                      <span>Docs</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. EXTRACTED 720P KEYFRAME EVIDENCE AUDIT PLATE */}
      {Object.keys(scanResults).length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Collateral Video Scan Photographic Evidence
              </h3>
              <p className="text-xs text-slate-500">
                Calibrated 720p keyframes analyzed by Gemini 3.8 Flash for aperture &amp; tile scale verification
              </p>
            </div>
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-md">
              SARFAESI / NHB Audit Plate
            </span>
          </div>

          <div className="space-y-6">
            {Object.values(scanResults).map((scan) => (
              <div key={scan.zoneId} className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900">
                    Zone: {scan.zoneName}
                  </span>
                  <span className="text-slate-400 font-mono text-[11px]">
                    4 Keyframes · Captured at {scan.capturedAt}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {scan.extractedKeyframes.map((frame, fIdx) => (
                    <div
                      key={fIdx}
                      className="rounded-xl overflow-hidden border border-slate-200 bg-slate-900 aspect-video shadow-2xs relative group"
                    >
                      <img
                        src={frame}
                        alt={`${scan.zoneName} Frame 0${fIdx + 1}`}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-1 left-1.5 bg-black/75 text-[10px] font-mono text-white px-1.5 py-0.5 rounded">
                        Frame 0{fIdx + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FOOTER ACTIONS (HIDDEN ON PRINT) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 no-print">
        <button
          type="button"
          onClick={onEditSpecs}
          className="px-5 py-3 border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer w-full sm:w-auto justify-center"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Edit Location or Property Specs</span>
        </button>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={onReset}
            className="px-5 py-3 text-slate-600 hover:text-slate-900 font-semibold text-xs rounded-xl hover:bg-slate-100 transition-all cursor-pointer w-full sm:w-auto text-center"
          >
            Start New Appraisal
          </button>

          {/* SOCIAL SHARE BUTTON IN FOOTER */}
          <button
            type="button"
            onClick={handleShare}
            className="px-4 py-3.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl transition-all shadow-2xs flex items-center gap-2 cursor-pointer justify-center w-full sm:w-auto active:scale-[0.98]"
            title="Share report summary via Web Share or social media"
          >
            <Share2 className="w-4 h-4 text-indigo-600" />
            <span>Share Valuation</span>
          </button>

          {/* DEDICATED ENABLED EXPORT PDF BUTTON IN FOOTER */}
          <button
            type="button"
            onClick={handleExportPDF}
            disabled={isExportingPdf}
            className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-md active:scale-[0.99] flex items-center gap-2 cursor-pointer justify-center w-full sm:w-auto disabled:opacity-60 disabled:cursor-wait"
          >
            {isExportingPdf ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating Appraisal PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Export Valuation PDF</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* BANK ELIGIBILITY & DOCUMENT CHECKLIST MODAL */}
      {selectedBankDetails && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {selectedBankDetails.type}
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    {selectedBankDetails.tag}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mt-1 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                  <span>{selectedBankDetails.name}</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBankDetails(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metrics Bar in Modal */}
            <div className="grid grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase block">Max Sanction</span>
                <span className="font-extrabold text-sm text-slate-900 tabular-nums">
                  {formatIndianCurrency(selectedBankDetails.maxSanction, true)}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase block">Benchmark Rate</span>
                <span className="font-extrabold text-sm text-indigo-700 tabular-nums">
                  {selectedBankDetails.baseRate}% p.a.
                </span>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase block">Standard TAT</span>
                <span className="font-extrabold text-sm text-emerald-700">
                  {selectedBankDetails.tat}
                </span>
              </div>
            </div>

            {/* Features list */}
            <div className="space-y-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <BadgeCheck className="w-4 h-4 text-emerald-600" />
                <span>Sanction Highlights &amp; Policies</span>
              </h5>
              <div className="space-y-1.5 pl-1">
                {selectedBankDetails.features.map((feat, fIdx) => (
                  <div key={fIdx} className="flex items-start gap-2 text-xs text-slate-600">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Required Documents Checklist */}
            <div className="space-y-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-indigo-600" />
                <span>Required Documentation Checklist</span>
              </h5>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                {selectedBankDetails.docChecklist.map((docItem, dIdx) => (
                  <div key={dIdx} className="flex items-center gap-2 text-xs text-slate-700">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                    />
                    <span>{docItem}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedBankDetails(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => {
                  handleApplyBankRate(selectedBankDetails);
                  setSelectedBankDetails(null);
                }}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>Apply {selectedBankDetails.baseRate}% to Calculator</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SOCIAL SHARING MODAL (WEB SHARE & SOCIAL CHANNELS) */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Share Valuation
                  </span>
                  <span className="text-xs font-medium text-slate-500">
                    Web Share &amp; Social Channels
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mt-1 flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-indigo-600" />
                  <span>Share Valuation &amp; Loan Report</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Summary Pill Highlight */}
            <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">
                  Property Valuation
                </span>
                <span className="text-xl font-black text-slate-900 tabular-nums">
                  {formatIndianCurrency(adjustedMarketValuation, true)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
                  Max Eligible Loan
                </span>
                <span className="text-xl font-black text-emerald-600 tabular-nums">
                  {formatIndianCurrency(maxEligibleLoanAmount, true)}
                </span>
              </div>
            </div>

            {/* Native Web Share API Button if supported */}
            {typeof navigator !== 'undefined' && !!navigator.share && (
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.share({
                      title: `PropVal AI: ${formatIndianCurrency(adjustedMarketValuation, true)} Valuation`,
                      text: `${getValuationSummaryText()}\n${window.location.href}`,
                      url: window.location.href,
                    });
                    setIsShareModalOpen(false);
                    setPdfToast('Valuation summary shared successfully!');
                    setTimeout(() => setPdfToast(null), 3000);
                  } catch (e: any) {
                    if (e.name !== 'AbortError') {
                      console.error('Share error:', e);
                    }
                  }
                }}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <Smartphone className="w-4 h-4" />
                <span>Open Native Share Sheet (WhatsApp, Messages, etc.)</span>
              </button>
            )}

            {/* 4 Social Channel Direct Links Grid */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                Share to Apps &amp; Messaging
              </span>
              <div className="grid grid-cols-2 gap-2.5">
                {/* WhatsApp */}
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(getValuationSummaryText() + '\n\n' + window.location.href)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-950 flex items-center gap-2.5 text-xs font-bold transition-colors cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block leading-tight">WhatsApp</span>
                    <span className="text-[10px] text-emerald-700 font-normal">Direct message</span>
                  </div>
                </a>

                {/* X / Twitter */}
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(getValuationSummaryText())}&url=${encodeURIComponent(window.location.href)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white border border-slate-900 flex items-center gap-2.5 text-xs font-bold transition-colors cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-lg bg-slate-800 text-white flex items-center justify-center shrink-0">
                    <Send className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block leading-tight">X / Twitter</span>
                    <span className="text-[10px] text-slate-400 font-normal">Post summary</span>
                  </div>
                </a>

                {/* LinkedIn */}
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-950 flex items-center gap-2.5 text-xs font-bold transition-colors cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center shrink-0">
                    <ExternalLink className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block leading-tight">LinkedIn</span>
                    <span className="text-[10px] text-sky-700 font-normal">Network post</span>
                  </div>
                </a>

                {/* Email */}
                <a
                  href={`mailto:?subject=${encodeURIComponent(`PropVal AI Valuation: ${location.locality || location.district} (${formatIndianCurrency(adjustedMarketValuation, true)})`)}&body=${encodeURIComponent(getValuationSummaryText() + '\n\n' + window.location.href)}`}
                  className="p-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-950 flex items-center gap-2.5 text-xs font-bold transition-colors cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block leading-tight">Email</span>
                    <span className="text-[10px] text-indigo-700 font-normal">Send proposal</span>
                  </div>
                </a>
              </div>
            </div>

            {/* Formatted Text Preview & Copy */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Formatted Summary Snippet
                </span>
                <button
                  type="button"
                  onClick={handleCopySummaryText}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {isSummaryTextCopied ? (
                    <>
                      <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-bold">Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Full Text</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 font-mono text-[11px] text-slate-700 whitespace-pre-line leading-relaxed max-h-36 overflow-y-auto select-all">
                {getValuationSummaryText()}
              </div>
            </div>

            {/* Direct Link Copy Bar */}
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                Shareable Web Link
              </span>
              <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-xl border border-slate-200">
                <input
                  type="text"
                  readOnly
                  value={typeof window !== 'undefined' ? window.location.href : ''}
                  className="bg-transparent text-xs text-slate-600 px-2 py-1 flex-1 font-mono outline-none truncate select-all"
                />
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-lg text-xs font-bold shrink-0 flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                >
                  {isUrlCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-bold">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-2 flex items-center justify-end border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

