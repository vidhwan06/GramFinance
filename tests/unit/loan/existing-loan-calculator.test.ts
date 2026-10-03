import { describe, it, expect } from 'vitest';
import {
  calculateExistingLoanStatus,
  calculateExistingLoanStatusOrNull,
} from '@/features/loan/existing-loan/calculator';
import { validateExistingLoan } from '@/features/loan/existing-loan/schema';
import { generateAmortizationSchedule } from '@/features/loan/engine/amortization-engine';
import { reducingBalanceStrategy } from '@/features/loan/engine/strategies/reducing-balance';
import { ExistingLoanInput } from '@/features/loan/existing-loan/types';

/**
 * "Check Existing Loan" calculation engine.
 *
 * ── The point of this file is the balance, not the plumbing ──────────────────
 * The naive version of this feature is `principal - EMI * months`, which is
 * wrong because every EMI contains interest as well as principal. Each test here
 * pins an actual amortization, and the load-bearing one is `standard example`
 * below, whose expected figures were computed by hand from
 *
 *     interest_m = principal_m * rate / (12 * 100)
 *     principal_m = EMI - interest_m
 *
 * rather than read back out of the implementation. A test that derives its
 * expectations from the same code it is testing proves nothing.
 */

// ── A small, fully hand-checkable loan ───────────────────────────────────────
// ₹1,00,000 at 12% for 12 months.
//   r = 0.12/12 = 0.01; (1.01)^12 = 1.12682503
//   EMI = 100000 * 0.01 * 1.12682503 / (1.12682503 - 1)
//       = 1126.82503 / 0.12682503 = 8884.88
// Chosen because every month is round enough to verify by hand and short enough
// to lay out in full.
const SIMPLE: ExistingLoanInput = {
  principalRupees: 100_000,
  annualInterestRate: 12,
  tenureMonths: 12,
  startDate: '2025-01-01',
  emiRupees: null,
  emiSource: 'derived',
  emisPaid: 0,
};

/** ₹5,00,000 at 10% for 60 months — a realistic retail loan. */
const RETAIL: ExistingLoanInput = {
  principalRupees: 500_000,
  annualInterestRate: 10,
  tenureMonths: 60,
  startDate: '2024-06-01',
  emiRupees: null,
  emiSource: 'derived',
  emisPaid: 18,
};

describe('EMI derivation and consistency', () => {
  it('derives the standard EMI from principal, rate and tenure', () => {
    const status = calculateExistingLoanStatus(SIMPLE);
    // r = 0.12/12 = 0.01; EMI = P*r*(1+r)^n / ((1+r)^n - 1)
    //     = 100000 * 0.01 * 1.01^12 / (1.01^12 - 1) = 8884.88
    expect(status.standardEmiPaise).toBe(888_488);
    expect(status.effectiveEmiPaise).toBe(888_488);
    expect(status.emiSource).toBe('derived');
    expect(status.emiConsistency).toBe('derived');
  });

  it('matches the shared engine EMI, rather than computing its own', () => {
    // If these ever diverge, the status screen would quote one EMI and the
    // balance would come from another.
    const status = calculateExistingLoanStatus(RETAIL);
    const engineEmi = reducingBalanceStrategy.calculateInitialEmiPaise(
      500_000 * 100,
      10,
      60
    );
    expect(status.standardEmiPaise).toBe(engineEmi);
  });

  it('reports a user EMI that equals the standard exactly as matching', () => {
    const status = calculateExistingLoanStatus({
      ...SIMPLE,
      emiSource: 'provided',
      emiRupees: 8884.88,
    });
    expect(status.emiConsistency).toBe('matches');
    expect(status.emiDifferencePaise).toBe(0);
  });

  it('reports a user EMI a few paise off as still matching', () => {
    const status = calculateExistingLoanStatus({
      ...SIMPLE,
      emiSource: 'provided',
      emiRupees: 8884.81,
    });
    // 7 paise apart — well inside the ₹1 tolerance a rounding lender quote needs.
    expect(status.emiConsistency).toBe('matches');
  });

  it('reports a whole-rupee-rounded EMI as matching', () => {
    const status = calculateExistingLoanStatus({
      ...SIMPLE,
      emiSource: 'provided',
      emiRupees: 8885,
    });
    // 8,885.00 vs 8,884.88 = 12 paise, inside the ₹1 tolerance.
    expect(status.emiConsistency).toBe('matches');
  });

  it('reports a materially different EMI as differing, and still uses the standard', () => {
    const status = calculateExistingLoanStatus({
      ...SIMPLE,
      emiSource: 'provided',
      emiRupees: 5000,
    });
    expect(status.emiConsistency).toBe('differs');
    expect(status.emiDifferencePaise).toBe(500_000 - 888_488);
    // The balance must come from the canonical schedule, not the typed figure.
    expect(status.effectiveEmiPaise).toBe(888_488);
  });

  it('reports zero interest cleanly', () => {
    const status = calculateExistingLoanStatus({ ...SIMPLE, annualInterestRate: 0 });
    expect(status.standardEmiPaise).toBe(833_333); // 100000/12 = 8333.33
    expect(status.remainingInterestPaise).toBe(0);
  });
});

