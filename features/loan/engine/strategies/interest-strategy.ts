import { InterestMethod, LoanConfig } from '../types';

export interface IInterestStrategy {
  readonly method: InterestMethod;

  /**
   * Calculates monthly EMI in integer paise.
   */
  calculateInitialEmiPaise(principalPaise: number, annualRate: number, tenureMonths: number): number;

  /**
   * Calculates unrounded interest in paise for a specific month given the opening balance.
   */
  calculateMonthlyInterestPaise(openingBalancePaise: number, monthNumber: number, config: LoanConfig): number;

  /**
   * Calculates total interest over the loan duration in paise.
   */
  calculateTotalInterestPaise(principalPaise: number, annualRate: number, tenureMonths: number): number;
}
