'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  LoanConfig,
  EngineLoanResult,
  InterestMethod,
  FeeConfig,
} from '../engine/types';
import {
  validateLoanConfig,
  validatePrepaymentEvents,
  PrepaymentErrorCode,
  PrepaymentValidationResult,
} from '../engine/validation';
import { runLoanPipeline } from '../engine/pipeline';
import { toPaise } from '../engine/utils/money';
import { generateBilingualSummary } from '../presentation/plain-language';
import { useLanguage } from '@/features/language/hooks/useLanguage';

// Re-exported so callers do not need to reach into the engine module.
export type { PrepaymentErrorCode, PrepaymentValidationResult } from '../engine/validation';

// ─── Public input state (UI-facing, in INR rupees) ────────────────────────────
export interface V2LoanInputState {
  principal: number;        // INR rupees
  interestRate: number;     // Annual % (e.g. 8.5)
  tenureMonths: number;     // Months
  interestMethod: InterestMethod;
  fees: FeeConfig[];
  prepayments: { month: number; amount: number }[]; // INR rupees
}

// ─── Preset definition ────────────────────────────────────────────────────────
export interface LoanPreset {
  id: string;
  nameEn: string;
  nameKn: string;
  principal: number;
  interestRate: number;
  tenureMonths: number;
  interestMethod: InterestMethod;
}

const LOAN_PRESETS: LoanPreset[] = [
  {
    id: 'kcc',
    nameEn: 'Kisan Credit Card',
    nameKn: 'ಕಿಸಾನ್ ಕ್ರೆಡಿಟ್ ಕಾರ್ಡ್',
    principal: 50000,
    interestRate: 7,
    tenureMonths: 12,
    interestMethod: 'reducing-balance',
  },
  {
    id: 'mudra',
    nameEn: 'MUDRA Shishu Loan',
    nameKn: 'ಮುದ್ರಾ ಶಿಶು ಸಾಲ',
    principal: 50000,
    interestRate: 8.5,
    tenureMonths: 36,
    interestMethod: 'reducing-balance',
  },
  {
    id: 'shg',
    nameEn: 'SHG / MFI Loan',
    nameKn: 'ಸ್ವ-ಸಹಾಯ ಗುಂಪು ಸಾಲ',
    principal: 30000,
    interestRate: 22,
    tenureMonths: 24,
    interestMethod: 'flat-rate',
  },
  {
    id: 'home',
    nameEn: 'Rural Home Loan',
    nameKn: 'ಗ್ರಾಮೀಣ ಗೃಹ ಸಾಲ',
    principal: 500000,
    interestRate: 9,
    tenureMonths: 120,
    interestMethod: 'reducing-balance',
  },
];

const DEFAULT_INPUT: V2LoanInputState = {
  principal: 50000,
  interestRate: 8.5,
  tenureMonths: 12,
  interestMethod: 'reducing-balance',
  fees: [],
  prepayments: [],
};

