'use client';

import React from 'react';
import { V2LoanInputState, LoanPreset } from '../hooks/useLoanCalculator';
import { InterestMethod } from '../engine/types';
import {
  PRINCIPAL_MAX_PAISE,
  TENURE_MAX_MONTHS,
  TENURE_MIN_MONTHS,
} from '../engine/validation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { IndianRupee, Percent, Calendar, Sparkles, Scale } from 'lucide-react';

/**
 * Maps a form field to the key the engine writes its error under.
 *
 * This mapping is the reason the interest-rate error was invisible: the engine
 * writes `errors.interestRate` (features/loan/engine/validation.ts) while this
 * form used to read `validationErrors['annualInterestRate']`, which is never
 * set. Exported so a unit test can assert every key here really is a key the
 * engine produces — see tests/unit/loan/loan-form-errors.test.ts.
 */
export const LOAN_FORM_ERROR_KEYS = {
  principal: 'principal',
  interestRate: 'interestRate',
  tenureMonths: 'tenureMonths',
} as const satisfies Record<string, string>;

export interface LoanFormProps {
  inputState: V2LoanInputState;
  validationErrors: Record<string, string>;
  onChange: <K extends keyof V2LoanInputState>(field: K, value: V2LoanInputState[K]) => void;
  onApplyPreset: (presetId: string) => void;
  onReset: () => void;
  presets: LoanPreset[];
}

