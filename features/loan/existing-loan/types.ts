import { AmortizationRow, AmortizationSchedule } from '../engine/types';

/**
 * Types for "Check Existing Loan".
 *
 * ── Money is paise, integers, everywhere ─────────────────────────────────────
 * Same rule as the rest of `features/loan/engine`: rupees exist only at the UI
 * boundary. This file holds paise on purpose so a status figure can never be
 * compared against an engine figure after an implicit float conversion.
 */

/** How the EMI on the loan was arrived at. */
export type EmiSource = 'provided' | 'derived';

/** Public input, in the units a person types. Rupees, percent, months. */
export interface ExistingLoanInput {
  /** Original amount borrowed, in INR rupees. */
  principalRupees: number;
  /** Fixed annual rate in percent, e.g. 10.5. Zero is valid. */
  annualInterestRate: number;
  /** Original tenure in months. */
  tenureMonths: number;
  /** Loan start date as `YYYY-MM-DD`. */
  startDate: string;
  /**
   * The EMI the borrower actually pays, in INR rupees, or `null` when they
   * asked for it to be derived. The number itself is not what the maths runs
   * on — see `ExistingLoanStatus.emiConsistency`.
   */
  emiRupees: number | null;
  emiSource: EmiSource;
  /** How many EMIs have already been paid. */
  emisPaid: number;
}

/** One row of the remaining-payment schedule. */
export interface RemainingScheduleRow {
  /** 1-based index within the REMAINING schedule, not the original loan. */
  remainingEmiNumber: number;
  /** The original-loan month this payment corresponds to. */
  originalMonth: number;
  principalPaise: number;
  interestPaise: number;
  /** Balance still owed after this payment. */
  closingBalancePaise: number;
}

export type EmiConsistency = 'derived' | 'matches' | 'differs';

/**
 * The computed status of a running loan.
 *
 * Every figure here is an ESTIMATE derived from what the user typed. Nothing in
 * this type implies access to a lender's records, and no field is named in a way
 * that suggests an official balance.
 */
export interface ExistingLoanStatus {
  // ── What was entered ──
  originalPrincipalPaise: number;
  annualInterestRate: number;
  originalTenureMonths: number;
  startDate: string;

  // ── EMI ──
  /** The EMI this estimate actually runs on. */
  effectiveEmiPaise: number;
  /** The EMI that principal + rate + tenure imply. Always computed. */
  standardEmiPaise: number;
  emiSource: EmiSource;
  emiConsistency: EmiConsistency;
  /** effectiveEmi - standardEmi. Zero when consistent or derived. */
  emiDifferencePaise: number;

  // ── Progress ──
  emisPaid: number;
  emisRemaining: number;
  /** Whole percent, 0–100. Integer, so the bar and the label never disagree. */
  progressPercent: number;
  isCompleted: boolean;

  // ── Money ──
  /** Estimated balance still owed. Never negative. */
  outstandingPrincipalPaise: number;
  /** Estimated interest still to be paid across the remaining EMIs. */
  remainingInterestPaise: number;
  /** outstandingPrincipal + remainingInterest. */
  totalRemainingPaymentsPaise: number;
  /** Interest already paid, for context in the completed state. */
  interestPaidToDatePaise: number;
  principalPaidToDatePaise: number;

  // ── Detail ──
  /** The remaining schedule, already trimmed to the unpaid EMIs. */
  remainingSchedule: RemainingScheduleRow[];
  /**
   * The full canonical schedule from the shared engine. Exposed so the
   * remaining rows can be proven to be a slice of it rather than a separate
   * calculation.
   */
  schedule: AmortizationSchedule;
}