/** Bilingual copy for each reason the engine rejected a prepayment. */
const PREPAYMENT_ERROR_COPY: Record<PrepaymentErrorCode, { en: string; kn: string }> = {
  MONTH_NOT_INTEGER: {
    en: 'Enter the month as a whole number of 1 or more.',
    kn: 'ತಿಂಗಳನ್ನು 1 ಅಥವಾ ಅದಕ್ಕಿಂತ ದೊಡ್ಡ ಪೂರ್ಣ ಸಂಖ್ಯೆಯಾಗಿ ನಮೂದಿಸಿ.',
  },
  MONTH_OUT_OF_RANGE: {
    en: 'This month is after the loan ends. Choose a month within the loan tenure.',
    kn: 'ಈ ತಿಂಗಳು ಸಾಲ ಮುಗಿದ ನಂತರದ್ದು. ಸಾಲದ ಅವಧಿಯೊಳಗಿನ ತಿಂಗಳನ್ನು ಆರಿಸಿ.',
  },
  AMOUNT_NOT_POSITIVE: {
    en: 'Enter a prepayment amount greater than zero.',
    kn: 'ಸದ್ದ ಮೊತ್ತಕ್ಕಿಂತ ದೊಡ್ಡ ಮುಂಗಡ ಪಾವತಿ ಮೊತ್ತನ್ನು ನಮೂದಿಸಿ.',
  },
  DUPLICATE_MONTH: {
    en: 'That month already has a prepayment. Only one is applied per month.',
    kn: 'ಆ ತಿಂಗಳಿಗೆ ಈಗಾಗಲೇ ಮುಂಗಡ ಪಾವತಿ ಇದೆ. ಪ್ರತಿ ತಿಂಗಳಿಗೆ ಒಂದೇ ಮುಂಗಡ ಪಾವತಿ ಅನ್ವಯವಾಗುತ್ತದೆ.',
  },
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useLoanCalculator() {
  const { language } = useLanguage();

  const [inputState, setInputState] = useState<V2LoanInputState>(DEFAULT_INPUT);

  // Prepayments are validated rather than filtered. The previous implementation
  // silently dropped any event whose month exceeded the tenure and still
  // rendered the prepayment panel, so the user saw "Interest Saved: ₹0" for a
  // prepayment that had never been applied.
  const prepaymentValidation: PrepaymentValidationResult = useMemo(
    () => validatePrepaymentEvents(inputState.prepayments, inputState.tenureMonths),
    [inputState.prepayments, inputState.tenureMonths]
  );

  const prepaymentError: string | null = useMemo(() => {
    const firstCode = Object.values(prepaymentValidation.codes)[0];
    if (!firstCode) return null;
    return PREPAYMENT_ERROR_COPY[firstCode][language];
  }, [prepaymentValidation.codes, language]);

  // Build the engine config (paise-based, pure)
  const engineConfig: LoanConfig = useMemo(
    () => ({
      principalPaise: toPaise(inputState.principal),
      annualInterestRate: inputState.interestRate,
      tenureMonths: inputState.tenureMonths,
      interestMethod: inputState.interestMethod,
      fees: inputState.fees,
      prepayments: prepaymentValidation.validEvents,
    }),
    [inputState, prepaymentValidation.validEvents]
  );

  // Validation
  const validation = useMemo(() => validateLoanConfig(engineConfig), [engineConfig]);

  // Run the full engine pipeline (returns null if invalid)
  const engineResult: EngineLoanResult | null = useMemo(() => {
    if (!validation.isValid) return null;
    try {
      return runLoanPipeline(engineConfig);
    } catch {
      return null;
    }
  }, [engineConfig, validation.isValid]);

  // Bilingual plain-language summary
  const bilingualSummary = useMemo(() => {
    if (!engineResult) return null;
    return generateBilingualSummary(engineResult, language);
  }, [engineResult, language]);

  // ── Mutators ──────────────────────────────────────────────────────────────
  const handleChange = useCallback(
    <K extends keyof V2LoanInputState>(field: K, value: V2LoanInputState[K]) => {
      setInputState((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const addFee = useCallback((fee: FeeConfig) => {
    setInputState((prev) => ({
      ...prev,
      // Upsert by id so editing an existing row replaces it.
      fees: [...prev.fees.filter((f) => f.id !== fee.id), fee],
    }));
  }, []);

  const removeFee = useCallback((feeId: string) => {
    setInputState((prev) => ({
      ...prev,
      fees: prev.fees.filter((f) => f.id !== feeId),
    }));
  }, []);

  const setPrepayments = useCallback((prepayments: { month: number; amount: number }[]) => {
    setInputState((prev) => ({ ...prev, prepayments }));
  }, []);

  const applyPreset = useCallback((presetId: string) => {
    const preset = LOAN_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setInputState({
      principal: preset.principal,
      interestRate: preset.interestRate,
      tenureMonths: preset.tenureMonths,
      interestMethod: preset.interestMethod,
      fees: [],
      prepayments: [],
    });
  }, []);

  const resetForm = useCallback(() => {
    setInputState(DEFAULT_INPUT);
  }, []);

  return {
    // State
    inputState,
    // Computed
    engineConfig,
    validation,
    engineResult,
    bilingualSummary,
    prepaymentValidation,
    /** Bilingual message for the first invalid prepayment, or null. */
    prepaymentError,
    // Presets
    presets: LOAN_PRESETS,
    // Actions
    handleChange,
    addFee,
    removeFee,
    setPrepayments,
    applyPreset,
    resetForm,
  };
}