describe('standard fixed-rate loan (hand-checked)', () => {
  it('hand-computes the balance after the first EMI', () => {
    const status = calculateExistingLoanStatus({ ...SIMPLE, emisPaid: 1 });

    // Month 1, by hand:
    //   interest  = 100000 * 0.01        = 1000.00
    //   EMI       = 8884.88
    //   principal = 8884.88 - 1000.00    = 7884.88
    //   balance   = 100000 - 7884.88     = 92115.12
    expect(status.standardEmiPaise).toBe(888_488);
    expect(status.principalPaidToDatePaise).toBe(788_488);
    expect(status.interestPaidToDatePaise).toBe(100_000);
    expect(status.outstandingPrincipalPaise).toBe(9_211_512);

    // The naive `principal - EMI * months` would say 100000 - 8884.88 =
    // 91115.12, which is ₹1000 too low — exactly the interest component.
    expect(status.outstandingPrincipalPaise).not.toBe(9_111_512);
  });

  it('reproduces the engine schedule row-for-row', () => {
    const status = calculateExistingLoanStatus({ ...SIMPLE, emisPaid: 3 });
    const engine = generateAmortizationSchedule({
      principalPaise: 10_000_000,
      annualInterestRate: 12,
      tenureMonths: 12,
      interestMethod: 'reducing-balance',
    });

    // After 3 payments the outstanding is month 4's opening balance.
    expect(status.outstandingPrincipalPaise).toBe(engine.rows[3].openingBalancePaise);
    expect(status.emisRemaining).toBe(9);
    expect(status.remainingSchedule).toHaveLength(9);
    expect(status.remainingSchedule[0].originalMonth).toBe(4);
  });

  it('never computes the balance as principal minus EMIs times months', () => {
    // The specific failure this feature exists to avoid.
    for (const paid of [0, 1, 5, 11, 12]) {
      const status = calculateExistingLoanStatus({ ...SIMPLE, emisPaid: paid });
      const naive = 100_000 * 100 - status.standardEmiPaise * paid;
      if (paid > 0 && paid < 12) {
        expect(status.outstandingPrincipalPaise, `paid=${paid}`).not.toBe(naive);
      }
    }
  });
});

describe('zero-interest loan', () => {
  const ZERO: ExistingLoanInput = { ...SIMPLE, annualInterestRate: 0 };

  it('splits the principal evenly with no interest at all', () => {
    const status = calculateExistingLoanStatus({ ...ZERO, emisPaid: 6 });
    expect(status.remainingInterestPaise).toBe(0);
    expect(status.interestPaidToDatePaise).toBe(0);
    expect(status.totalRemainingPaymentsPaise).toBe(status.outstandingPrincipalPaise);
  });

  it('charges nothing in every row of the schedule', () => {
    const status = calculateExistingLoanStatus({ ...ZERO, emisPaid: 4 });
    for (const row of status.remainingSchedule) {
      expect(row.interestPaise).toBe(0);
    }
  });

  it('clears to exactly zero on the final EMI', () => {
    const status = calculateExistingLoanStatus({ ...ZERO, emisPaid: 12 });
    expect(status.outstandingPrincipalPaise).toBe(0);
    expect(status.isCompleted).toBe(true);
  });
});

