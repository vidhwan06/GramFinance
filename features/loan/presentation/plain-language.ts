import { EngineLoanResult } from '../engine/types';
import { presentationDictionary } from './dictionary';
import { formatPaiseINR } from '../engine/utils/money';

// ── Canonical plain-language summary type (V2) ────────────────────────────────
export interface PlainLanguageSummary {
  monthlyText: string;
  interestText: string;
  totalText: string;
  disbursementText?: string; // Present when net disbursed ≠ base principal
  estimateDisclaimer: string;
}

export function generateBilingualSummary(
  result: EngineLoanResult,
  lang: 'en' | 'kn' = 'en',
): PlainLanguageSummary {
  const dict = presentationDictionary[lang];

  const emiStr = formatPaiseINR(result.initialMonthlyEmiPaise);
  const interestStr = formatPaiseINR(result.totalInterestPaise);
  const totalStr = formatPaiseINR(result.totalCashOutflowPaise);
  const tenure = result.schedule.actualTenureMonths;

  const summary: PlainLanguageSummary = {
    monthlyText: dict.monthlyText(emiStr, tenure),
    interestText: dict.interestText(interestStr, tenure),
    totalText: dict.totalText(totalStr),
    estimateDisclaimer: dict.estimateDisclaimer,
  };

  // Show disbursement note only when fees were deducted at source
  if (result.netDisbursedAmountPaise !== result.basePrincipalPaise) {
    const disbursedStr = formatPaiseINR(result.netDisbursedAmountPaise);
    summary.disbursementText = dict.disbursementText(disbursedStr);
  }

  return summary;
}
