import { describe, it, expect } from 'vitest';
import { toPaise, toRupees, formatPaiseINR } from '@/features/loan/engine/utils/money';
import { validateLoanConfig } from '@/features/loan/engine/validation';
import { processFees } from '@/features/loan/engine/models/fee-model';
import { generateAmortizationSchedule } from '@/features/loan/engine/amortization-engine';
import { evaluatePrepaymentScenarios } from '@/features/loan/engine/models/prepayment-model';
import { runLoanPipeline } from '@/features/loan/engine/pipeline';
import { compareLoans } from '@/features/loan/engine/models/comparison-model';
import { LoanConfig } from '@/features/loan/engine/types';

describe('V2 Loan Calculation Engine Tests', () => {
  // 1. Money utilities
  describe('Money Utilities', () => {
    it('should convert rupees to integer paise and back', () => {
      expect(toPaise(1000.5)).toBe(100050);
      expect(toRupees(100050)).toBe(1000.5);
      expect(formatPaiseINR(100050, true)).toBe('₹1,000.50');
      expect(formatPaiseINR(100050, false)).toBe('₹1,001');
    });
  });

  // 2. Validation
  describe('Validation Engine', () => {
    it('should pass valid LoanConfig', () => {
      const config: Partial<LoanConfig> = {
        principalPaise: 10000000,
        annualInterestRate: 10,
        tenureMonths: 12,
        interestMethod: 'reducing-balance',
      };
      expect(validateLoanConfig(config).isValid).toBe(true);
    });

    it('should reject invalid boundaries', () => {
      expect(validateLoanConfig({ principalPaise: -100 }).isValid).toBe(false);
      expect(validateLoanConfig({ principalPaise: 100000, annualInterestRate: -1 }).isValid).toBe(false);
      expect(validateLoanConfig({ principalPaise: 100000, tenureMonths: 0 }).isValid).toBe(false);
    });
  });

  // 3. Fee Processing Model
  describe('Fee Processing Model', () => {
    it('should correctly process all 4 fee treatments', () => {
      const basePrincipalPaise = toPaise(100000); // ₹1,00,000 = 10,000,000 paise
      const fees = [
        { id: '1', name: 'Upfront Flat', type: 'upfront-flat' as const, value: 1000 },
        { id: '2', name: 'Upfront Pct', type: 'upfront-percentage' as const, value: 1.5 },
        { id: '3', name: 'Deducted', type: 'deducted-disbursement' as const, value: 2000 },
        { id: '4', name: 'Capitalized', type: 'capitalized' as const, value: 3000 },
      ];

      const result = processFees(basePrincipalPaise, fees);

      expect(result.startingPrincipalPaise).toBe(toPaise(103000)); // 100000 + 3000
      expect(result.netDisbursedAmountPaise).toBe(toPaise(98000)); // 100000 - 2000
      expect(result.separatelyPaidFeesPaise).toBe(toPaise(1000 + 1500)); // 1000 + 1.5% of 100k
      expect(result.breakdown.totalFeesPaise).toBe(toPaise(1000 + 1500 + 2000 + 3000));
    });
  });

  // 4. Amortization Schedule & Invariants
  describe('Amortization Schedule Invariants', () => {
    it('reducing-balance schedule should balance to zero and preserve principal invariant', () => {
      const config: LoanConfig = {
        principalPaise: toPaise(100000),
        annualInterestRate: 12,
        tenureMonths: 12,
        interestMethod: 'reducing-balance',
      };

      const schedule = generateAmortizationSchedule(config);

      expect(schedule.rows.length).toBe(12);
      expect(schedule.rows[11].closingBalancePaise).toBe(0);

      // Invariant: sum of principal paid == starting principal
      const sumPrincipalPaid = schedule.rows.reduce((acc, row) => acc + row.principalPaidPaise, 0);
      expect(sumPrincipalPaid).toBe(schedule.startingPrincipalPaise);
    });

    it('flat-rate schedule should calculate interest from base principal and hit zero closing balance', () => {
      const config: LoanConfig = {
        principalPaise: toPaise(100000),
        annualInterestRate: 10,
        tenureMonths: 12,
        interestMethod: 'flat-rate',
      };

      const schedule = generateAmortizationSchedule(config);

      // Flat rate total interest = 100000 * 10% * 1 year = 10,000 INR = 1,000,000 paise
      expect(schedule.totalInterestPaidPaise).toBe(toPaise(10000));
      expect(schedule.rows[11].closingBalancePaise).toBe(0);
    });
  });

  // 5. Prepayment Scenarios (Neutral Dual Evaluation)
  describe('Prepayment Model', () => {
    it('should generate both reduce-emi and reduce-tenure scenarios neutrally', () => {
      const config: LoanConfig = {
        principalPaise: toPaise(500000),
        annualInterestRate: 10,
        tenureMonths: 60,
        interestMethod: 'reducing-balance',
        prepayments: [
          {
            month: 12,
            amountPaise: toPaise(100000),
            timing: 'post-scheduled-payment',
          },
        ],
      };

      const analysis = evaluatePrepaymentScenarios(config);
      expect(analysis).toBeDefined();

      if (analysis) {
        // Reduce EMI keeps tenure 60 months but lowers EMI
        expect(analysis.reduceEmiScenario.actualTenureMonths).toBe(60);
        expect(analysis.reduceEmiScenario.interestSavingsPaise).toBeGreaterThan(0);

        // Reduce Tenure reduces actual tenure < 60 months
        expect(analysis.reduceTenureScenario.actualTenureMonths).toBeLessThan(60);
        expect(analysis.reduceTenureScenario.interestSavingsPaise).toBeGreaterThan(0);
      }
    });
  });

  // 6. Pipeline Execution
  describe('Full Loan Pipeline', () => {
    it('should aggregate correct cost metrics in EngineLoanResult', () => {
      const config: LoanConfig = {
        principalPaise: toPaise(100000),
        annualInterestRate: 10,
        tenureMonths: 12,
        interestMethod: 'reducing-balance',
        fees: [{ id: 'f1', name: 'Processing Fee', type: 'upfront-flat', value: 1000 }],
      };

      const result = runLoanPipeline(config);

      expect(result.basePrincipalPaise).toBe(toPaise(100000));
      expect(result.totalFeesPaise).toBe(toPaise(1000));
      expect(result.totalCostPaise).toBe(result.totalInterestPaise + result.totalFeesPaise);
      expect(result.totalCashOutflowPaise).toBe(result.totalRepaymentPaise + result.separatelyPaidFeesPaise);
    });
  });

  // 7. Loan Comparison Model
  describe('Loan Comparison Model', () => {
    it('should evaluate side-by-side comparison of 2 loans', () => {
      const configA: LoanConfig = {
        principalPaise: toPaise(100000),
        annualInterestRate: 10,
        tenureMonths: 24,
        interestMethod: 'reducing-balance',
      };

      const configB: LoanConfig = {
        principalPaise: toPaise(100000),
        annualInterestRate: 10,
        tenureMonths: 24,
        interestMethod: 'flat-rate',
      };

      const comparison = compareLoans(configA, configB);

      expect(comparison.optionA.basePrincipalPaise).toBe(toPaise(100000));
      expect(comparison.optionB.basePrincipalPaise).toBe(toPaise(100000));
      // Flat rate option B should accumulate higher total interest than reducing rate option A
      expect(comparison.comparison.totalInterestPaise.difference).toBeGreaterThan(0);
    });
  });
});
