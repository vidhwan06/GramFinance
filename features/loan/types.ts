export interface LoanInput {
  principal: number; // Principal amount in INR
  interestRate: number; // Annual interest rate in %
  tenureMonths: number; // Tenure in months
  processingFee: number; // Processing fee in INR
}

export interface LoanValidationErrors {
  principal?: string;
  interestRate?: string;
  tenureMonths?: string;
  processingFee?: string;
}

export interface PlainLanguageSummary {
  monthlyText: string;
  interestText: string;
  totalText: string;
  estimateDisclaimer: string;
}

export interface LoanResult {
  monthlyEmi: number;
  totalInterest: number;
  totalRepayment: number;
  processingFee: number;
  totalPayableAmount: number;
  plainLanguageSummary: PlainLanguageSummary;
}

export interface CalculationDetails {
  method: 'reducing-balance';
  methodLabel: string;
  assumptionsText: string;
}
