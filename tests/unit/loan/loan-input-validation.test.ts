import { describe, it, expect } from 'vitest';
import {
  validateLoanConfig,
  validatePrepaymentEvents,
  PRINCIPAL_MAX_PAISE,
  TENURE_MIN_MONTHS,
  TENURE_MAX_MONTHS,
} from '@/features/loan/engine/validation';
import { LOAN_FORM_ERROR_KEYS } from '@/features/loan/components/LoanForm';

/**
 * Regression tests for the loan input bugs found in the Phase 2 audit.
 *
 * These are pure-function tests. The components themselves are not rendered
 * here because the vitest environment is 'node' with no DOM, so the testable
 * surface is the logic the components depend on: the engine's error keys, the
 * engine's accepted ranges, and the prepayment validator.
 */

describe('LoanForm error-key mapping', () => {
  it('maps every form field to a key the engine actually produces', () => {
    // The original bug: LoanForm read validationErrors['annualInterestRate']
    // while the engine writes errors.interestRate, so a negative or excessive
    // rate rendered no error at all. This asserts the two agree.
    const result = validateLoanConfig({
      principalPaise: -1,
      annualInterestRate: -1,
      tenureMonths: 0,
      interestMethod: 'reducing-balance',
    });

    for (const key of Object.values(LOAN_FORM_ERROR_KEYS)) {
      expect(
        result.errors,
        `LOAN_FORM_ERROR_KEYS references "${key}", which validateLoanConfig never sets`
      ).toHaveProperty(key);
    }
  });

  it('does not use the phantom annualInterestRate key', () => {
    expect(Object.values(LOAN_FORM_ERROR_KEYS)).not.toContain('annualInterestRate');
  });
});

