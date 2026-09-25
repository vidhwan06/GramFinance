import { LoanInput, LoanResult } from '../types';
import { runLoanPipeline } from '../engine/pipeline';
import { toPaise, toRupees } from '../engine/utils/money';
import { generateBilingualSummary } from '../presentation/plain-language';

/**
 * V1 Compatibility Wrapper for calculateRepayment.
 * Delegates to the V2 Amortization Engine pipeline.
 */
export function calculateRepayment(input: LoanInput, lang: 'en' | 'kn' = 'en'): LoanResult {
  const engineResult = runLoanPipeline({
    principalPaise: toPaise(input.principal),
    annualInterestRate: input.interestRate || 0,
    tenureMonths: input.tenureMonths,
    interestMethod: 'reducing-balance',
    fees: input.processingFee ? [{ id: 'v1_fee', name: 'Processing Fee', type: 'upfront-flat', value: input.processingFee }] : [],
  });

  const plainLanguageSummary = generateBilingualSummary(engineResult, lang);

  return {
    monthlyEmi: toRupees(engineResult.initialMonthlyEmiPaise),
    totalInterest: toRupees(engineResult.totalInterestPaise),
    totalRepayment: toRupees(engineResult.totalRepaymentPaise),
    processingFee: toRupees(engineResult.totalFeesPaise),
    totalPayableAmount: toRupees(engineResult.totalCashOutflowPaise),
    plainLanguageSummary,
  };
}
