import React from 'react';

import { LoanView } from '@/features/loan/components/LoanView';

/**
 * Loan & EMI page — thin shell around `LoanView`.
 *
 * All layout, copy and behaviour live in features/loan/, so this route stays
 * a pure composition root.
 */
export default function LoanCalculatorPage() {
  return <LoanView />;
}
