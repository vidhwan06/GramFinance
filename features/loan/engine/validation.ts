import { LoanConfig, PrepaymentEvent } from './types';
import { toPaise } from './utils/money';

// ─────────────────────────────────────────────────────────────────────────────
// Shared input limits
// ─────────────────────────────────────────────────────────────────────────────
// Exported so the UI cannot drift from what the engine actually accepts. The
// tenure slider, the number inputs and the validation below all read these.
// Previously the slider was hardcoded to 3–120 months while the engine accepted
// 1–360, so a 360-month loan pinned the slider thumb at its maximum and
// misrepresented the real state.
export const PRINCIPAL_MAX_PAISE = 1_000_000_000; // ₹1 crore
export const TENURE_MIN_MONTHS = 1;
export const TENURE_MAX_MONTHS = 360; // 30 years
export const INTEREST_RATE_MAX_PERCENT = 100;

export interface ValidationIssue {
  field: string;
  message: string;
}

export interface EngineValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  issues: ValidationIssue[];
}

export function validateLoanConfig(config: Partial<LoanConfig>): EngineValidationResult {
  const errors: Record<string, string> = {};
  const issues: ValidationIssue[] = [];

  // 1. Principal Validation (in paise)
  if (config.principalPaise === undefined || config.principalPaise === null || isNaN(config.principalPaise)) {
    errors.principal = 'Loan amount is required.';
    issues.push({ field: 'principal', message: 'Loan amount is required.' });
  } else if (!Number.isInteger(config.principalPaise) || config.principalPaise <= 0) {
    errors.principal = 'Loan amount must be a positive integer value.';
    issues.push({ field: 'principal', message: 'Loan amount must be positive.' });
  } else if (config.principalPaise > PRINCIPAL_MAX_PAISE) {
    errors.principal = 'Loan amount cannot exceed ₹1,00,00,000.';
    issues.push({ field: 'principal', message: 'Loan amount exceeds limit.' });
  }

  // 2. Interest Rate Validation (%)
  if (config.annualInterestRate === undefined || config.annualInterestRate === null || isNaN(config.annualInterestRate)) {
    errors.interestRate = 'Interest rate is required.';
    issues.push({ field: 'interestRate', message: 'Interest rate is required.' });
  } else if (config.annualInterestRate < 0) {
    errors.interestRate = 'Interest rate cannot be negative.';
    issues.push({ field: 'interestRate', message: 'Interest rate cannot be negative.' });
  } else if (config.annualInterestRate > INTEREST_RATE_MAX_PERCENT) {
    errors.interestRate = 'Interest rate cannot exceed 100%.';
    issues.push({ field: 'interestRate', message: 'Interest rate cannot exceed 100%.' });
  }

  // 3. Tenure Months Validation
  if (config.tenureMonths === undefined || config.tenureMonths === null || isNaN(config.tenureMonths)) {
    errors.tenureMonths = 'Tenure is required.';
    issues.push({ field: 'tenureMonths', message: 'Tenure is required.' });
  } else if (!Number.isInteger(config.tenureMonths) || config.tenureMonths < TENURE_MIN_MONTHS) {
    errors.tenureMonths = 'Tenure must be at least 1 month.';
    issues.push({ field: 'tenureMonths', message: 'Tenure must be at least 1 month.' });
  } else if (config.tenureMonths > TENURE_MAX_MONTHS) {
    errors.tenureMonths = 'Tenure cannot exceed 360 months (30 years).';
    issues.push({ field: 'tenureMonths', message: 'Tenure cannot exceed 360 months.' });
  }

  // 4. Method Validation
  if (!config.interestMethod || (config.interestMethod !== 'reducing-balance' && config.interestMethod !== 'flat-rate')) {
    errors.interestMethod = 'Valid interest method is required (reducing-balance or flat-rate).';
    issues.push({ field: 'interestMethod', message: 'Invalid interest method.' });
  }

  // 5. Fees Validation
  if (config.fees) {
    config.fees.forEach((fee, idx) => {
      if (fee.value < 0 || isNaN(fee.value)) {
        errors[`fee_${idx}`] = `Fee ${fee.name || idx} cannot be negative.`;
        issues.push({ field: `fee_${idx}`, message: `Fee ${fee.name || idx} invalid.` });
      }
    });
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    issues,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Prepayment validation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Machine-readable reason a prepayment was rejected. The engine has no
 * knowledge of languages, so it returns codes and the UI resolves them to
 * bilingual copy via features/language/translations.
 */
export type PrepaymentErrorCode =
  | 'MONTH_NOT_INTEGER'
  | 'MONTH_OUT_OF_RANGE'
  | 'AMOUNT_NOT_POSITIVE'
  | 'DUPLICATE_MONTH';

export interface PrepaymentValidationResult {
  isValid: boolean;
  /** English, engine-locale messages keyed `prepayment_<index>`. */
  errors: Record<string, string>;
  /** Locale-agnostic reasons keyed identically to `errors`. */
  codes: Record<string, PrepaymentErrorCode>;
  /** Only the events that are safe to pass to the engine. */
  validEvents: PrepaymentEvent[];
}

export interface PrepaymentInput {
  month: number;
  /** In INR rupees. Converted to paise here. */
  amount: number;
}

/**
 * Validates prepayment events against the loan tenure.
 *
 * This exists because the UI used to silently DROP any event whose month fell
 * outside the tenure, then still render the prepayment panel as though a
 * simulation had run — showing "Interest Saved: ₹0" for a prepayment that was
 * never applied. Rejecting loudly is the only honest behaviour.
 *
 * Only one prepayment per month is accepted because
 * `amortization-engine.ts` resolves a month's prepayment with `Array.find`, so
 * a second event on the same month would be ignored by the calculation. That is
 * a property of the engine, surfaced here rather than hidden.
 */
export function validatePrepaymentEvents(
  prepayments: PrepaymentInput[],
  tenureMonths: number
): PrepaymentValidationResult {
  const errors: Record<string, string> = {};
  const codes: Record<string, PrepaymentErrorCode> = {};
  const validEvents: PrepaymentEvent[] = [];
  const claimedMonths = new Set<number>();

  prepayments.forEach((event, idx) => {
    const key = `prepayment_${idx}`;
    const ordinal = `Prepayment ${idx + 1}`;

    if (!Number.isInteger(event.month) || event.month < TENURE_MIN_MONTHS) {
      errors[key] = `${ordinal}: month must be a whole number of ${TENURE_MIN_MONTHS} or more.`;
      codes[key] = 'MONTH_NOT_INTEGER';
      return;
    }

    if (event.month > tenureMonths) {
      errors[key] = `${ordinal}: month ${event.month} is past the end of this ${tenureMonths}-month loan.`;
      codes[key] = 'MONTH_OUT_OF_RANGE';
      return;
    }

    if (!(event.amount > 0) || !isFinite(event.amount)) {
      errors[key] = `${ordinal}: amount must be greater than zero.`;
      codes[key] = 'AMOUNT_NOT_POSITIVE';
      return;
    }

    if (claimedMonths.has(event.month)) {
      errors[key] = `${ordinal}: month ${event.month} already has a prepayment. Only one is applied per month.`;
      codes[key] = 'DUPLICATE_MONTH';
      return;
    }

    claimedMonths.add(event.month);
    validEvents.push({
      month: event.month,
      amountPaise: toPaise(event.amount),
      timing: 'post-scheduled-payment',
    });
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    codes,
    validEvents,
  };
}
