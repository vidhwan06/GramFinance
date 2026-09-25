import { describe, it, expect } from 'vitest';
import { runLoanPipeline } from '@/features/loan/engine/pipeline';
import { LoanConfig } from '@/features/loan/engine/types';
import { toPaise } from '@/features/loan/engine/utils/money';
import { getCostBreakdown } from '@/features/loan/presentation/cost-breakdown';
import { getInterestMethodCopy } from '@/features/loan/presentation/dictionary';

/**
 * Tests for the costs surfaced by the loan UI.
 *
 * The fee model was fully implemented in the V2 engine but unreachable from the
 * interface, so `totalFeesPaise` was permanently 0 on screen. These tests pin
 * the behaviour the FeeEditor now exposes, plus the cost-ratio partition that
 * the LoanBreakdown legend depends on.
 */

const baseConfig: LoanConfig = {
  principalPaise: toPaise(100_000),
  annualInterestRate: 12,
  tenureMonths: 24,
  interestMethod: 'reducing-balance',
};

describe('Fee types reach the result', () => {
  it('surfaces a single upfront flat fee in totalFeesPaise and cash outflow', () => {
    const result = runLoanPipeline({
      ...baseConfig,
      fees: [{ id: 'f1', name: 'Processing', type: 'upfront-flat', value: 1_000 }],
    });

    expect(result.totalFeesPaise).toBe(toPaise(1_000));
    expect(result.separatelyPaidFeesPaise).toBe(toPaise(1_000));
    expect(result.totalCashOutflowPaise).toBe(
      result.totalRepaymentPaise + result.separatelyPaidFeesPaise
    );
    // Paid on top, so it must not change the loan itself.
    expect(result.startingPrincipalPaise).toBe(baseConfig.principalPaise);
    expect(result.netDisbursedAmountPaise).toBe(baseConfig.principalPaise);
  });

  it('surfaces an upfront percentage fee', () => {
    const result = runLoanPipeline({
      ...baseConfig,
      fees: [{ id: 'f1', name: 'Admin', type: 'upfront-percentage', value: 2 }],
    });

    // 2% of ₹1,00,000
    expect(result.totalFeesPaise).toBe(toPaise(2_000));
    expect(result.separatelyPaidFeesPaise).toBe(toPaise(2_000));
  });

  it('capitalized fees increase what you repay and reduce the net disbursed amount is untouched', () => {
    const result = runLoanPipeline({
      ...baseConfig,
      fees: [{ id: 'f1', name: 'Capitalized', type: 'capitalized', value: 5_000 }],
    });

    expect(result.totalFeesPaise).toBe(toPaise(5_000));
    // Folded into the principal, so it is repaid AND attracts interest.
    expect(result.startingPrincipalPaise).toBe(toPaise(105_000));
    expect(result.separatelyPaidFeesPaise).toBe(0);
    // Not deducted at source, so the borrower still receives the full amount.
    expect(result.netDisbursedAmountPaise).toBe(toPaise(100_000));

    const withFee = result.totalInterestPaise;
    const withoutFee = runLoanPipeline(baseConfig).totalInterestPaise;
    expect(withFee).toBeGreaterThan(withoutFee);
  });

  it('deducted-at-source fees lower the net disbursed amount but not the repayment', () => {
    const result = runLoanPipeline({
      ...baseConfig,
      fees: [{ id: 'f1', name: 'Deduction', type: 'deducted-disbursement', value: 3_000 }],
    });

    expect(result.totalFeesPaise).toBe(toPaise(3_000));
    expect(result.netDisbursedAmountPaise).toBe(toPaise(97_000));
    // Not repaid separately — it simply never arrives.
    expect(result.separatelyPaidFeesPaise).toBe(0);
    expect(result.startingPrincipalPaise).toBe(baseConfig.principalPaise);
  });

  it('handles a mix of all four fee types', () => {
    const result = runLoanPipeline({
      ...baseConfig,
      fees: [
        { id: 'a', name: 'Upfront flat', type: 'upfront-flat', value: 1_000 },
        { id: 'b', name: 'Upfront pct', type: 'upfront-percentage', value: 1 },
        { id: 'c', name: 'Deducted', type: 'deducted-disbursement', value: 2_000 },
        { id: 'd', name: 'Capitalized', type: 'capitalized', value: 3_000 },
      ],
    });

    expect(result.totalFeesPaise).toBe(toPaise(1_000 + 1_000 + 2_000 + 3_000));
    expect(result.separatelyPaidFeesPaise).toBe(toPaise(1_000 + 1_000));
    expect(result.startingPrincipalPaise).toBe(toPaise(103_000));
    expect(result.netDisbursedAmountPaise).toBe(toPaise(98_000));
  });

  it('reports zero fees when none are added', () => {
    const result = runLoanPipeline(baseConfig);

    expect(result.totalFeesPaise).toBe(0);
    expect(result.separatelyPaidFeesPaise).toBe(0);
    expect(result.netDisbursedAmountPaise).toBe(baseConfig.principalPaise);
  });
});