describe('progress across the life of a loan', () => {
  it('reports nothing paid before the first EMI', () => {
    const status = calculateExistingLoanStatus({ ...SIMPLE, emisPaid: 0 });
    expect(status.outstandingPrincipalPaise).toBe(10_000_000);
    expect(status.emisPaid).toBe(0);
    expect(status.emisRemaining).toBe(12);
    expect(status.progressPercent).toBe(0);
    expect(status.remainingSchedule).toHaveLength(12);
    expect(status.interestPaidToDatePaise).toBe(0);
  });

  it('reports 30% after 18 of 60 EMIs', () => {
    const status = calculateExistingLoanStatus(RETAIL);
    expect(status.progressPercent).toBe(30);
    expect(status.emisPaid).toBe(18);
    expect(status.emisRemaining).toBe(42);
  });

  it('moves monotonically: more EMIs paid never means a bigger balance', () => {
    let previous = Number.POSITIVE_INFINITY;
    for (let paid = 0; paid <= 60; paid++) {
      const status = calculateExistingLoanStatus({ ...RETAIL, emisPaid: paid });
      expect(status.outstandingPrincipalPaise).toBeLessThanOrEqual(previous);
      previous = status.outstandingPrincipalPaise;
    }
  });

  it('reaches 100% only on the final EMI', () => {
    for (let paid = 0; paid < 60; paid++) {
      expect(calculateExistingLoanStatus({ ...RETAIL, emisPaid: paid }).progressPercent).toBeLessThan(100);
    }
    expect(calculateExistingLoanStatus({ ...RETAIL, emisPaid: 60 }).progressPercent).toBe(100);
  });

  it('balances the retail loan across a nearly-complete loan', () => {
    const status = calculateExistingLoanStatus({ ...RETAIL, emisPaid: 59 });
    expect(status.emisRemaining).toBe(1);
    expect(status.remainingSchedule).toHaveLength(1);
    // One EMI left cannot exceed what that final payment clears.
    expect(status.outstandingPrincipalPaise).toBeLessThan(status.effectiveEmiPaise);
  });
});

describe('completed loan', () => {
  it('reports the loan as completed when every EMI is paid', () => {
    const status = calculateExistingLoanStatus({ ...SIMPLE, emisPaid: 12 });
    expect(status.isCompleted).toBe(true);
    expect(status.outstandingPrincipalPaise).toBe(0);
    expect(status.emisRemaining).toBe(0);
    expect(status.progressPercent).toBe(100);
    expect(status.totalRemainingPaymentsPaise).toBe(0);
    expect(status.remainingInterestPaise).toBe(0);
    expect(status.remainingSchedule).toHaveLength(0);
  });

  it('never reports a negative outstanding balance, even when over-paid', () => {
    // Validation rejects this, but the calculator must not produce a negative
    // number if it is ever called directly.
    for (const paid of [13, 20, 999]) {
      const status = calculateExistingLoanStatus({ ...SIMPLE, emisPaid: paid });
      expect(status.outstandingPrincipalPaise).toBeGreaterThanOrEqual(0);
      expect(status.emisRemaining).toBeGreaterThanOrEqual(0);
      expect(status.totalRemainingPaymentsPaise).toBeGreaterThanOrEqual(0);
    }
  });

  it('clamps EMIs paid to the tenure', () => {
    const status = calculateExistingLoanStatus({ ...SIMPLE, emisPaid: 999 });
    expect(status.emisPaid).toBe(12);
  });
});

