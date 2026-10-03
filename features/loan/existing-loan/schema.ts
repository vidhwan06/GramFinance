import { ExistingLoanInput } from './types';
import {
  INTEREST_RATE_MAX_PERCENT,
  PRINCIPAL_MAX_PAISE,
  TENURE_MAX_MONTHS,
  TENURE_MIN_MONTHS,
} from '../engine/validation';
import { toPaise } from '../engine/utils/money';

/**
 * Validation for "Check Existing Loan".
 *
 * ── Locale-free by design ───────────────────────────────────────────────────
 * This returns CODES, never English sentences. The component resolves them
 * through `existingLoanCopy`, which is what guarantees the Kannada UI can never
 * fall back to an English string. It is the same pattern the engine already
 * uses for prepayment errors (`PrepaymentErrorCode`).
 *
 * ── Limits are imported, not re-declared ────────────────────────────────────
 * `PRINCIPAL_MAX_PAISE` and friends come from `engine/validation.ts` so this
 * form cannot accept a loan the calculator would reject. Re-declaring them was
 * how the existing tenure slider drifted from the engine's real bounds.
 */

export type ExistingLoanErrorCode =
  | 'PRINCIPAL_REQUIRED'
  | 'PRINCIPAL_NOT_POSITIVE'
  | 'PRINCIPAL_TOO_LARGE'
  | 'RATE_REQUIRED'
  | 'RATE_NEGATIVE'
  | 'RATE_TOO_HIGH'
  | 'TENURE_REQUIRED'
  | 'TENURE_NOT_WHOLE'
  | 'TENURE_OUT_OF_RANGE'
  | 'EMI_REQUIRED'
  | 'EMI_NOT_POSITIVE'
  | 'EMI_TOO_LARGE'
  | 'PAID_REQUIRED'
  | 'PAID_NOT_WHOLE'
  | 'PAID_NEGATIVE'
  | 'PAID_EXCEEDS_TENURE'
  | 'DATE_REQUIRED'
  | 'DATE_INVALID'
  | 'DATE_FUTURE';

export interface ExistingLoanValidation {
  isValid: boolean;
  /** Field key → code. Field keys match `ExistingLoanInput`. */
  errors: Partial<Record<keyof ExistingLoanInput, ExistingLoanErrorCode>>;
  /** The same problems as a flat list, for review by index. */
  issues: Array<{ field: string; code: ExistingLoanErrorCode }>;
}

/** `YYYY-MM-DD`, with the parts captured so they can be verified individually. */
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Narrows an optional numeric field, so cross-field checks can compare two
 * `Partial` values without the compiler losing track of what is defined.
 */
function isWholeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Parses `YYYY-MM-DD`, rejecting dates that do not exist.
 *
 * The component re-check is essential: `new Date('2025-02-31T00:00:00')` does
 * NOT fail — V8 silently rolls it over to 2 March. A regex alone therefore
 * accepts 31 February, and the form would go on to compute a status for a loan
 * that started on a date the calendar does not have. Comparing the parsed year,
 * month and day back against the input catches the rollover.
 */
function parseIsoDate(isoDate: string): Date | null {
  const match = ISO_DATE.exec(isoDate);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(parsed.getTime())) return null;

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }
  return parsed;
}

/**
 * Rejects a start date in the future.
 *
 * A loan that has not started yet cannot have EMIs already paid, so accepting
 * one would produce a nonsense status. Only the calendar date is checked — no
 * time-of-day, because a loan starting later today is legitimate.
 */
function isFutureDate(isoDate: string, today: Date): boolean {
  const parsed = parseIsoDate(isoDate);
  if (!parsed) return false;
  const startOfToday = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return parsed.getTime() > startOfToday;
}