describe('Interest rate validation', () => {
  it('reports a visible error for a negative rate', () => {
    const result = validateLoanConfig({
      principalPaise: 5_000_000,
      annualInterestRate: -5,
      tenureMonths: 12,
      interestMethod: 'reducing-balance',
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.interestRate).toBeDefined();
    expect(result.errors.interestRate).toContain('negative');
  });

  it('reports a visible error for an excessive rate', () => {
    const result = validateLoanConfig({
      principalPaise: 5_000_000,
      annualInterestRate: 150,
      tenureMonths: 12,
      interestMethod: 'reducing-balance',
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.interestRate).toBeDefined();
    expect(result.errors.interestRate).toContain('100%');
  });

  it('accepts 0% and 100% as the inclusive bounds', () => {
    for (const rate of [0, 100]) {
      const result = validateLoanConfig({
        principalPaise: 5_000_000,
        annualInterestRate: rate,
        tenureMonths: 12,
        interestMethod: 'reducing-balance',
      });
      expect(result.isValid, `rate ${rate} should be accepted`).toBe(true);
    }
  });
});

describe('Tenure range is the single source of truth for the slider', () => {
  it('accepts every value the slider can represent', () => {
    // The slider's min/max are read from these constants, so a value on the
    // track is always a value the engine accepts. Previously the slider was
    // hardcoded 3-120 while the engine accepted 1-360, so a 360-month loan
    // pinned the thumb at its maximum while the real value was 360.
    for (const months of [TENURE_MIN_MONTHS, 12, 120, 360, TENURE_MAX_MONTHS]) {
      const result = validateLoanConfig({
        principalPaise: 5_000_000,
        annualInterestRate: 8,
        tenureMonths: months,
        interestMethod: 'reducing-balance',
      });
      expect(result.isValid, `tenure ${months} must be selectable on the slider`).toBe(true);
    }
  });

  it('rejects values outside the slider range', () => {
    for (const months of [TENURE_MIN_MONTHS - 1, 0, TENURE_MAX_MONTHS + 1]) {
      const result = validateLoanConfig({
        principalPaise: 5_000_000,
        annualInterestRate: 8,
        tenureMonths: months,
        interestMethod: 'reducing-balance',
      });
      expect(result.isValid, `tenure ${months} must be rejected`).toBe(false);
      expect(result.errors.tenureMonths).toBeDefined();
    }
  });

  it('exposes a 1-360 range', () => {
    expect(TENURE_MIN_MONTHS).toBe(1);
    expect(TENURE_MAX_MONTHS).toBe(360);
  });
});

describe('Principal ceiling', () => {
  it('accepts exactly the maximum and rejects one paise more', () => {
    const atMax = validateLoanConfig({
      principalPaise: PRINCIPAL_MAX_PAISE,
      annualInterestRate: 8,
      tenureMonths: 12,
      interestMethod: 'reducing-balance',
    });
    expect(atMax.isValid).toBe(true);

    const overMax = validateLoanConfig({
      principalPaise: PRINCIPAL_MAX_PAISE + 1,
      annualInterestRate: 8,
      tenureMonths: 12,
      interestMethod: 'reducing-balance',
    });
    expect(overMax.isValid).toBe(false);
  });
});

describe('Prepayment validation replaces silent filtering', () => {
  it('rejects a month beyond the loan tenure instead of dropping it', () => {
    // The original bug: an out-of-range event was filtered out of the engine
    // config, the panel still rendered, and the user saw "Interest Saved: ₹0"
    // for a prepayment that was never applied.
    const result = validatePrepaymentEvents([{ month: 13, amount: 50_000 }], 12);

    expect(result.isValid).toBe(false);
    expect(result.validEvents).toHaveLength(0);
    expect(Object.values(result.codes)).toContain('MONTH_OUT_OF_RANGE');
  });

  it('accepts a month equal to the final month of the loan', () => {
    const result = validatePrepaymentEvents([{ month: 12, amount: 50_000 }], 12);

    expect(result.isValid).toBe(true);
    expect(result.validEvents).toHaveLength(1);
  });

  it('rejects a non-integer or sub-1 month', () => {
    for (const month of [0, -1, 1.5, NaN]) {
      const result = validatePrepaymentEvents([{ month, amount: 1000 }], 24);
      expect(result.isValid, `month ${month} must be rejected`).toBe(false);
      expect(Object.values(result.codes)).toContain('MONTH_NOT_INTEGER');
    }
  });

  it('rejects a zero or negative amount', () => {
    for (const amount of [0, -500]) {
      const result = validatePrepaymentEvents([{ month: 6, amount }], 24);
      expect(result.isValid, `amount ${amount} must be rejected`).toBe(false);
      expect(Object.values(result.codes)).toContain('AMOUNT_NOT_POSITIVE');
    }
  });

  it('rejects two prepayments on the same month', () => {
    // amortization-engine resolves a month's prepayment with Array.find, so a
    // second event on the same month would be silently ignored by the maths.
    const result = validatePrepaymentEvents(
      [
        { month: 6, amount: 10_000 },
        { month: 6, amount: 20_000 },
      ],
      24
    );

    expect(result.isValid).toBe(false);
    expect(result.validEvents).toHaveLength(1);
    expect(Object.values(result.codes)).toContain('DUPLICATE_MONTH');
  });

  it('preserves several valid prepayments on distinct months', () => {
    const result = validatePrepaymentEvents(
      [
        { month: 6, amount: 10_000 },
        { month: 12, amount: 20_000 },
        { month: 18, amount: 30_000 },
      ],
      24
    );

    expect(result.isValid).toBe(true);
    expect(result.validEvents).toHaveLength(3);
  });

  it('converts rupee amounts to integer paise for the engine', () => {
    const result = validatePrepaymentEvents([{ month: 6, amount: 10_000.5 }], 24);

    expect(result.isValid).toBe(true);
    expect(result.validEvents[0].amountPaise).toBe(1_000_050);
  });

  it('keeps valid events and reports invalid ones independently', () => {
    const result = validatePrepaymentEvents(
      [
        { month: 6, amount: 10_000 },
        { month: 99, amount: 5_000 },
      ],
      24
    );

    expect(result.isValid).toBe(false);
    expect(result.validEvents).toHaveLength(1);
    expect(result.validEvents[0].month).toBe(6);
    expect(result.errors.prepayment_1).toBeDefined();
    expect(result.errors.prepayment_0).toBeUndefined();
  });
});
