import { LoanInput } from '../types';
import { runLoanPipeline } from '../engine/pipeline';
import { toPaise, toRupees } from '../engine/utils/money';

/**
 * V1 Compatibility Wrapper for calculateEmi.
 * Delegates to the V2 Amortization Engine pipeline.
 */
export function calculateEmi(input: LoanInput): number {
  if (!input || input.principal <= 0 || input.tenureMonths <= 0) {
    return 0;
  }

  try {
    const engineResult = runLoanPipeline({
      principalPaise: toPaise(input.principal),
      annualInterestRate: input.interestRate || 0,
      tenureMonths: input.tenureMonths,
      interestMethod: 'reducing-balance',
      fees: input.processingFee ? [{ id: 'v1_fee', name: 'Processing Fee', type: 'upfront-flat', value: input.processingFee }] : [],
    });

    return toRupees(engineResult.initialMonthlyEmiPaise);
  } catch {
    return 0;
  }
}
