'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  LoanConfig,
  EngineLoanResult,
  InterestMethod,
  FeeConfig,
  PrepaymentEvent,
} from '../engine/types';
import { validateLoanConfig } from '../engine/validation';
import { runLoanPipeline } from '../engine/pipeline';
import { toPaise } from '../engine/utils/money';
import { generateBilingualSummary } from '../presentation/plain-language';
import { useLanguage } from '@/features/language/hooks/useLanguage';

// ─── Public input state (UI-facing, in INR rupees) ────────────────────────────
export interface V2LoanInputState {
  principal: number;        // INR rupees
  interestRate: number;     // Annual % (e.g. 8.5)
  tenureMonths: number;     // Months (1..360)
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

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useLoanCalculator() {
  const { language } = useLanguage();

  const [inputState, setInputState] = useState<V2LoanInputState>({
    principal: 50000,
    interestRate: 8.5,
    tenureMonths: 12,
    interestMethod: 'reducing-balance',
    fees: [],
    prepayments: [],
  });

  // Build the engine config (paise-based, pure)
  const engineConfig: LoanConfig = useMemo(() => {
    const prepayEvents: PrepaymentEvent[] = inputState.prepayments
      .filter((p) => p.amount > 0 && p.month >= 1 && p.month <= inputState.tenureMonths)
      .map((p) => ({
        month: p.month,
        amountPaise: toPaise(p.amount),
        timing: 'post-scheduled-payment' as const,
      }));

    return {
      principalPaise: toPaise(inputState.principal),
      annualInterestRate: inputState.interestRate,
      tenureMonths: inputState.tenureMonths,
      interestMethod: inputState.interestMethod,
      fees: inputState.fees,
      prepayments: prepayEvents,
    };
  }, [inputState]);

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
    [],
  );

  const addFee = useCallback((fee: FeeConfig) => {
    setInputState((prev) => ({
      ...prev,
      fees: [...prev.fees.filter((f) => f.id !== fee.id), fee],
    }));
  }, []);

  const removeFee = useCallback((feeId: string) => {
    setInputState((prev) => ({
      ...prev,
      fees: prev.fees.filter((f) => f.id !== feeId),
    }));
  }, []);

  const setPrepayments = useCallback(
    (prepayments: { month: number; amount: number }[]) => {
      setInputState((prev) => ({ ...prev, prepayments }));
    },
    [],
  );

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
    setInputState({
      principal: 50000,
      interestRate: 8.5,
      tenureMonths: 12,
      interestMethod: 'reducing-balance',
      fees: [],
      prepayments: [],
    });
  }, []);

  return {
    // State
    inputState,
    // Computed
    engineConfig,
    validation,
    engineResult,
    bilingualSummary,
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
