import { LoanConfig } from './types';

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
  } else if (config.principalPaise > 1000000000) { // ₹1 Crore = 1,000,000,000 paise
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
  } else if (config.annualInterestRate > 100) {
    errors.interestRate = 'Interest rate cannot exceed 100%.';
    issues.push({ field: 'interestRate', message: 'Interest rate cannot exceed 100%.' });
  }

  // 3. Tenure Months Validation
  if (config.tenureMonths === undefined || config.tenureMonths === null || isNaN(config.tenureMonths)) {
    errors.tenureMonths = 'Tenure is required.';
    issues.push({ field: 'tenureMonths', message: 'Tenure is required.' });
  } else if (!Number.isInteger(config.tenureMonths) || config.tenureMonths <= 0) {
    errors.tenureMonths = 'Tenure must be at least 1 month.';
    issues.push({ field: 'tenureMonths', message: 'Tenure must be at least 1 month.' });
  } else if (config.tenureMonths > 360) {
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