const METHOD_OPTIONS: Array<{
  value: InterestMethod;
  labelEn: string;
  labelKn: string;
  helpEn: string;
  helpKn: string;
  badgeEn: string;
  badgeKn: string;
}> = [
  {
    value: 'reducing-balance',
    labelEn: 'Reducing Balance',
    labelKn: 'ಕ್ಷೀಣಿಸುವ ಬ್ಯಾಲೆನ್ಸ್',
    helpEn: 'Interest on remaining balance each month — standard for bank loans',
    helpKn: 'ಪ್ರತಿ ತಿಂಗಳು ಬಾಕಿ ಅಸಲಿನ ಮೇಲೆ ಬಡ್ಡಿ — ಬ್ಯಾಂಕ್ ಸಾಲಗಳಲ್ಲಿ ಸಾಮಾನ್ಯ',
    badgeEn: 'Bank',
    badgeKn: 'ಬ್ಯಾಂಕ್',
  },
  {
    value: 'flat-rate',
    labelEn: 'Flat Rate',
    labelKn: 'ಸ್ಥಿರ ದರ',
    helpEn: 'Interest on original principal — common in MFI / SHG loans',
    helpKn: 'ಮೂಲ ಅಸಲಿನ ಮೇಲೆ ಬಡ್ಡಿ — ಎಂಫಾಐ / ಸ್ವ-ಸಹಾಯ ಗುಂಪು ಸಾಲಗಳಲ್ಲಿ ಸಾಮಾನ್ಯ',
    badgeEn: 'MFI / SHG',
    badgeKn: 'ಎಂಫಾಐ / ಸ್ವ-ಸಹಾಯ',
  },
];

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
    rateHelp: kn ? 'ಉದಾಹರಣೆ: 7% ಅಥವಾ 10.5%' : 'e.g. 7% or 10.5%. 0% is also allowed.',
    tenureLabel: kn ? 'ಸಾಲದ ಅವಧಿ (ತಿಂಗಳುಗಳಲ್ಲಿ):' : 'Loan Tenure (Months):',
    methodLabel: kn ? 'ಬಡ್ಡಿ ಲೆಕ್ಕಾಚಾರ ವಿಧಾನ:' : 'Interest Calculation Method:',
    resetBtn: kn ? 'ಮರುಹೊಂದಿಸಿ' : 'Reset',
    sliderMin: kn ? '1 ತಿಂಗಳು' : '1 month',
    sliderMid: kn ? '15 ವರ್ಷ' : '15 years',
    sliderMax: kn ? '30 ವರ್ಷ' : '30 years',
  };

  const tenureYears = (m: number) => {
    const yrs = (m / 12).toFixed(1).replace(/\.0$/, '');
    return kn ? `(${m} ತಿಂಗಳು = ${yrs} ವರ್ಷಗಳು)` : `(${m} months = ${yrs} years)`;
  };

  return (
    <div className="space-y-6">
      {/* Quick Presets — a labelled group, not a dangling <label> */}
      <div role="group" aria-labelledby="loan-presets-label">
        <p
          id="loan-presets-label"
          className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1"
        >
          <Sparkles className="h-4 w-4 text-amber-600" aria-hidden="true" />
          <span>{labels.presetsTitle}</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onApplyPreset(preset.id)}
              className="px-3 py-1.5 min-h-[40px] text-sm font-semibold bg-gray-100 text-gray-800 rounded-lg hover:bg-green-100 hover:text-green-900 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-700 transition-colors"
            >
              {kn ? preset.nameKn : preset.nameEn}
            </button>
          ))}
        </div>
      </div>

      {/* Interest Method Selector — a real radio group.
          Previously these were plain buttons whose selected state was conveyed
          by colour alone, so screen-reader users had no way to tell which method
          was active. */}
      <div role="radiogroup" aria-labelledby="loan-method-label">
        <p
          id="loan-method-label"
          className="block text-sm font-semibold text-gray-800 mb-2 flex items-center gap-1"
        >
          <Scale className="h-4 w-4 text-green-700" aria-hidden="true" />
          <span>{labels.methodLabel}</span>
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {METHOD_OPTIONS.map((opt) => {
            const selected = inputState.interestMethod === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onChange('interestMethod', opt.value)}
                className={`text-left p-3 rounded-xl border-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2 ${
                  selected
                    ? 'border-green-600 bg-green-50'
                    : 'border-gray-200 bg-white hover:border-green-400'
                }`}
              >
                <div className="flex items-center justify-between mb-0.5 gap-2">
                  <span className="font-bold text-sm text-gray-900">
                    {kn ? opt.labelKn : opt.labelEn}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 ${
                      opt.value === 'flat-rate'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {kn ? opt.badgeKn : opt.badgeEn}
                  </span>
                </div>
                <p className="text-xs text-gray-600 leading-snug">
                  {kn ? opt.helpKn : opt.helpEn}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Form Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Principal Amount */}
        <div>
          <div className="flex items-center gap-1 mb-1">
            <IndianRupee className="h-4 w-4 text-green-700" aria-hidden="true" />
            <label htmlFor="loan-principal" className="text-base font-semibold text-gray-800">
              {labels.principalLabel}
            </label>
          </div>
          <Input
            id="loan-principal"
            type="number"
            inputMode="decimal"
            value={inputState.principal || ''}
            onChange={(e) => onChange('principal', parseFloat(e.target.value) || 0)}
            placeholder="50000"
            error={validationErrors[LOAN_FORM_ERROR_KEYS.principal]}
            helperText={labels.principalHelp}
            min={1}
            max={PRINCIPAL_MAX_PAISE / 100}
          />
        </div>

        {/* Interest Rate */}
        <div>
          <div className="flex items-center gap-1 mb-1">
            <Percent className="h-4 w-4 text-green-700" aria-hidden="true" />
            <label htmlFor="loan-rate" className="text-base font-semibold text-gray-800">
              {labels.rateLabel}
            </label>
          </div>
          <Input
            id="loan-rate"
            type="number"
            inputMode="decimal"
            step="0.01"
            value={inputState.interestRate !== undefined ? inputState.interestRate : ''}
            onChange={(e) => onChange('interestRate', parseFloat(e.target.value) || 0)}
            placeholder="8.5"
            // Was 'annualInterestRate', which the engine never sets — so a
            // negative or excessive rate produced no visible error at all.
            error={validationErrors[LOAN_FORM_ERROR_KEYS.interestRate]}
            helperText={labels.rateHelp}
            min={0}
            max={100}
          />
        </div>

        {/* Loan Tenure */}
        <div className="md:col-span-2">
          <div className="flex items-center gap-1 mb-1">
            <Calendar className="h-4 w-4 text-green-700" aria-hidden="true" />
            <label htmlFor="loan-tenure" className="text-base font-semibold text-gray-800">
              {labels.tenureLabel}
            </label>
          </div>
          <Input
            id="loan-tenure"
            type="number"
            inputMode="numeric"
            value={inputState.tenureMonths || ''}
            onChange={(e) => onChange('tenureMonths', parseInt(e.target.value, 10) || 0)}
            placeholder="12"
            error={validationErrors[LOAN_FORM_ERROR_KEYS.tenureMonths]}
            helperText={inputState.tenureMonths ? tenureYears(inputState.tenureMonths) : ''}
            min={TENURE_MIN_MONTHS}
            max={TENURE_MAX_MONTHS}
          />
          {/* Quick Slider — bounds come from the engine's own limits, so every
              accepted tenure is representable and the thumb can never sit at a
              position that disagrees with the value above. Previously the slider
              was 3–120 while the engine accepted 1–360. */}
          <div className="mt-2">
            <input
              type="range"
              min={TENURE_MIN_MONTHS}
              max={TENURE_MAX_MONTHS}
              step={1}
              value={Math.min(
                Math.max(inputState.tenureMonths || TENURE_MIN_MONTHS, TENURE_MIN_MONTHS),
                TENURE_MAX_MONTHS
              )}
              onChange={(e) => onChange('tenureMonths', parseInt(e.target.value, 10))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-700"
              aria-label={labels.tenureLabel}
              aria-valuetext={kn ? `${inputState.tenureMonths} ತಿಂಗಳು` : `${inputState.tenureMonths} months`}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-0.5 px-0.5">
              <span>{labels.sliderMin}</span>
              <span>{labels.sliderMid}</span>
              <span>{labels.sliderMax}</span>
            </div>
            <p className="sr-only">{tenureYears(inputState.tenureMonths)}</p>
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
