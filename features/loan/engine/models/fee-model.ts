import { FeeConfig, FeeBreakdown } from '../types';
import { roundToNearestPaise } from '../utils/rounding';

export interface ProcessedFees {
  basePrincipalPaise: number;
  startingPrincipalPaise: number; // Base + Capitalized Fees
  netDisbursedAmountPaise: number; // Base - Deducted Fees
  separatelyPaidFeesPaise: number; // Upfront Flat + Upfront % Fees
  breakdown: FeeBreakdown;
}

export function processFees(basePrincipalPaise: number, fees: FeeConfig[] = []): ProcessedFees {
  let upfrontFlatFeesPaise = 0;
  let upfrontPercentageFeesPaise = 0;
  let deductedDisbursementFeesPaise = 0;
  let capitalizedFeesPaise = 0;

  fees.forEach((fee) => {
    switch (fee.type) {
      case 'upfront-flat':
        // Value is in INR rupees, convert to paise
        upfrontFlatFeesPaise += roundToNearestPaise(fee.value * 100);
        break;

      case 'upfront-percentage':
        // Value is percentage (e.g. 1.5%)
        upfrontPercentageFeesPaise += roundToNearestPaise(basePrincipalPaise * (fee.value / 100));
        break;

      case 'deducted-disbursement':
        // Value in INR rupees or percentage
        const deductedFeePaise = fee.value <= 100 && fee.value > 0 && Number.isInteger(fee.value) === false
          ? roundToNearestPaise(basePrincipalPaise * (fee.value / 100))
          : roundToNearestPaise(fee.value * 100);
        deductedDisbursementFeesPaise += deductedFeePaise;
        break;

      case 'capitalized':
        // Value in INR rupees or percentage
        const capitalizedFeePaise = fee.value <= 100 && fee.value > 0 && Number.isInteger(fee.value) === false
          ? roundToNearestPaise(basePrincipalPaise * (fee.value / 100))
          : roundToNearestPaise(fee.value * 100);
        capitalizedFeesPaise += capitalizedFeePaise;
        break;

      default:
        break;
    }
  });

  const totalFeesPaise =
    upfrontFlatFeesPaise +
    upfrontPercentageFeesPaise +
    deductedDisbursementFeesPaise +
    capitalizedFeesPaise;

  const startingPrincipalPaise = basePrincipalPaise + capitalizedFeesPaise;
  const netDisbursedAmountPaise = Math.max(0, basePrincipalPaise - deductedDisbursementFeesPaise);
  const separatelyPaidFeesPaise = upfrontFlatFeesPaise + upfrontPercentageFeesPaise;

  return {
    basePrincipalPaise,
    startingPrincipalPaise,
    netDisbursedAmountPaise,
    separatelyPaidFeesPaise,
    breakdown: {
      upfrontFlatFeesPaise,
      upfrontPercentageFeesPaise,
      deductedDisbursementFeesPaise,
      capitalizedFeesPaise,
      totalFeesPaise,
    },
  };
}
