import { EngineLoanResult } from '../engine/types';

/**
 * One segment of the total-cash-outflow bar.
 */
export interface CostSegment {
  key: 'principal' | 'interest' | 'upfrontFees';
  amountPaise: number;
  /** 0–100. Segments always sum to exactly 100 (modulo rounding). */
  percent: number;
}

export interface CostBreakdown {
  segments: CostSegment[];
  totalPaise: number;
}

/**
 * Partitions `totalCashOutflowPaise` into the three things the borrower
 * actually pays.
 *
 * ── Why this exists ─────────────────────────────────────────────────────────
 * `LoanBreakdown` previously derived `feePct` as a residual
 * (`100 - principalPct - interestPct`) but labelled it with
 * `totalFeesPaise`, which is the sum of ALL four fee types. Those are different
 * quantities:
 *
 *   * `capitalized` fees are folded into `startingPrincipalPaise`, so they are
 *     repaid and already inside the principal segment.
 *   * `deducted-disbursement` fees never appear in cash outflow at all; they
 *     only reduce `netDisbursedAmountPaise`.
 *   * `upfront-flat` and `upfront-percentage` are paid separately and are the
 *     only fees that belong in the outflow bar.
 *
 * So the old legend could print a rupee amount next to a percentage that stood
 * for something else, and the three segments could fail to add up to the
 * "Total Cash Outflow" figure shown directly above them.
 *
 * This partition is exact:
 *   totalCashOutflow = totalRepayment + separatelyPaidFees
 *                   = (totalRepayment - totalInterest) + totalInterest
 *                     + separatelyPaidFees
 */
export function getCostBreakdown(result: EngineLoanResult): CostBreakdown {
  const totalPaise = result.totalCashOutflowPaise;

  const principalPaise = Math.max(0, result.totalRepaymentPaise - result.totalInterestPaise);
  const interestPaise = Math.max(0, result.totalInterestPaise);
  const upfrontFeesPaise = Math.max(0, result.separatelyPaidFeesPaise);

  if (totalPaise <= 0) {
    return { segments: [], totalPaise: 0 };
  }

  const toPercent = (amount: number) => Math.round((amount / totalPaise) * 100);

  const segments: CostSegment[] = [
    { key: 'principal', amountPaise: principalPaise, percent: toPercent(principalPaise) },
    { key: 'interest', amountPaise: interestPaise, percent: toPercent(interestPaise) },
  ];

  if (upfrontFeesPaise > 0) {
    segments.push({
      key: 'upfrontFees',
      amountPaise: upfrontFeesPaise,
      percent: toPercent(upfrontFeesPaise),
    });
  }

  return { segments, totalPaise };
}