describe('final-EMI boundary behaviour', () => {
  it('closes to exactly zero, not a negative residue', () => {
    const status = calculateExistingLoanStatus({ ...SIMPLE, emisPaid: 11 });
    expect(status.remainingSchedule).toHaveLength(1);
    expect(status.remainingSchedule[0].closingBalancePaise).toBe(0);
  });

  it('has the last row close the whole remaining balance', () => {
    const status = calculateExistingLoanStatus({ ...SIMPLE, emisPaid: 11 });
    const last = status.remainingSchedule[0];
    expect(last.principalPaise + last.interestPaise).toBe(
      last.closingBalancePaise + last.principalPaise + last.interestPaise
    );
    // Principal + interest in the final row clears exactly what was owed.
    expect(last.principalPaise).toBe(status.outstandingPrincipalPaise);
  });

  it('never lets any schedule row show a negative balance', () => {
    for (const input of [SIMPLE, RETAIL, { ...SIMPLE, annualInterestRate: 0 }]) {
      for (let paid = 0; paid <= input.tenureMonths; paid++) {
        const status = calculateExistingLoanStatus({ ...input, emisPaid: paid });
        for (const row of status.remainingSchedule) {
          expect(row.closingBalancePaise, `paid=${paid}`).toBeGreaterThanOrEqual(0);
          expect(row.principalPaise).toBeGreaterThanOrEqual(0);
          expect(row.interestPaise).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });
});

describe('the remaining breakdown adds up', () => {
  it('has remaining principal + remaining interest = total remaining payments', () => {
    for (const paid of [0, 1, 6, 12, 18, 47, 59]) {
      const status = calculateExistingLoanStatus({ ...RETAIL, emisPaid: paid });
      expect(
        status.outstandingPrincipalPaise + status.remainingInterestPaise,
        `paid=${paid}`
      ).toBe(status.totalRemainingPaymentsPaise);
    }
  });

  it('sums the remaining schedule rows to the same interest figure', () => {
    const status = calculateExistingLoanStatus({ ...RETAIL, emisPaid: 18 });
    const summed = status.remainingSchedule.reduce((sum, row) => sum + row.interestPaise, 0);
    expect(summed).toBe(status.remainingInterestPaise);
  });

  it('has the remaining schedule end at the outstanding balance', () => {
    const status = calculateExistingLoanStatus({ ...RETAIL, emisPaid: 18 });
    const last = status.remainingSchedule[status.remainingSchedule.length - 1];
    expect(last.closingBalancePaise).toBe(0);
  });

  it('accounts for every rupee: principal paid + outstanding = original', () => {
    const status = calculateExistingLoanStatus({ ...RETAIL, emisPaid: 18 });
    expect(status.principalPaidToDatePaise + status.outstandingPrincipalPaise).toBe(
      status.originalPrincipalPaise
    );
  });
});

describe('validation', () => {
  const valid = { ...RETAIL };

  it('accepts a complete, sensible input', () => {
    expect(validateExistingLoan(valid).isValid).toBe(true);
  });

  it.each([
    [{ ...valid, principalRupees: 0 }, 'PRINCIPAL_NOT_POSITIVE'],
    [{ ...valid, principalRupees: -5000 }, 'PRINCIPAL_NOT_POSITIVE'],
    [{ ...valid, annualInterestRate: -1 }, 'RATE_NEGATIVE'],
    [{ ...valid, tenureMonths: 0 }, 'TENURE_OUT_OF_RANGE'],
    [{ ...valid, tenureMonths: -12 }, 'TENURE_OUT_OF_RANGE'],
    [{ ...valid, tenureMonths: 12.5 }, 'TENURE_NOT_WHOLE'],
    [{ ...valid, tenureMonths: 361 }, 'TENURE_OUT_OF_RANGE'],
    [{ ...valid, emisPaid: -1 }, 'PAID_NEGATIVE'],
    [{ ...valid, emisPaid: 2.5 }, 'PAID_NOT_WHOLE'],
    [{ ...valid, emisPaid: 61 }, 'PAID_EXCEEDS_TENURE'],
    [{ ...valid, startDate: '' }, 'DATE_REQUIRED'],
    [{ ...valid, startDate: '01-01-2025' }, 'DATE_INVALID'],
    [{ ...valid, startDate: '2025-02-31' }, 'DATE_INVALID'],
    [{ ...valid, startDate: '2099-01-01' }, 'DATE_FUTURE'],
  ])('rejects %#: %o', (input, code) => {
    const result = validateExistingLoan(input as never);
    expect(result.isValid).toBe(false);
    expect(Object.values(result.errors)).toContain(code);
  });

  it('allows a zero interest rate', () => {
    expect(validateExistingLoan({ ...valid, annualInterestRate: 0 }).isValid).toBe(true);
  });

  it('allows zero EMIs paid', () => {
    expect(validateExistingLoan({ ...valid, emisPaid: 0 }).isValid).toBe(true);
  });

  it('requires an EMI only when the user says they are supplying one', () => {
    expect(validateExistingLoan({ ...valid, emiSource: 'derived', emiRupees: null }).isValid).toBe(true);

    const missing = validateExistingLoan({ ...valid, emiSource: 'provided', emiRupees: null });
    expect(missing.isValid).toBe(false);
    expect(missing.errors.emiRupees).toBe('EMI_REQUIRED');
  });

  it('rejects a zero or negative supplied EMI', () => {
    expect(
      validateExistingLoan({ ...valid, emiSource: 'provided', emiRupees: 0 }).errors.emiRupees
    ).toBe('EMI_NOT_POSITIVE');
    expect(
      validateExistingLoan({ ...valid, emiSource: 'provided', emiRupees: -100 }).errors.emiRupees
    ).toBe('EMI_NOT_POSITIVE');
  });

  it('accepts a date that is today', () => {
    const today = new Date();
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
      today.getDate()
    ).padStart(2, '0')}`;
    expect(validateExistingLoan({ ...valid, startDate: iso }).errors.startDate).toBeUndefined();
  });

  it('returns null from the guarded wrapper when the input is invalid', () => {
    expect(calculateExistingLoanStatusOrNull({ ...valid, principalRupees: -1 })).toBeNull();
  });

  it('returns a status from the guarded wrapper when the input is valid', () => {
    expect(calculateExistingLoanStatusOrNull(valid)).not.toBeNull();
  });
});

describe('determinism and precision', () => {
  it('returns identical output for identical input', () => {
    const a = calculateExistingLoanStatus(RETAIL);
    const b = calculateExistingLoanStatus(RETAIL);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('keeps every money figure as an integer number of paise', () => {
    const status = calculateExistingLoanStatus(RETAIL);
    const money = [
      status.originalPrincipalPaise,
      status.effectiveEmiPaise,
      status.standardEmiPaise,
      status.outstandingPrincipalPaise,
      status.remainingInterestPaise,
      status.totalRemainingPaymentsPaise,
      status.emiDifferencePaise,
    ];
    for (const value of money) {
      expect(Number.isInteger(value), String(value)).toBe(true);
    }
  });

  it('rounds the progress percentage to a whole number', () => {
    // 1 of 3 rounds to 33, not 33.33 — so the bar and the label always agree.
    const status = calculateExistingLoanStatus({
      principalRupees: 300_000,
      annualInterestRate: 12,
      tenureMonths: 3,
      startDate: '2025-01-01',
      emiRupees: null,
      emiSource: 'derived',
      emisPaid: 1,
    });
    expect(status.progressPercent).toBe(33);
    expect(Number.isInteger(status.progressPercent)).toBe(true);
  });

  it('handles a single-month loan', () => {
    const status = calculateExistingLoanStatus({
      principalRupees: 50_000,
      annualInterestRate: 10,
      tenureMonths: 1,
      startDate: '2025-01-01',
      emiRupees: null,
      emiSource: 'derived',
      emisPaid: 0,
    });
    expect(status.emisRemaining).toBe(1);
    expect(calculateExistingLoanStatus({
      principalRupees: 50_000,
      annualInterestRate: 10,
      tenureMonths: 1,
      startDate: '2025-01-01',
      emiRupees: null,
      emiSource: 'derived',
      emisPaid: 1,
    }).isCompleted).toBe(true);
  });

  it('handles the maximum tenure the engine accepts', () => {
    const status = calculateExistingLoanStatus({
      principalRupees: 1_000_000,
      annualInterestRate: 12,
      tenureMonths: 360,
      startDate: '2020-01-01',
      emiRupees: null,
      emiSource: 'derived',
      emisPaid: 180,
    });
    expect(status.emisRemaining).toBe(180);
    expect(status.outstandingPrincipalPaise).toBeGreaterThan(0);
  });

  it('rejects a loan larger than the engine accepts', () => {
    // 2 crore, above the ₹1 crore engine limit.
    expect(
      validateExistingLoan({ ...RETAIL, principalRupees: 20_000_000 }).errors.principalRupees
    ).toBe('PRINCIPAL_TOO_LARGE');
  });
});