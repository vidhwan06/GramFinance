'use client';

import { useState, useMemo, useCallback } from 'react';
import { LoanConfig } from '../engine/types';
import { LoanComparisonResult, compareLoans } from '../engine/models/comparison-model';
import { toPaise } from '../engine/utils/money';

export function useLoanComparison() {
  const [configA, setConfigA] = useState<LoanConfig>({
    principalPaise: toPaise(100000),
    annualInterestRate: 10,
    tenureMonths: 12,
    interestMethod: 'reducing-balance',
  });

  const [configB, setConfigB] = useState<LoanConfig>({
    principalPaise: toPaise(100000),
    annualInterestRate: 10,
    tenureMonths: 12,
    interestMethod: 'flat-rate',
  });

  const comparisonResult: LoanComparisonResult | null = useMemo(() => {
    try {
      return compareLoans(configA, configB);
    } catch {
      return null;
    }
  }, [configA, configB]);

  const updateConfigA = useCallback((updates: Partial<LoanConfig>) => {
    setConfigA((prev) => ({ ...prev, ...updates }));
  }, []);

  const updateConfigB = useCallback((updates: Partial<LoanConfig>) => {
    setConfigB((prev) => ({ ...prev, ...updates }));
  }, []);

  const copyAToB = useCallback(() => {
    setConfigB({ ...configA });
  }, [configA]);

  return {
    configA,
    configB,
    comparisonResult,
    updateConfigA,
    updateConfigB,
    copyAToB,
  };
}
