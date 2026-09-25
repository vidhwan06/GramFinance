import { LoanConfig, EngineLoanResult } from '../types';
import { runLoanPipeline } from '../pipeline';

export interface ComparisonField<T> {
  optionA: T;
  optionB: T;
  difference: number;
}

export interface LoanComparisonResult {
  optionA: EngineLoanResult;
  optionB: EngineLoanResult;
  comparison: {
    principalPaise: ComparisonField<number>;
    initialEmiPaise: ComparisonField<number>;
    netDisbursedAmountPaise: ComparisonField<number>;
    totalInterestPaise: ComparisonField<number>;
    totalFeesPaise: ComparisonField<number>;
    totalRepaymentPaise: ComparisonField<number>;
    totalCostPaise: ComparisonField<number>;
    totalCashOutflowPaise: ComparisonField<number>;
    tenureMonths: ComparisonField<number>;
  };
}

export function compareLoans(configA: LoanConfig, configB: LoanConfig): LoanComparisonResult {
  const resultA = runLoanPipeline(configA);
  const resultB = runLoanPipeline(configB);

  const makeField = (a: number, b: number): ComparisonField<number> => ({
    optionA: a,
    optionB: b,
    difference: b - a,
  });

  return {
    optionA: resultA,
    optionB: resultB,
    comparison: {
      principalPaise: makeField(resultA.basePrincipalPaise, resultB.basePrincipalPaise),
      initialEmiPaise: makeField(resultA.initialMonthlyEmiPaise, resultB.initialMonthlyEmiPaise),
      netDisbursedAmountPaise: makeField(resultA.netDisbursedAmountPaise, resultB.netDisbursedAmountPaise),
      totalInterestPaise: makeField(resultA.totalInterestPaise, resultB.totalInterestPaise),
      totalFeesPaise: makeField(resultA.totalFeesPaise, resultB.totalFeesPaise),
      totalRepaymentPaise: makeField(resultA.totalRepaymentPaise, resultB.totalRepaymentPaise),
      totalCostPaise: makeField(resultA.totalCostPaise, resultB.totalCostPaise),
      totalCashOutflowPaise: makeField(resultA.totalCashOutflowPaise, resultB.totalCashOutflowPaise),
      tenureMonths: makeField(resultA.schedule.actualTenureMonths, resultB.schedule.actualTenureMonths),
    },
  };
}
