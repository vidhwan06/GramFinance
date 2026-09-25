import { LoanInput, LoanValidationErrors } from '../types';

export interface ValidationResult {
  isValid: boolean;
  errors: LoanValidationErrors;
}

export function validateLoan(input: Partial<LoanInput>): ValidationResult {
  const errors: LoanValidationErrors = {};

  // 1. Validate Principal Amount
  if (input.principal === undefined || input.principal === null || isNaN(input.principal)) {
    errors.principal = 'Please enter a loan amount.';
  } else if (typeof input.principal !== 'number' || !isFinite(input.principal)) {
    errors.principal = 'Loan amount must be a valid number.';
  } else if (input.principal <= 0) {
    errors.principal = 'Loan amount must be greater than zero.';
  } else if (input.principal > 10000000) { // 1 Crore max limit
    errors.principal = 'Loan amount cannot exceed ₹1,00,00,000 (1 Crore).';
  }

  // 2. Validate Interest Rate
  if (input.interestRate === undefined || input.interestRate === null || isNaN(input.interestRate)) {
    errors.interestRate = 'Please enter an annual interest rate.';
  } else if (typeof input.interestRate !== 'number' || !isFinite(input.interestRate)) {
    errors.interestRate = 'Interest rate must be a valid number.';
  } else if (input.interestRate < 0) {
    errors.interestRate = 'Interest rate cannot be negative.';
  } else if (input.interestRate > 100) {
    errors.interestRate = 'Interest rate cannot exceed 100%.';
  }

  // 3. Validate Tenure (in months)
  if (input.tenureMonths === undefined || input.tenureMonths === null || isNaN(input.tenureMonths)) {
    errors.tenureMonths = 'Please enter loan tenure in months.';
  } else if (typeof input.tenureMonths !== 'number' || !isFinite(input.tenureMonths)) {
    errors.tenureMonths = 'Tenure must be a valid number.';
  } else if (!Number.isInteger(input.tenureMonths)) {
    errors.tenureMonths = 'Tenure must be a whole number of months.';
  } else if (input.tenureMonths <= 0) {
    errors.tenureMonths = 'Tenure must be at least 1 month.';
  } else if (input.tenureMonths > 360) { // 30 Years max limit
    errors.tenureMonths = 'Tenure cannot exceed 360 months (30 years).';
  }

  // 4. Validate Processing Fee
  if (input.processingFee === undefined || input.processingFee === null || isNaN(input.processingFee)) {
    errors.processingFee = 'Please enter a processing fee (enter 0 if none).';
  } else if (typeof input.processingFee !== 'number' || !isFinite(input.processingFee)) {
    errors.processingFee = 'Processing fee must be a valid number.';
  } else if (input.processingFee < 0) {
    errors.processingFee = 'Processing fee cannot be negative.';
  } else if (input.processingFee > 1000000) { // 10 Lakhs max limit
    errors.processingFee = 'Processing fee cannot exceed ₹10,00,000.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
