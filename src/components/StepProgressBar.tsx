import React from 'react';
import { Check, MapPin, Video, Sparkles, FileText } from 'lucide-react';

interface StepProgressBarProps {
  currentStep: number;
  onStepClick: (step: number) => void;
  completedSteps: number[];
}

export const StepProgressBar: React.FC<StepProgressBarProps> = ({
  currentStep,
  onStepClick,
  completedSteps,
}) => {
  const steps = [
    {
      id: 1,
      title: 'Location & Property Type',
      subtitle: 'Pincode, locality & base rates',
      icon: MapPin,
    },
    {
      id: 2,
      title: 'Guided Video Scan',
      subtitle: 'Room walk-through & edge AI',
      icon: Video,
    },
    {
      id: 3,
      title: 'Property Boosters & Context',
      subtitle: 'RERA, OC, road width & age',
      icon: Sparkles,
    },
    {
      id: 4,
      title: 'Valuation & Loan Report',
      subtitle: 'Fair market value & bank LTV',
      icon: FileText,
    },
  ];

  const progressPercent = ((currentStep - 1) / (steps.length - 1)) * 100;

  return (
    <div className="w-full bg-white border-b border-slate-200 py-4 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Progress Bar Line */}
        <div className="relative mb-6">
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* 4 Step items */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {steps.map((step) => {
            const isCurrent = currentStep === step.id;
            const isCompleted = completedSteps.includes(step.id);
            const isAccessible = step.id <= currentStep || isCompleted;
            const StepIcon = step.icon;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => isAccessible && onStepClick(step.id)}
                disabled={!isAccessible}
                className={`flex items-start gap-3 p-3 text-left rounded-xl transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-indigo-50/80 border border-indigo-200 ring-1 ring-indigo-500/20 shadow-xs'
                    : isCompleted
                    ? 'hover:bg-slate-50 border border-transparent'
                    : 'opacity-55 cursor-not-allowed border border-transparent'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-sm font-semibold transition-colors ${
                    isCompleted
                      ? 'bg-emerald-600 text-white'
                      : isCurrent
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {isCompleted && !isCurrent ? (
                    <Check className="w-4 h-4 stroke-[3]" />
                  ) : (
                    <StepIcon className="w-4 h-4" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Step {step.id}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-100/70 px-1.5 py-0.2 rounded">
                        Active
                      </span>
                    )}
                  </div>
                  <h4
                    className={`text-xs sm:text-sm font-semibold truncate ${
                      isCurrent ? 'text-indigo-950 font-bold' : 'text-slate-800'
                    }`}
                  >
                    {step.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 hidden sm:block truncate mt-0.5">
                    {step.subtitle}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
