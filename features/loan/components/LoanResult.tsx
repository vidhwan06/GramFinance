'use client';

import React from 'react';
import { EngineLoanResult } from '../engine/types';
import { V2LoanInputState } from '../hooks/useLoanCalculator';
import { formatPaiseINR } from '../engine/utils/money';
import { getCostBreakdown, CostSegment } from '../presentation/cost-breakdown';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { getInterestMethodCopy, pageCopy, LoanPageCopy } from '../presentation/dictionary';
import { PlainLanguageSummary } from '../presentation/plain-language';
import { Repeat, Info } from 'lucide-react';

export interface LoanResultProps {
  inputState: V2LoanInputState;
  engineResult: EngineLoanResult;
  bilingualSummary: PlainLanguageSummary;
}

/** Segment colours on the aubergine card. Text always repeats the value. */
const SEGMENT_STYLE: Record<CostSegment['key'], { bar: string; dot: string; text: string }> = {
  principal: { bar: 'bg-secondary-fixed', dot: 'bg-secondary-fixed', text: 'text-secondary-fixed' },
  interest: { bar: 'bg-tertiary-fixed', dot: 'bg-tertiary-fixed', text: 'text-tertiary-fixed' },
  upfrontFees: { bar: 'bg-coral', dot: 'bg-coral', text: 'text-error-container' },
};

function segmentLabel(key: CostSegment['key'], copy: LoanPageCopy): string {
  if (key === 'principal') return copy.legendPrincipal;
  if (key === 'interest') return copy.legendInterest;
  return copy.legendCharges;
}

/**
 * Rupees handed back to the lender for every ₹100 borrowed, expressed in
 * integer paise so the figure can be formatted with `formatPaiseINR`.
 *
 * Example: borrowing ₹1,50,000 and repaying ₹1,77,500 → 11833 → ₹118.33.
 */
function costRatioPaise(result: EngineLoanResult): number {
  if (result.basePrincipalPaise <= 0) return 0;
  return Math.round((result.totalCashOutflowPaise * 100) / result.basePrincipalPaise);
}

function tenureYearsText(months: number): string {
  const years = months / 12;
  return Number.isInteger(years) ? String(years) : String(Math.round(years * 10) / 10);
}

