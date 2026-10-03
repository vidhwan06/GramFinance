import { generateAmortizationSchedule } from '../engine/amortization-engine';
import { reducingBalanceStrategy } from '../engine/strategies/reducing-balance';
import { LoanConfig, AmortizationRow } from '../engine/types';
import { toPaise } from '../engine/utils/money';
import { validateExistingLoan } from './schema';
import { ExistingLoanInput, ExistingLoanStatus, RemainingScheduleRow } from './types';

/**
 * Estimates where a running loan stands.
 *
 * ── There is no second amortization loop here ────────────────────────────────
 * The entire balance comes from `generateAmortizationSchedule`, the same
 * function the Calculate-a-Loan mode uses, configured with no fees and no
 * prepayments. Writing a second loop would mean two answers to "what does one
 * month of this loan do", and they would drift the first time either changed.
 *
 * ── Why a reducing-balance model only ────────────────────────────────────────
 * A flat-rate loan does not amortise this way: its interest is charged on the
 * ORIGINAL principal every month, so "what is left" is not recoverable from the
 * rate and tenure alone. Guessing one would produce a confident wrong number.
 * The mode is therefore stated in the copy rather than hidden.
 *
 * ── The user's EMI is a CHECK, not an override ───────────────────────────────
 * The engine derives its own EMI from principal, rate and tenure. If a borrower
 * types an EMI that differs, the honest answer is to say so and keep the
 * canonical schedule, because:
 *   * a lower EMI does not clear the loan inside `tenureMonths`, and the engine
 *     force-closes the final month, which would report a fabricated final
 *     payment;
 *   * accepting the typed figure silently would mean the balance shown is not
 *     derived from the loan terms the user entered.
 * So `emiConsistency` reports `differs` and the difference in rupees, and the UI
 * explains it. Zero EMI input means the estimate uses the standard EMI.
 *
 * ── Precision ───────────────────────────────────────────────────────────────
 * Everything is integer paise end to end. Percentages are rounded to whole
 * numbers so the progress bar and its label can never disagree; money is rounded
 * for DISPLAY only, in `formatPaiseINR`.
 */

/**
 * Two EMIs are "the same" if they differ by at most one rupee.
 *
 * Lenders quote a whole-rupee EMI while the engine computes to the paise, so an
 * exact comparison would report a mismatch on almost every real loan.
 */
const EMI_MATCH_TOLERANCE_PAISE = 100;

function toRemainingRows(rows: AmortizationRow[], emisPaid: number): RemainingScheduleRow[] {
  return rows.slice(emisPaid).map((row, index) => ({
    remainingEmiNumber: index + 1,
    originalMonth: row.month,
    principalPaise: row.principalPaidPaise,
    interestPaise: row.interestPaidPaise,
    closingBalancePaise: row.closingBalancePaise,
  }));
}

