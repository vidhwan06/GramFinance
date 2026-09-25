import { IInterestStrategy } from './interest-strategy';
import { InterestMethod, LoanConfig } from '../types';
import { roundToNearestPaise } from '../utils/rounding';

export class FlatRateStrategy implements IInterestStrategy {
  readonly method: InterestMethod = 'flat-rate';

  /**
   * Flat-Rate EMI Formula:
   * TotalInterest = BasePrincipal * (annualInterestRate / 100) * (tenureMonths / 12)
   * EMI = (BasePrincipal + TotalInterest) / tenureMonths
   */
  calculateInitialEmiPaise(principalPaise: number, annualRate: number, tenureMonths: number): number {
    if (principalPaise <= 0 || tenureMonths <= 0) return 0;

    const totalInterestPaise = this.calculateTotalInterestPaise(principalPaise, annualRate, tenureMonths);
    const emiPaise = (principalPaise + totalInterestPaise) / tenureMonths;
    return roundToNearestPaise(emiPaise);
  }

  /**
   * Monthly Interest for Flat Rate:
   * Calculated from initial base principal.
   * On final month, adjusts for integer division rounding so total interest is exact.
   */
  calculateMonthlyInterestPaise(_openingBalancePaise: number, monthNumber: number, config: LoanConfig): number {
    if (config.principalPaise <= 0 || config.tenureMonths <= 0 || config.annualInterestRate <= 0) return 0;

    const totalInterestPaise = this.calculateTotalInterestPaise(
      config.principalPaise,
      config.annualInterestRate,
      config.tenureMonths
    );

    const baseMonthlyInterest = Math.floor(totalInterestPaise / config.tenureMonths);

    if (monthNumber === config.tenureMonths) {
      const accumulatedBeforeLast = baseMonthlyInterest * (config.tenureMonths - 1);
      return totalInterestPaise - accumulatedBeforeLast;
    }

    return baseMonthlyInterest;
  }

  calculateTotalInterestPaise(principalPaise: number, annualRate: number, tenureMonths: number): number {
    if (principalPaise <= 0 || tenureMonths <= 0 || annualRate <= 0) return 0;
    const tenureYears = tenureMonths / 12;
    const totalInterest = principalPaise * (annualRate / 100) * tenureYears;
    return roundToNearestPaise(totalInterest);
  }
}

export const flatRateStrategy = new FlatRateStrategy();
