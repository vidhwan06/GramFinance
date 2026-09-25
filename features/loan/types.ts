export type LoanCalculationMethod = 'reducing' | 'flat';

export interface LoanInput {
  principal: number;
  interestRate: number; // annual percentage
  tenureMonths: number;
  processingFee: number;
  method: LoanCalculationMethod;
}

export interface LoanResult {
  emi: number;
  totalInterest: number;
  totalRepayment: number;
  effectiveCostPercentage: number;
  plainLanguageSummary: string;
}