export function validateExistingLoan(
  input: Partial<ExistingLoanInput>,
  today: Date = new Date()
): ExistingLoanValidation {
  const errors: Partial<Record<keyof ExistingLoanInput, ExistingLoanErrorCode>> = {};

  // ── Principal ──
  if (input.principalRupees === undefined || input.principalRupees === null) {
    errors.principalRupees = 'PRINCIPAL_REQUIRED';
  } else if (!isFiniteNumber(input.principalRupees)) {
    errors.principalRupees = 'PRINCIPAL_NOT_POSITIVE';
  } else if (input.principalRupees <= 0) {
    errors.principalRupees = 'PRINCIPAL_NOT_POSITIVE';
  } else if (toPaise(input.principalRupees) > PRINCIPAL_MAX_PAISE) {
    errors.principalRupees = 'PRINCIPAL_TOO_LARGE';
  }

  // ── Interest rate ──
  if (input.annualInterestRate === undefined || input.annualInterestRate === null) {
    errors.annualInterestRate = 'RATE_REQUIRED';
  } else if (!isFiniteNumber(input.annualInterestRate)) {
    errors.annualInterestRate = 'RATE_NEGATIVE';
  } else if (input.annualInterestRate < 0) {
    errors.annualInterestRate = 'RATE_NEGATIVE';
  } else if (input.annualInterestRate > INTEREST_RATE_MAX_PERCENT) {
    errors.annualInterestRate = 'RATE_TOO_HIGH';
  }

  // ── Tenure ──
  if (input.tenureMonths === undefined || input.tenureMonths === null) {
    errors.tenureMonths = 'TENURE_REQUIRED';
  } else if (!isFiniteNumber(input.tenureMonths)) {
    errors.tenureMonths = 'TENURE_OUT_OF_RANGE';
  } else if (!isWholeNumber(input.tenureMonths)) {
    errors.tenureMonths = 'TENURE_NOT_WHOLE';
  } else if (input.tenureMonths < TENURE_MIN_MONTHS || input.tenureMonths > TENURE_MAX_MONTHS) {
    errors.tenureMonths = 'TENURE_OUT_OF_RANGE';
  }

  // ── EMI: required only when the user is supplying one ──
  if (input.emiSource === 'provided') {
    if (input.emiRupees === undefined || input.emiRupees === null) {
      errors.emiRupees = 'EMI_REQUIRED';
    } else if (!isFiniteNumber(input.emiRupees)) {
      errors.emiRupees = 'EMI_NOT_POSITIVE';
    } else if (input.emiRupees <= 0) {
      errors.emiRupees = 'EMI_NOT_POSITIVE';
    } else if (toPaise(input.emiRupees) > PRINCIPAL_MAX_PAISE) {
      errors.emiRupees = 'EMI_TOO_LARGE';
    }
  }

  // ── EMIs already paid ──
  if (input.emisPaid === undefined || input.emisPaid === null) {
    errors.emisPaid = 'PAID_REQUIRED';
  } else if (!isFiniteNumber(input.emisPaid)) {
    errors.emisPaid = 'PAID_NEGATIVE';
  } else if (!isWholeNumber(input.emisPaid)) {
    errors.emisPaid = 'PAID_NOT_WHOLE';
  } else if (input.emisPaid < 0) {
    errors.emisPaid = 'PAID_NEGATIVE';
  } else if (
    isWholeNumber(input.tenureMonths) &&
    isWholeNumber(input.emisPaid) &&
    input.emisPaid > input.tenureMonths
  ) {
    // Cross-field: more EMIs paid than the loan ever had.
    errors.emisPaid = 'PAID_EXCEEDS_TENURE';
  }

  // ── Start date ──
  if (input.startDate === undefined || input.startDate === null || input.startDate === '') {
    errors.startDate = 'DATE_REQUIRED';
  } else if (!parseIsoDate(input.startDate)) {
    // Catches a wrong format, a non-existent date such as 2025-02-31, and any
    // unparseable value.
    errors.startDate = 'DATE_INVALID';
  } else if (isFutureDate(input.startDate, today)) {
    errors.startDate = 'DATE_FUTURE';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    issues: Object.entries(errors).map(([field, code]) => ({ field, code: code as ExistingLoanErrorCode })),
  };
}