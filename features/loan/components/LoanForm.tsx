'use client';

import React from 'react';
import { V2LoanInputState, LoanPreset } from '../hooks/useLoanCalculator';
import { InterestMethod } from '../engine/types';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { IndianRupee, Percent, Calendar, Sparkles, Scale } from 'lucide-react';

export interface LoanFormProps {
  inputState: V2LoanInputState;
  validationErrors: Record<string, string>;
  onChange: <K extends keyof V2LoanInputState>(field: K, value: V2LoanInputState[K]) => void;
  onApplyPreset: (presetId: string) => void;
  onReset: () => void;
  presets: LoanPreset[];
}

export function LoanForm({
  inputState,
  validationErrors,
  onChange,
  onApplyPreset,
  onReset,
  presets,
}: LoanFormProps) {
  const { language } = useLanguage();
  const kn = language === 'kn';

  const labels = {
    presetsTitle: kn ? 'ತ್ವರಿತ ಆಯ್ಕೆಗಳು (ಸಾಮಾನ್ಯ ಸಾಲಗಳು):' : 'Quick Presets (Common Rural Loans):',
    principalLabel: kn ? 'ಸಾಲದ ಮೊತ್ತ (ರೂಪಾಯಿಗಳಲ್ಲಿ):' : 'Loan Amount (₹):',
    principalHelp: kn ? 'ಉದಾಹರಣೆ: 50,000 ಅಥವಾ 1,00,000' : 'e.g. 50,000 or 1,00,000',
    rateLabel: kn ? 'ವಾರ್ಷಿಕ ಬಡ್ಡಿ ದರ (%):' : 'Annual Interest Rate (%):',
    rateHelp: kn ? 'ಉದಾಹರಣೆ: 7% ಅಥವಾ 10.5%' : 'e.g. 7% or 10.5%',
    tenureLabel: kn ? 'ಸಾಲದ ಅವಧಿ (ತಿಂಗಳುಗಳಲ್ಲಿ):' : 'Loan Tenure (Months):',
    tenureYears: (m: number) => {
      const yrs = (m / 12).toFixed(1).replace('.0', '');
      return kn ? `(${m} ತಿಂಗಳು = ${yrs} ವರ್ಷಗಳು)` : `(${m} months = ${yrs} years)`;
    },
    methodLabel: kn ? 'ಬಡ್ಡಿ ಲೆಕ್ಕಾಚಾರ ವಿಧಾನ:' : 'Interest Calculation Method:',
    reducingLabel: kn ? 'ಕ್ಷೀಣಿಸುವ ಬ್ಯಾಲೆನ್ಸ್ (Reducing Balance)' : 'Reducing Balance',
    reducingHelp: kn
      ? 'ಪ್ರತಿ ತಿಂಗಳು ಬಾಕಿ ಅಸಲಿನ ಮೇಲೆ ಬಡ್ಡಿ — ಬ್ಯಾಂಕ್ ಸಾಲಗಳಲ್ಲಿ ಸಾಮಾನ್ಯ'
      : 'Interest on remaining balance each month — standard for bank loans',
    flatLabel: kn ? 'ಸ್ಥಿರ ದರ (Flat Rate)' : 'Flat Rate',
    flatHelp: kn
      ? 'ಮೂಲ ಅಸಲಿನ ಮೇಲೆ ಬಡ್ಡಿ — ಮೈಕ್ರೋ-ಫೈನಾನ್ಸ್ / SHG ಸಾಲಗಳಲ್ಲಿ ಸಾಮಾನ್ಯ'
      : 'Interest on original principal — common in MFI / SHG loans',
    resetBtn: kn ? 'ಮರುಹೊಂದಿಸಿ' : 'Reset',
  };

  return (
    <div className="space-y-6">
      {/* Quick Presets */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
          <Sparkles className="h-4 w-4 text-amber-600" />
          <span>{labels.presetsTitle}</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onApplyPreset(preset.id)}
              className="px-3 py-1.5 text-sm font-semibold bg-gray-100 text-gray-800 rounded-lg hover:bg-green-100 hover:text-green-900 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-700 transition-colors"
            >
              {kn ? preset.nameKn : preset.nameEn}
            </button>
          ))}
        </div>
      </div>

      {/* Interest Method Selector */}
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-2 flex items-center gap-1">
          <Scale className="h-4 w-4 text-green-700" />
          <span>{labels.methodLabel}</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(
            [
              {
                value: 'reducing-balance' as InterestMethod,
                label: labels.reducingLabel,
                help: labels.reducingHelp,
                badge: kn ? 'ಬ್ಯಾಂಕ್' : 'Bank',
                badgeColor: 'bg-green-100 text-green-800',
              },
              {
                value: 'flat-rate' as InterestMethod,
                label: labels.flatLabel,
                help: labels.flatHelp,
                badge: 'MFI / SHG',
                badgeColor: 'bg-amber-100 text-amber-800',
              },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange('interestMethod', opt.value)}
              className={`text-left p-3 rounded-xl border-2 transition-all ${
                inputState.interestMethod === opt.value
                  ? 'border-green-600 bg-green-50'
                  : 'border-gray-200 bg-white hover:border-green-400'
              }`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-bold text-sm text-gray-900">{opt.label}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${opt.badgeColor}`}>
                  {opt.badge}
                </span>
              </div>
              <p className="text-xs text-gray-600 leading-snug">{opt.help}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Form Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Principal Amount */}
        <div>
          <div className="flex items-center gap-1 mb-1">
            <IndianRupee className="h-4 w-4 text-green-700" />
            <label htmlFor="loan-principal" className="text-base font-semibold text-gray-800">
              {labels.principalLabel}
            </label>
          </div>
          <Input
            id="loan-principal"
            type="number"
            value={inputState.principal || ''}
            onChange={(e) => onChange('principal', parseFloat(e.target.value) || 0)}
            placeholder="50000"
            error={validationErrors['principal']}
            helperText={labels.principalHelp}
            min={1}
            max={10000000}
          />
        </div>

        {/* Interest Rate */}
        <div>
          <div className="flex items-center gap-1 mb-1">
            <Percent className="h-4 w-4 text-green-700" />
            <label htmlFor="loan-rate" className="text-base font-semibold text-gray-800">
              {labels.rateLabel}
            </label>
          </div>
          <Input
            id="loan-rate"
            type="number"
            step="0.1"
            value={inputState.interestRate !== undefined ? inputState.interestRate : ''}
            onChange={(e) => onChange('interestRate', parseFloat(e.target.value) || 0)}
            placeholder="8.5"
            error={validationErrors['annualInterestRate']}
            helperText={labels.rateHelp}
            min={0}
            max={100}
          />
        </div>

        {/* Loan Tenure */}
        <div className="md:col-span-2">
          <div className="flex items-center gap-1 mb-1">
            <Calendar className="h-4 w-4 text-green-700" />
            <label htmlFor="loan-tenure" className="text-base font-semibold text-gray-800">
              {labels.tenureLabel}
            </label>
          </div>
          <Input
            id="loan-tenure"
            type="number"
            value={inputState.tenureMonths || ''}
            onChange={(e) => onChange('tenureMonths', parseInt(e.target.value, 10) || 0)}
            placeholder="12"
            error={validationErrors['tenureMonths']}
            helperText={inputState.tenureMonths ? labels.tenureYears(inputState.tenureMonths) : ''}
            min={1}
            max={360}
          />
          {/* Quick Slider */}
          <div className="mt-2">
            <input
              type="range"
              min="3"
              max="120"
              step="3"
              value={inputState.tenureMonths || 12}
              onChange={(e) => onChange('tenureMonths', parseInt(e.target.value, 10))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-700"
              aria-label="Tenure slider"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-0.5 px-0.5">
              <span>3m</span>
              <span>1yr</span>
              <span>3yr</span>
              <span>5yr</span>
              <span>10yr</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button variant="ghost" size="sm" onClick={onReset}>
          {labels.resetBtn}
        </Button>
      </div>
    </div>
  );
}