export function calculateExistingLoanStatus(input: ExistingLoanInput): ExistingLoanStatus {
  const principalPaise = toPaise(input.principalRupees);
  const tenureMonths = input.tenureMonths;

  // No fees, no prepayments: this estimates a plain fixed-rate loan. A
  // capitalised fee would raise the principal the engine works from, and this
  // mode does not collect fees.
  const config: LoanConfig = {
    principalPaise,
    annualInterestRate: input.annualInterestRate,
    tenureMonths,
    interestMethod: 'reducing-balance',
  };

  const schedule = generateAmortizationSchedule(config);
  const standardEmiPaise = reducingBalanceStrategy.calculateInitialEmiPaise(
    principalPaise,
    input.annualInterestRate,
    tenureMonths
  );

  const providedEmiPaise = input.emiSource === 'provided' && input.emiRupees !== null
    ? toPaise(input.emiRupees)
    : null;

  const emiDifferencePaise = providedEmiPaise === null ? 0 : providedEmiPaise - standardEmiPaise;

  const emiConsistency: ExistingLoanStatus['emiConsistency'] =
    providedEmiPaise === null
      ? 'derived'
      : Math.abs(emiDifferencePaise) <= EMI_MATCH_TOLERANCE_PAISE
        ? 'matches'
        : 'differs';

  // The EMI this status is actually built on.
  //
  // When the typed EMI differs from the standard, the STANDARD wins. The engine
  // derives its own EMI from principal, rate and tenure and ignores anything
  // typed, so the balance below comes from the standard schedule. Displaying the
  // typed figure next to that balance would show a monthly payment that the
  // arithmetic behind it never used — the number and the balance would disagree
  // on screen. The mismatch is reported separately via `emiConsistency` and the
  // UI explains it, so nothing is hidden; the figure just cannot contradict the
  // maths beside it.
  const effectiveEmiPaise =
    emiConsistency === 'differs' ? standardEmiPaise : (providedEmiPaise ?? standardEmiPaise);

  // Clamped defensively. Validation rejects this combination, so the clamp only
  // matters when the calculator is called directly — and it guarantees the
  // outstanding balance can never be read from a row that does not exist.
  const emisPaid = Math.min(Math.max(0, input.emisPaid), tenureMonths);

  const rows = schedule.rows;

  // Balance after `emisPaid` payments is the OPENING balance of the next row.
  // When every row is consumed the loan is closed and the balance is zero.
  const outstandingPrincipalPaise =
    emisPaid >= rows.length ? 0 : Math.max(0, rows[emisPaid].openingBalancePaise);

  const remainingRows = toRemainingRows(rows, emisPaid);
  const paidRows = rows.slice(0, emisPaid);

  const remainingInterestPaise = remainingRows.reduce(
    (sum, row) => sum + row.interestPaise,
    0
  );

  // The displayed total is built from the OUTSTANDING BALANCE the user is
  // shown, so the two lines of the breakdown always add up exactly on screen.
  // Summing the remaining rows' principal instead would be the same figure to
  // within a paisa of rounding, and a one-paisa disagreement between "remaining
  // principal" and "total remaining" would be a real trust problem in a tool
  // whose whole purpose is arithmetic you can check.
  const totalRemainingPaymentsPaise = outstandingPrincipalPaise + remainingInterestPaise;

  const principalPaidToDatePaise = paidRows.reduce((sum, row) => sum + row.principalPaidPaise, 0);
  const interestPaidToDatePaise = paidRows.reduce((sum, row) => sum + row.interestPaidPaise, 0);

  return {
    originalPrincipalPaise: principalPaise,
    annualInterestRate: input.annualInterestRate,
    originalTenureMonths: tenureMonths,
    startDate: input.startDate,

    effectiveEmiPaise,
    standardEmiPaise,
    emiSource: input.emiSource,
    emiConsistency,
    emiDifferencePaise,

    emisPaid,
    emisRemaining: Math.max(0, tenureMonths - emisPaid),
    progressPercent: tenureMonths > 0 ? Math.round((emisPaid / tenureMonths) * 100) : 0,
    isCompleted: outstandingPrincipalPaise === 0,

    outstandingPrincipalPaise,
    remainingInterestPaise,
    totalRemainingPaymentsPaise,
    interestPaidToDatePaise,
    principalPaidToDatePaise,

    remainingSchedule: remainingRows,
    schedule,
  };
}

/**
 * Convenience wrapper: validate, then calculate.
 *
 * Returns `null` when the input does not validate, so a caller cannot
 * accidentally render a status built from rubbish. The UI uses this; the
 * calculator's own tests call `calculateExistingLoanStatus` directly with known-good
 * input to keep the maths tests separate from the validation tests.
 */
export function calculateExistingLoanStatusOrNull(
  input: Partial<ExistingLoanInput>
): ExistingLoanStatus | null {
  if (!validateExistingLoan(input).isValid) return null;
  return calculateExistingLoanStatus(input as ExistingLoanInput);
}