export type InterestMethod = 'reducing-balance' | 'flat-rate';
export type FeeType = 'upfront-flat' | 'upfront-percentage' | 'deducted-disbursement' | 'capitalized';
export type PrepaymentStrategy = 'reduce-emi' | 'reduce-tenure';

export interface FeeConfig {
  id: string;
  name: string;
  type: FeeType;
  value: number; // In INR or Percentage (0-100)
}

export interface PrepaymentEvent {
  month: number;                     // Month number (1..N)
  amountPaise: number;               // Amount in integer paise
  timing: 'post-scheduled-payment';  // Occurs AFTER regular monthly EMI
}

export interface LoanConfig {
  principalPaise: number;            // Requested principal in integer paise
  annualInterestRate: number;       // Fixed Annual Rate in % (e.g. 10.5)
  tenureMonths: number;              // Duration in months (1..360)
  interestMethod: InterestMethod;
  fees?: FeeConfig[];
  prepayments?: PrepaymentEvent[];
}

export interface AmortizationRow {
  month: number;
  openingBalancePaise: number;
  scheduledEmiPaise: number;
  principalPaidPaise: number;
  interestPaidPaise: number;
  prepaymentPaidPaise: number;
  totalPaidThisMonthPaise: number;
  closingBalancePaise: number;
  rateAppliedPercent: number;
}

export interface AmortizationSchedule {
  rows: AmortizationRow[];
  startingPrincipalPaise: number;          // Base Principal + Capitalized Fees
  totalScheduledPrincipalPaise: number;
  totalInterestPaidPaise: number;
  totalFeesPaidPaise: number;
  totalPrepaymentsMadePaise: number;
  actualTenureMonths: number;
  netDisbursedAmountPaise: number;         // Base Principal - Deducted Fees
}

export interface PrepaymentScenarioResult {
  strategy: PrepaymentStrategy;
  actualTenureMonths: number;
  newMonthlyEmiPaise: number;
  totalInterestPaidPaise: number;
  totalRepaymentPaise: number;
  interestSavingsPaise: number;
  tenureReductionMonths: number;
  schedule: AmortizationSchedule;
}

export interface FeeBreakdown {
  upfrontFlatFeesPaise: number;
  upfrontPercentageFeesPaise: number;
  deductedDisbursementFeesPaise: number;
  capitalizedFeesPaise: number;
  totalFeesPaise: number;
}

export interface EngineLoanResult {
  basePrincipalPaise: number;
  startingPrincipalPaise: number;      // Base Principal + Capitalized Fees
  netDisbursedAmountPaise: number;      // Base Principal - Deducted Fees
  initialMonthlyEmiPaise: number;
  totalInterestPaise: number;
  totalPrincipalPaise: number;
  totalFeesPaise: number;
  totalRepaymentPaise: number;          // Scheduled Principal + Total Interest
  totalCostPaise: number;               // Total Interest + Total Fees (Out-of-pocket cost)
  separatelyPaidFeesPaise: number;      // Upfront Flat + Upfront Percentage
  totalCashOutflowPaise: number;        // Total Repayment + Separately Paid Fees
  feeBreakdown: FeeBreakdown;
  schedule: AmortizationSchedule;
  prepaymentAnalysis?: {
    reduceEmiScenario: PrepaymentScenarioResult;
    reduceTenureScenario: PrepaymentScenarioResult;
  };
}
