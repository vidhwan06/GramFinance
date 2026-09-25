import { LoanConfig, AmortizationSchedule, AmortizationRow } from './types';
import { reducingBalanceStrategy } from './strategies/reducing-balance';
import { flatRateStrategy } from './strategies/flat-rate';
import { processFees } from './models/fee-model';
import { roundToNearestPaise } from './utils/rounding';

export function generateAmortizationSchedule(
  config: LoanConfig,
  forcedPrepaymentStrategy?: 'reduce-emi' | 'reduce-tenure'
): AmortizationSchedule {
  const processedFees = processFees(config.principalPaise, config.fees);
  const startingPrincipalPaise = processedFees.startingPrincipalPaise;

  const strategy =
    config.interestMethod === 'flat-rate' ? flatRateStrategy : reducingBalanceStrategy;

  let activeEmiPaise = strategy.calculateInitialEmiPaise(
    startingPrincipalPaise,
    config.annualInterestRate,
    config.tenureMonths
  );

  const rows: AmortizationRow[] = [];
  let currentBalancePaise = startingPrincipalPaise;
  let totalScheduledPrincipalPaise = 0;
  let totalInterestPaidPaise = 0;
  let totalPrepaymentsMadePaise = 0;

  const maxMonths = config.tenureMonths;

  for (let m = 1; m <= maxMonths; m++) {
    if (currentBalancePaise <= 0) break;

    const openingBalancePaise = currentBalancePaise;

    // 1. Calculate Interest for current month
    const rawInterestPaise = strategy.calculateMonthlyInterestPaise(openingBalancePaise, m, config);
    const interestPaidPaise = roundToNearestPaise(rawInterestPaise);

    // 2. Determine Scheduled Payment
    let scheduledEmiPaise = activeEmiPaise;

    // Final month boundary adjustment
    if (m === maxMonths || openingBalancePaise + interestPaidPaise <= scheduledEmiPaise) {
      scheduledEmiPaise = openingBalancePaise + interestPaidPaise;
    }

    // 3. Principal Paid from Scheduled EMI
    let principalPaidPaise = Math.min(openingBalancePaise, scheduledEmiPaise - interestPaidPaise);
    if (principalPaidPaise < 0) principalPaidPaise = 0;

    let balanceAfterScheduled = openingBalancePaise - principalPaidPaise;

    // 4. Prepayment Check (Post-Scheduled Payment Timing)
    let prepaymentPaidPaise = 0;
    const prepaymentEvent = config.prepayments?.find((p) => p.month === m);

    if (prepaymentEvent && prepaymentEvent.amountPaise > 0 && balanceAfterScheduled > 0) {
      prepaymentPaidPaise = Math.min(balanceAfterScheduled, prepaymentEvent.amountPaise);
      balanceAfterScheduled -= prepaymentPaidPaise;
    }

    const closingBalancePaise = Math.max(0, balanceAfterScheduled);
    const totalPaidThisMonthPaise = principalPaidPaise + interestPaidPaise + prepaymentPaidPaise;

    // Record Row
    rows.push({
      month: m,
      openingBalancePaise,
      scheduledEmiPaise,
      principalPaidPaise,
      interestPaidPaise,
      prepaymentPaidPaise,
      totalPaidThisMonthPaise,
      closingBalancePaise,
      rateAppliedPercent: config.annualInterestRate,
    });

    totalScheduledPrincipalPaise += principalPaidPaise;
    totalInterestPaidPaise += interestPaidPaise;
    totalPrepaymentsMadePaise += prepaymentPaidPaise;

    currentBalancePaise = closingBalancePaise;

    // 5. Prepayment Recalculation (if reduce-emi strategy)
    if (prepaymentPaidPaise > 0 && closingBalancePaise > 0 && forcedPrepaymentStrategy === 'reduce-emi') {
      const remainingMonths = maxMonths - m;
      if (remainingMonths > 0) {
        if (config.interestMethod === 'reducing-balance') {
          activeEmiPaise = reducingBalanceStrategy.calculateInitialEmiPaise(
            closingBalancePaise,
            config.annualInterestRate,
            remainingMonths
          );
        } else {
          // Flat rate reduce-EMI convention
          const remainingInterestPaise = flatRateStrategy.calculateTotalInterestPaise(
            closingBalancePaise,
            config.annualInterestRate,
            remainingMonths
          );
          activeEmiPaise = roundToNearestPaise((closingBalancePaise + remainingInterestPaise) / remainingMonths);
        }
      }
    }
  }

  return {
    rows,
    startingPrincipalPaise,
    totalScheduledPrincipalPaise,
    totalInterestPaidPaise,
    totalFeesPaidPaise: processedFees.breakdown.totalFeesPaise,
    totalPrepaymentsMadePaise,
    actualTenureMonths: rows.length,
    netDisbursedAmountPaise: processedFees.netDisbursedAmountPaise,
  };
}
