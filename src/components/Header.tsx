import React from 'react';
import { Building, ShieldCheck, RefreshCw } from 'lucide-react';

interface HeaderProps {
  onReset: () => void;
  currentStep: number;
  onNavigateStep: (step: number) => void;
}

export const Header: React.FC<HeaderProps> = ({ onReset, currentStep, onNavigateStep }) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand title */}
        <div 
          onClick={() => onNavigateStep(1)}
          className="flex items-center gap-3 cursor-pointer group shrink-0"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm group-hover:bg-indigo-700 transition-colors">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-slate-900">
                PropVal<span className="text-indigo-600">AI</span>
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded text-amber-800 bg-amber-50 border border-amber-200">
                IND
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Indian Real Estate Appraisal Engine
            </p>
          </div>
        </div>

        {/* Zone 2: Nav Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <button 
            type="button"
            onClick={() => onNavigateStep(1)}
            className={`transition-colors whitespace-nowrap cursor-pointer hover:text-slate-900 ${
              currentStep === 1 ? 'text-indigo-600 font-semibold' : ''
            }`}
          >
            Location &amp; Rates
          </button>
          <button 
            type="button"
            onClick={() => onNavigateStep(2)}
            className={`transition-colors whitespace-nowrap cursor-pointer hover:text-slate-900 ${
              currentStep === 2 ? 'text-indigo-600 font-semibold' : ''
            }`}
          >
            Guided Video Scan
          </button>
          <button 
            type="button"
            onClick={() => onNavigateStep(3)}
            className={`transition-colors whitespace-nowrap cursor-pointer hover:text-slate-900 ${
              currentStep === 3 ? 'text-indigo-600 font-semibold' : ''
            }`}
          >
            Property Boosters
          </button>
          <button 
            type="button"
            onClick={() => onNavigateStep(4)}
            className={`transition-colors whitespace-nowrap cursor-pointer hover:text-slate-900 ${
              currentStep === 4 ? 'text-indigo-600 font-semibold' : ''
            }`}
          >
            Valuation &amp; Loan Report
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200/80">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>RBI &amp; NHB Compliant Matrix</span>
          </div>

          <button
            type="button"
            onClick={onReset}
            title="Reset appraisal session"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 shadow-xs cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset</span>
          </button>
        </div>
      </div>
    </header>
  );
};
