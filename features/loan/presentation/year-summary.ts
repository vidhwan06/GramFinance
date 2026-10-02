import { AmortizationSchedule } from '../engine/types';

/**
 * Year-level roll-up of the engine's amortization rows.
 *
 * This file only *aggregates* rows the engine already produced — it never
 * computes interest, EMI or balances itself. Every figure here is a sum of
 * `AmortizationRow` values, so the year ledger and the cost-insight cards can
 * show real numbers without a second implementation of the loan maths.
 */

export interface YearSummary {
  /** 1-based calendar year of the loan. */
  year: number;
  monthFrom: number;
  monthTo: number;
  openingBalancePaise: number;
  closingBalancePaise: number;
  principalPaidPaise: number;
  interestPaidPaise: number;
  prepaymentPaidPaise: number;
  /** Principal + interest + prepayment paid during the year. */
  totalPaidPaise: number;
  /** 0–100 share of the year's payments. Rounding is display-only. */
  principalPercent: number;
  interestPercent: number;
  prepaymentPercent: number;
}

export interface InterestWindow {
  /** Interest paid inside the window. */
  interestPaise: number;
  /** Interest paid over the whole loan. */
  totalInterestPaise: number;
  /** `interestPaise` as a percentage of `totalInterestPaise`, 0–100. */
  percent: number;
}

/** Percentage rounded to a whole number. Returns 0 rather than Infinity/NaN. */
export function percentOf(part: number, whole: number): number {
  if (!Number.isFinite(part) || !Number.isFinite(whole) || whole <= 0) return 0;
  return Math.round((part / whole) * 100);
}

/** Groups the schedule into 12-month blocks (the final block may be shorter). */
export function getYearSummaries(schedule: AmortizationSchedule): YearSummary[] {
  const rows = schedule.rows;
  const years: YearSummary[] = [];

  for (let i = 0; i < rows.length; i += 12) {
    const block = rows.slice(i, i + 12);
    const first = block[0];
    const last = block[block.length - 1];

    let principalPaidPaise = 0;
    let interestPaidPaise = 0;
    let prepaymentPaidPaise = 0;
    for (const row of block) {
      principalPaidPaise += row.principalPaidPaise;
      interestPaidPaise += row.interestPaidPaise;
      prepaymentPaidPaise += row.prepaymentPaidPaise;
    }

    const totalPaidPaise = principalPaidPaise + interestPaidPaise + prepaymentPaidPaise;

    years.push({
      year: years.length + 1,
      monthFrom: first.month,
      monthTo: last.month,
      openingBalancePaise: first.openingBalancePaise,
      closingBalancePaise: last.closingBalancePaise,
      principalPaidPaise,
      interestPaidPaise,
      prepaymentPaidPaise,
      totalPaidPaise,
      principalPercent: percentOf(principalPaidPaise, totalPaidPaise),
      interestPercent: percentOf(interestPaidPaise, totalPaidPaise),
      prepaymentPercent: percentOf(prepaymentPaidPaise, totalPaidPaise),
    });
  }

  return years;
}

/**
 * Interest paid in the first `months` instalments compared with the whole
 * loan — the number behind the "front-loaded interest" insight card.
 *
 * With fewer than `months` instalments the window is the entire loan and the
 * share is 100%, which is stated rather than hidden.
 */
export function getEarlyInterestShare(
  schedule: AmortizationSchedule,
  months = 12
): InterestWindow {
  const window = schedule.rows.slice(0, Math.max(0, months));
  const interestPaise = window.reduce((sum, row) => sum + row.interestPaidPaise, 0);
  const totalInterestPaise = schedule.rows.reduce(
    (sum, row) => sum + row.interestPaidPaise,
    0
  );

  return {
    interestPaise,
    totalInterestPaise,
    percent: percentOf(interestPaise, totalInterestPaise),
  };
}
