import { LoanConfig, EngineLoanResult } from './types';
import { validateLoanConfig } from './validation';
import { processFees } from './models/fee-model';
import { generateAmortizationSchedule } from './amortization-engine';
import { evaluatePrepaymentScenarios } from './models/prepayment-model';

export function runLoanPipeline(config: LoanConfig): EngineLoanResult {
  const validation = validateLoanConfig(config);
  if (!validation.isValid) {
    throw new Error(`Invalid Loan Config: ${JSON.stringify(validation.errors)}`);
  }

  const processedFees = processFees(config.principalPaise, config.fees);
  const schedule = generateAmortizationSchedule(config);
  const prepaymentAnalysis = evaluatePrepaymentScenarios(config);

  const initialMonthlyEmiPaise = schedule.rows[0]?.scheduledEmiPaise || 0;
  const totalInterestPaise = schedule.totalInterestPaidPaise;
  const totalPrincipalPaise = schedule.startingPrincipalPaise;
  const totalFeesPaise = processedFees.breakdown.totalFeesPaise;
  const totalRepaymentPaise = totalPrincipalPaise + totalInterestPaise;
  const totalCostPaise = totalInterestPaise + totalFeesPaise;
  const separatelyPaidFeesPaise = processedFees.separatelyPaidFeesPaise;
  const totalCashOutflowPaise = totalRepaymentPaise + separatelyPaidFeesPaise;

  return {
    basePrincipalPaise: config.principalPaise,
    startingPrincipalPaise: processedFees.startingPrincipalPaise,
    netDisbursedAmountPaise: processedFees.netDisbursedAmountPaise,
    initialMonthlyEmiPaise,
    totalInterestPaise,
    totalPrincipalPaise,
    totalFeesPaise,
    totalRepaymentPaise,
    totalCostPaise,
    separatelyPaidFeesPaise,
    totalCashOutflowPaise,
    feeBreakdown: processedFees.breakdown,
    schedule,
    prepaymentAnalysis,
  };
}
