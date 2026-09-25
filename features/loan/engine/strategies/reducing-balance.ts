import { IInterestStrategy } from './interest-strategy';
import { InterestMethod, LoanConfig } from '../types';
import { roundToNearestPaise } from '../utils/rounding';

export class ReducingBalanceStrategy implements IInterestStrategy {
  readonly method: InterestMethod = 'reducing-balance';

  calculateInitialEmiPaise(principalPaise: number, annualRate: number, tenureMonths: number): number {
    if (principalPaise <= 0 || tenureMonths <= 0) return 0;
    if (annualRate === 0) return roundToNearestPaise(principalPaise / tenureMonths);

    const monthlyRate = annualRate / (12 * 100);
    const factor = Math.pow(1 + monthlyRate, tenureMonths);

    if (factor === 1 || !isFinite(factor)) return roundToNearestPaise(principalPaise / tenureMonths);

    const emiPaise = (principalPaise * monthlyRate * factor) / (factor - 1);
    return roundToNearestPaise(emiPaise);
  }

  calculateMonthlyInterestPaise(openingBalancePaise: number, _monthNumber: number, config: LoanConfig): number {
    if (openingBalancePaise <= 0 || config.annualInterestRate <= 0) return 0;
    const monthlyRate = config.annualInterestRate / (12 * 100);
    return openingBalancePaise * monthlyRate;
  }

  calculateTotalInterestPaise(principalPaise: number, annualRate: number, tenureMonths: number): number {
    const emiPaise = this.calculateInitialEmiPaise(principalPaise, annualRate, tenureMonths);
    const totalRepayment = emiPaise * tenureMonths;
    return Math.max(0, totalRepayment - principalPaise);
  }
}

export const reducingBalanceStrategy = new ReducingBalanceStrategy();
