import { LoanInput } from '../types';
import { runLoanPipeline } from '../engine/pipeline';
import { toPaise, toRupees } from '../engine/utils/money';

/**
 * V1 Compatibility Wrapper for calculateInterest.
 * Delegates to the V2 Amortization Engine pipeline.
 */
export function calculateInterest(input: LoanInput): number {
  if (!input || input.principal <= 0 || input.tenureMonths <= 0) {
    return 0;
  }

  try {
    const engineResult = runLoanPipeline({
      principalPaise: toPaise(input.principal),
      annualInterestRate: input.interestRate || 0,
      tenureMonths: input.tenureMonths,
      interestMethod: 'reducing-balance',
    });

    return toRupees(engineResult.totalInterestPaise);
  } catch {
    return 0;
  }
}
