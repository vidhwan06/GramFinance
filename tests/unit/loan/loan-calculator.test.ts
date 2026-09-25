import { describe, it, expect } from 'vitest';
import { calculateEmi } from '@/features/loan/lib/calculate-emi';
import { calculateInterest } from '@/features/loan/lib/calculate-interest';
import { calculateRepayment } from '@/features/loan/lib/calculate-repayment';
import { validateLoan } from '@/features/loan/lib/validate-loan';
import { LoanInput } from '@/features/loan/types';

describe('Loan Calculator Unit Tests', () => {
  // 1. Normal loan test
  it('1. should calculate correct EMI and interest for a normal loan (₹1,00,000 @ 12% for 12 months)', () => {
    const input: LoanInput = {
      principal: 100000,
      interestRate: 12,
      tenureMonths: 12,
      processingFee: 1000,
    };

    const emi = calculateEmi(input);
    const interest = calculateInterest(input);
    const result = calculateRepayment(input, 'en');

    // Standard reducing balance formula check for ₹1L @ 12% for 12m:
    // EMI ≈ ₹8,884.88 -> rounded 8884.88
    expect(emi).toBeGreaterThan(8800);
    expect(emi).toBeLessThan(8900);
    expect(result.monthlyEmi).toBe(emi);
    expect(result.totalInterest).toBe(interest);
    expect(result.totalRepayment).toBe(Math.round((input.principal + interest) * 100) / 100);
    expect(result.totalPayableAmount).toBe(result.totalRepayment + input.processingFee);
  });

  // 2. Zero-interest loan test
  it('2. should handle zero-interest loan (0% interest rate)', () => {
    const input: LoanInput = {
      principal: 60000,
      interestRate: 0,
      tenureMonths: 12,
      processingFee: 0,
    };

    const emi = calculateEmi(input);
    const interest = calculateInterest(input);

    expect(emi).toBe(5000); // 60000 / 12
    expect(interest).toBe(0);
  });

  // 3. Small loan test
  it('3. should calculate small loan (e.g. ₹5,000 @ 8% for 6 months)', () => {
    const input: LoanInput = {
      principal: 5000,
      interestRate: 8,
      tenureMonths: 6,
      processingFee: 50,
    };

    const emi = calculateEmi(input);
    const interest = calculateInterest(input);

    expect(emi).toBeGreaterThan(850);
    expect(emi).toBeLessThan(870);
    expect(interest).toBeGreaterThan(0);
  });

  // 4. Large loan test
  it('4. should calculate large loan (e.g. ₹50,00,000 @ 9.5% for 240 months)', () => {
    const input: LoanInput = {
      principal: 5000000,
      interestRate: 9.5,
      tenureMonths: 240,
      processingFee: 10000,
    };

    const emi = calculateEmi(input);
    const result = calculateRepayment(input, 'en');

    expect(emi).toBeGreaterThan(45000);
    expect(result.totalPayableAmount).toBeGreaterThan(input.principal);
  });

  // 5. Different tenures test
  it('5. should reflect higher total interest for longer tenure on same principal', () => {
    const shortTenureInput: LoanInput = {
      principal: 100000,
      interestRate: 10,
      tenureMonths: 12,
      processingFee: 0,
    };

    const longTenureInput: LoanInput = {
      principal: 100000,
      interestRate: 10,
      tenureMonths: 36,
      processingFee: 0,
    };

    const shortInterest = calculateInterest(shortTenureInput);
    const longInterest = calculateInterest(longTenureInput);

    expect(longInterest).toBeGreaterThan(shortInterest);
  });

  // 6. Different interest rates test
  it('6. should calculate higher EMI for higher interest rate', () => {
    const lowRateInput: LoanInput = {
      principal: 100000,
      interestRate: 7,
      tenureMonths: 12,
      processingFee: 0,
    };

    const highRateInput: LoanInput = {
      principal: 100000,
      interestRate: 18,
      tenureMonths: 12,
      processingFee: 0,
    };

    const lowEmi = calculateEmi(lowRateInput);
    const highEmi = calculateEmi(highRateInput);

    expect(highEmi).toBeGreaterThan(lowEmi);
  });

  // 7. Processing fee test
  it('7. should include processing fee correctly in total payable amount', () => {
    const inputNoFee: LoanInput = {
      principal: 100000,
      interestRate: 10,
      tenureMonths: 12,
      processingFee: 0,
    };

    const inputWithFee: LoanInput = {
      principal: 100000,
      interestRate: 10,
      tenureMonths: 12,
      processingFee: 1500,
    };

    const resNoFee = calculateRepayment(inputNoFee, 'en');
    const resWithFee = calculateRepayment(inputWithFee, 'en');

    expect(resWithFee.totalPayableAmount).toBe(resNoFee.totalPayableAmount + 1500);
  });

  // 8. Decimal interest rates test
  it('8. should calculate decimal interest rates accurately (e.g. 7.25%)', () => {
    const input: LoanInput = {
      principal: 200000,
      interestRate: 7.25,
      tenureMonths: 24,
      processingFee: 500,
    };

    const emi = calculateEmi(input);
    expect(emi).toBeGreaterThan(8900);
    expect(emi).toBeLessThan(9050);
  });

  // 9. Invalid inputs validation test
  it('9. should correctly invalidate invalid inputs (negative/zero/out-of-bounds)', () => {
    expect(validateLoan({ principal: -100, interestRate: 10, tenureMonths: 12, processingFee: 0 }).isValid).toBe(false);
    expect(validateLoan({ principal: 0, interestRate: 10, tenureMonths: 12, processingFee: 0 }).isValid).toBe(false);
    expect(validateLoan({ principal: 100000, interestRate: -5, tenureMonths: 12, processingFee: 0 }).isValid).toBe(false);
    expect(validateLoan({ principal: 100000, interestRate: 150, tenureMonths: 12, processingFee: 0 }).isValid).toBe(false);
    expect(validateLoan({ principal: 100000, interestRate: 10, tenureMonths: 0, processingFee: 0 }).isValid).toBe(false);
    expect(validateLoan({ principal: 100000, interestRate: 10, tenureMonths: 400, processingFee: 0 }).isValid).toBe(false);
    expect(validateLoan({ principal: 100000, interestRate: 10, tenureMonths: 12, processingFee: -200 }).isValid).toBe(false);
    expect(validateLoan({ principal: 100000, interestRate: 10, tenureMonths: 12, processingFee: 0 }).isValid).toBe(true);
  });
});