export function LoanResult({ inputState, engineResult, bilingualSummary }: LoanResultProps) {
  const { language } = useLanguage();
  const kn = language === 'kn';
  const c = pageCopy[kn ? 'kn' : 'en'];

  const method = getInterestMethodCopy(inputState.interestMethod, language);
  const { segments, totalPaise } = getCostBreakdown(engineResult);
  const tenureMonths = engineResult.schedule.actualTenureMonths;
  const ratioPaise = costRatioPaise(engineResult);
  const showDisbursedRow =
    engineResult.netDisbursedAmountPaise !== engineResult.basePrincipalPaise;

  return (
    <div className="flex flex-col gap-space-md animate-fade-in">
      {/* ── Aubergine result card ────────────────────────────────────────── */}
      <div className="bg-primary-container text-inverse-on-surface rounded-2xl p-6 sm:p-8 shadow-md relative overflow-hidden">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <h3 className="inline-flex items-center gap-2 text-label-sm tracking-widest text-on-primary-container uppercase">
            <span className="w-2.5 h-2.5 rounded-full bg-tertiary-fixed" aria-hidden="true" />
            {c.emiEyebrow}
          </h3>
          <span className="px-2 py-0.5 rounded bg-white/10 text-white text-[11px] font-semibold">
            {method.badge}
          </span>
        </div>

        {/* Big figure */}
        <div className="py-2">
          <div className="flex items-baseline gap-1 flex-wrap">
            <span className="font-headline-xl text-headline-xl sm:text-[48px] font-bold text-signature-lime tracking-tight">
              {formatPaiseINR(engineResult.initialMonthlyEmiPaise)}
            </span>
            <span className="text-on-primary-container font-title-md text-title-md">
              / {c.emiPerMonth}
            </span>
          </div>
          <p className="font-body-sm text-body-sm text-inverse-on-surface mt-1">
            {c.emiDuration(tenureMonths, tenureYearsText(tenureMonths))}
          </p>
        </div>

        {/* Proportion bar — exact partition of the cash outflow */}
        {totalPaise > 0 && segments.length > 0 && (
          <div className="mt-6 space-y-2">
            <ul className="flex items-center justify-between gap-2 flex-wrap text-label-sm">
              {segments.map((segment) => (
                <li
                  key={segment.key}
                  className={`inline-flex items-center gap-1.5 ${SEGMENT_STYLE[segment.key].text}`}
                >
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${SEGMENT_STYLE[segment.key].dot}`}
                    aria-hidden="true"
                  />
                  <span>
                    {segmentLabel(segment.key, c)} ({segment.percent}%)
                  </span>
                </li>
              ))}
            </ul>
            <div
              className="w-full h-3 rounded-full bg-black/40 overflow-hidden flex"
              role="img"
              aria-label={segments
                .map((segment) => `${segmentLabel(segment.key, c)} ${segment.percent}%`)
                .join(', ')}
            >
              {segments.map((segment) => (
                <div
                  key={segment.key}
                  className={`h-full transition-all duration-300 ${SEGMENT_STYLE[segment.key].bar}`}
                  style={{ width: `${segment.percent}%` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Metric ledger */}
        <div className="mt-6 pt-6 bg-white/5 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-3 font-body-sm text-body-sm">
            <span className="text-inverse-on-surface">{c.rowLoanAmount}</span>
            <span className="font-semibold text-white">
              {formatPaiseINR(engineResult.basePrincipalPaise)}
            </span>
          </div>
          {showDisbursedRow && (
            <div className="flex items-center justify-between gap-3 font-body-sm text-body-sm">
              <span className="text-inverse-on-surface">{c.rowNetDisbursed}</span>
              <span className="font-semibold text-white">
                {formatPaiseINR(engineResult.netDisbursedAmountPaise)}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between gap-3 font-body-sm text-body-sm">
            <span className="text-inverse-on-surface">{c.rowTotalInterest}</span>
            <span className="font-semibold text-tertiary-fixed">
              {formatPaiseINR(engineResult.totalInterestPaise)}
            </span>
          </div>
          {engineResult.totalFeesPaise > 0 && (
            <div className="flex items-center justify-between gap-3 font-body-sm text-body-sm">
              <span className="text-inverse-on-surface">{c.rowTotalCharges}</span>
              <span className="font-semibold text-white">
                {formatPaiseINR(engineResult.totalFeesPaise)}
              </span>
            </div>
          )}
          <div className="pt-3 bg-white/10 p-3 rounded-lg flex items-center justify-between gap-3 font-title-md text-title-md">
            <span className="text-white">{c.rowTotalOutflow}</span>
            <span className="text-white font-bold">
              {formatPaiseINR(engineResult.totalCashOutflowPaise)}
            </span>
          </div>
        </div>

        {/* True cost ratio */}
        <div className="mt-5 p-3.5 rounded-lg bg-white/10 flex items-start gap-3">
          <Repeat className="text-tertiary-fixed text-[20px] mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div className="flex flex-col">
            <span className="font-label-md text-label-md text-white">{c.ratioTitle}</span>
            <p className="font-body-sm text-body-sm text-inverse-on-surface leading-snug">
              {c.ratioSentence(formatPaiseINR(ratioPaise, true), tenureMonths)}
            </p>
          </div>
        </div>
      </div>

      {/* ── Plain-language explanation ───────────────────────────────────── */}
      <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm space-y-2">
        <div className="flex items-center gap-2 text-on-surface font-title-md text-title-md">
          <Info className="h-5 w-5 text-secondary shrink-0" aria-hidden="true" />
          <h4>{c.plainLanguageTitle}</h4>
        </div>
        <div className="space-y-1.5 text-body-sm text-on-surface-variant leading-relaxed">
          <p>• {bilingualSummary.monthlyText}</p>
          <p>• {bilingualSummary.interestText}</p>
          <p>• {bilingualSummary.totalText}</p>
          {bilingualSummary.disbursementText && <p>• {bilingualSummary.disbursementText}</p>}
        </div>
        <p className="text-label-sm text-on-surface-variant pt-2 border-t border-outline-variant/60">
          {bilingualSummary.estimateDisclaimer}
        </p>
      </div>
    </div>
  );
}