describe('Cost ratio partitions total cash outflow exactly', () => {
  it('sums to the reported total cash outflow', () => {
    const result = runLoanPipeline({
      ...baseConfig,
      fees: [
        { id: 'a', name: 'Upfront', type: 'upfront-flat', value: 1_500 },
        { id: 'b', name: 'Capitalized', type: 'capitalized', value: 2_500 },
      ],
    });

    const { segments, totalPaise } = getCostBreakdown(result);

    expect(totalPaise).toBe(result.totalCashOutflowPaise);
    const summed = segments.reduce((acc, s) => acc + s.amountPaise, 0);
    expect(summed).toBe(totalPaise);
  });

  it('never labels a residual percentage with a different rupee amount', () => {
    // The old implementation printed totalFeesPaise (all four types) beside a
    // percentage that only represented the separately-paid portion. With
    // capitalized + deducted fees the two disagreed visibly.
    const result = runLoanPipeline({
      ...baseConfig,
      fees: [
        { id: 'a', name: 'Upfront', type: 'upfront-flat', value: 1_000 },
        { id: 'b', name: 'Deducted', type: 'deducted-disbursement', value: 4_000 },
        { id: 'c', name: 'Capitalized', type: 'capitalized', value: 6_000 },
      ],
    });

    const { segments } = getCostBreakdown(result);
    const feeSegment = segments.find((s) => s.key === 'upfrontFees');

    // Only the separately-paid fee belongs in the outflow bar...
    expect(feeSegment?.amountPaise).toBe(result.separatelyPaidFeesPaise);
    expect(feeSegment?.amountPaise).toBe(toPaise(1_000));
    // ...not the all-types total.
    expect(feeSegment?.amountPaise).not.toBe(result.totalFeesPaise);
  });

  it('derives the principal segment as repayment minus interest', () => {
    const result = runLoanPipeline({
      ...baseConfig,
      fees: [{ id: 'a', name: 'Capitalized', type: 'capitalized', value: 5_000 }],
    });

    const principal = getCostBreakdown(result).segments.find((s) => s.key === 'principal');

    expect(principal?.amountPaise).toBe(result.totalRepaymentPaise - result.totalInterestPaise);
    // Capitalized fees are repaid, so they sit inside the principal segment.
    expect(principal?.amountPaise).toBe(toPaise(105_000));
  });

  it('omits the fee segment when there are no upfront fees', () => {
    const { segments } = getCostBreakdown(runLoanPipeline(baseConfig));

    expect(segments.map((s) => s.key)).toEqual(['principal', 'interest']);
  });

  it('keeps percentages at or below 100', () => {
    const result = runLoanPipeline({
      ...baseConfig,
      fees: [{ id: 'a', name: 'Upfront', type: 'upfront-flat', value: 9_000 }],
    });

    for (const segment of getCostBreakdown(result).segments) {
      expect(segment.percent).toBeGreaterThanOrEqual(0);
      expect(segment.percent).toBeLessThanOrEqual(100);
    }
  });

  it('returns an empty breakdown rather than dividing by zero', () => {
    const result = runLoanPipeline({ ...baseConfig, tenureMonths: 12 });
    const broken = { ...result, totalCashOutflowPaise: 0 };

    expect(getCostBreakdown(broken)).toEqual({ segments: [], totalPaise: 0 });
  });
});

describe('Interest method copy reflects the selected method', () => {
  it('does not claim reducing balance when flat rate is selected', () => {
    // The original bug: this component took no props and always rendered
    // "Interest calculation: Reducing balance", so a user modelling a flat-rate
    // MFI loan was misinformed about how their own loan was being calculated.
    const flat = getInterestMethodCopy('flat-rate', 'en');
    const reducing = getInterestMethodCopy('reducing-balance', 'en');

    expect(flat.title).toBe('Flat Rate');
    expect(flat.title).not.toBe(reducing.title);
    expect(flat.description).not.toBe(reducing.description);
    expect(flat.description).toMatch(/original base loan amount/i);
    expect(reducing.description).toMatch(/remaining loan balance/i);
  });

  it('does not embed a reducing-balance claim in the flat-rate copy', () => {
    const flatEn = getInterestMethodCopy('flat-rate', 'en');
    const flatKn = getInterestMethodCopy('flat-rate', 'kn');

    expect(flatEn.description.toLowerCase()).not.toContain('remaining loan balance');
    expect(flatEn.badge).not.toMatch(/reducing/i);
    // Both languages must resolve, and must differ from each other.
    expect(flatKn.title).toBeTruthy();
    expect(flatKn.title).not.toBe(flatEn.title);
  });

  it('stays neutral — neither method is presented as recommended', () => {
    const reducing = getInterestMethodCopy('reducing-balance', 'en');
    const flat = getInterestMethodCopy('flat-rate', 'en');

    for (const copy of [reducing, flat]) {
      expect(copy.context.toLowerCase()).not.toMatch(/recommend|best|should choose|ideal/);
      expect(copy.badge).toBe(copy.title);
    }
  });
});
