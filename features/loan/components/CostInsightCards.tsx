'use client';

import React from 'react';
import { EngineLoanResult } from '../engine/types';
import { formatPaiseINR, toPaise } from '../engine/utils/money';
import { getEarlyInterestShare, percentOf } from '../presentation/year-summary';
import { pageCopy } from '../presentation/dictionary';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { Hourglass, IndianRupee, TrendingUp } from 'lucide-react';

export interface CostInsightCardsProps {
  engineResult: EngineLoanResult;
}

/**
 * Clearly-labelled educational figures, used only when the borrower has not
 * entered a fee themselves. They are examples, never presented as the user's
 * own loan.
 */
const EXAMPLE_BORROWED = toPaise(100_000);
const EXAMPLE_DEDUCTED = toPaise(2_000);

interface InsightCardProps {
  icon: React.ElementType;
  iconTone: string;
  title: string;
  body: React.ReactNode;
  footnoteLabel: string;
  footnoteText: string;
  extra?: React.ReactNode;
}

function InsightCard({
  icon: Icon,
  iconTone,
  title,
  body,
  footnoteLabel,
  footnoteText,
  extra,
}: InsightCardProps) {
  return (
    <article className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm flex flex-col justify-between">
      <div className="space-y-3">
        <div
          className={`w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center ${iconTone}`}
          aria-hidden="true"
        >
          <Icon className="h-6 w-6" />
        </div>
        <h3 className="font-title-lg text-title-lg text-on-surface">{title}</h3>
        <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">{body}</p>
        {extra}
      </div>
      <div className="mt-6 pt-4 bg-surface-container p-3 rounded-lg">
        <span className="font-label-sm text-label-sm text-on-surface-variant uppercase block mb-1">
          {footnoteLabel}
        </span>
        <span className="font-body-sm text-body-sm text-on-surface font-semibold">
          {footnoteText}
        </span>
      </div>
    </article>
  );
}

/**
 * "Here is what a low EMI quietly hides" — three educational cards.
 *
 * Every rupee figure is read from the engine result for the borrower's own
 * inputs; the only exception is the clearly-labelled example on the deduction
 * card, shown when no fee has been entered yet.
 */
export function CostInsightCards({ engineResult }: CostInsightCardsProps) {
  const { language } = useLanguage();
  const kn = language === 'kn';
  const c = pageCopy[kn ? 'kn' : 'en'];

  const months = engineResult.schedule.actualTenureMonths;
  const principalStr = formatPaiseINR(engineResult.basePrincipalPaise);
  const interestStr = formatPaiseINR(engineResult.totalInterestPaise);
  const interestPct = percentOf(engineResult.totalInterestPaise, engineResult.basePrincipalPaise);

  // Upfront deduction card — three honest states.
  const isDeductedAtSource =
    engineResult.netDisbursedAmountPaise !== engineResult.basePrincipalPaise;
  let deductionBody: React.ReactNode;
  let deductionExtra: React.ReactNode;

  if (isDeductedAtSource) {
    deductionBody = c.deductionBodyDeducted(
      formatPaiseINR(engineResult.netDisbursedAmountPaise),
      principalStr
    );
  } else if (engineResult.totalFeesPaise > 0) {
    deductionBody = c.deductionBodyCharges(formatPaiseINR(engineResult.totalFeesPaise));
  } else {
    deductionBody = c.deductionBodyNoFees;
    deductionExtra = (
      <div className="rounded-lg bg-surface-container p-3 space-y-1">
        <span className="font-label-sm text-label-sm text-on-surface-variant uppercase block">
          {c.deductionExampleLabel}
        </span>
        <p className="font-body-sm text-body-sm text-on-surface">
          {c.deductionExample(
            formatPaiseINR(EXAMPLE_DEDUCTED),
            formatPaiseINR(EXAMPLE_BORROWED)
          )}
        </p>
      </div>
    );
  }

  // Front-loaded interest — first instalments of the real schedule.
  const earlyWindow = getEarlyInterestShare(engineResult.schedule, 12);
  const earlyMonths = Math.min(12, engineResult.schedule.rows.length);
  const frontLoadedBody =
    earlyWindow.totalInterestPaise === 0
      ? c.frontLoadedNoInterest
      : c.frontLoadedBody(
          formatPaiseINR(earlyWindow.interestPaise),
          formatPaiseINR(earlyWindow.totalInterestPaise),
          earlyWindow.percent,
          earlyMonths
        );

  return (
    <section
      className="w-full bg-surface-container-low py-space-xl border-b border-outline-variant/40"
      aria-labelledby="loan-insights-heading"
    >
      <div className="max-w-[1440px] mx-auto px-margin-mobile lg:px-margin">
        <div className="max-w-3xl mb-space-lg">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-semibold">
            {c.insightsEyebrow}
          </span>
          <h2
            id="loan-insights-heading"
            className="font-headline-lg text-headline-lg text-on-surface mt-1"
          >
            {c.insightsTitle}
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2 leading-relaxed">
            {c.insightsLead}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-lg">
          <InsightCard
            icon={Hourglass}
            iconTone="text-secondary"
            title={c.tenureTrapTitle}
            body={c.tenureTrapBody(interestStr, months, interestPct, principalStr)}
            footnoteLabel={c.ruleLabel}
            footnoteText={c.ruleTenure}
          />

          <InsightCard
            icon={IndianRupee}
            iconTone="text-error"
            title={c.deductionTitle}
            body={deductionBody}
            extra={deductionExtra}
            footnoteLabel={c.checkLabel}
            footnoteText={c.checkDeduction}
          />

          <InsightCard
            icon={TrendingUp}
            iconTone="text-secondary"
            title={c.frontLoadedTitle}
            body={frontLoadedBody}
            footnoteLabel={c.defenceLabel}
            footnoteText={c.defenceFrontLoaded}
          />
        </div>
      </div>
    </section>
  );
}
