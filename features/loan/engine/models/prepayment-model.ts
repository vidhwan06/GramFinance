import { LoanConfig, PrepaymentScenarioResult } from '../types';
import { generateAmortizationSchedule } from '../amortization-engine';

export function evaluatePrepaymentScenarios(
  baseConfig: LoanConfig
): { reduceEmiScenario: PrepaymentScenarioResult; reduceTenureScenario: PrepaymentScenarioResult } | undefined {
  if (!baseConfig.prepayments || baseConfig.prepayments.length === 0) {
    return undefined;
  }

  // Baseline schedule without prepayment for savings calculation
  const baselineSchedule = generateAmortizationSchedule({
    ...baseConfig,
    prepayments: undefined,
  });

  // Scenario A: Reduce EMI
  const reduceEmiSchedule = generateAmortizationSchedule(baseConfig, 'reduce-emi');
  const reduceEmiEmiPaise = reduceEmiSchedule.rows[reduceEmiSchedule.rows.length - 1]?.scheduledEmiPaise || 0;
  const reduceEmiInterestSavingsPaise = Math.max(
    0,
    baselineSchedule.totalInterestPaidPaise - reduceEmiSchedule.totalInterestPaidPaise
  );
  const reduceEmiScenario: PrepaymentScenarioResult = {
    strategy: 'reduce-emi',
    actualTenureMonths: reduceEmiSchedule.actualTenureMonths,
    newMonthlyEmiPaise: reduceEmiEmiPaise,
    totalInterestPaidPaise: reduceEmiSchedule.totalInterestPaidPaise,
    totalRepaymentPaise: reduceEmiSchedule.startingPrincipalPaise + reduceEmiSchedule.totalInterestPaidPaise,
    interestSavingsPaise: reduceEmiInterestSavingsPaise,
    tenureReductionMonths: baselineSchedule.actualTenureMonths - reduceEmiSchedule.actualTenureMonths,
    schedule: reduceEmiSchedule,
  };

  // Scenario B: Reduce Tenure
  const reduceTenureSchedule = generateAmortizationSchedule(baseConfig, 'reduce-tenure');
  const reduceTenureInterestSavingsPaise = Math.max(
    0,
    baselineSchedule.totalInterestPaidPaise - reduceTenureSchedule.totalInterestPaidPaise
  );
  const reduceTenureScenario: PrepaymentScenarioResult = {
    strategy: 'reduce-tenure',
    actualTenureMonths: reduceTenureSchedule.actualTenureMonths,
    newMonthlyEmiPaise: reduceTenureSchedule.rows[0]?.scheduledEmiPaise || 0,
    totalInterestPaidPaise: reduceTenureSchedule.totalInterestPaidPaise,
    totalRepaymentPaise: reduceTenureSchedule.startingPrincipalPaise + reduceTenureSchedule.totalInterestPaidPaise,
    interestSavingsPaise: reduceTenureInterestSavingsPaise,
    tenureReductionMonths: baselineSchedule.actualTenureMonths - reduceTenureSchedule.actualTenureMonths,
    schedule: reduceTenureSchedule,
  };

  return {
    reduceEmiScenario,
    reduceTenureScenario,
  };
}
