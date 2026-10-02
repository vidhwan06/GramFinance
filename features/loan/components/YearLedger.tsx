'use client';

import React, { useMemo, useState } from 'react';
import { EngineLoanResult } from '../engine/types';
import { formatPaiseINR } from '../engine/utils/money';
import { getYearSummaries } from '../presentation/year-summary';
import { pageCopy } from '../presentation/dictionary';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { Button } from '@/components/ui/Button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { AmortizationTable } from './AmortizationTable';

export interface YearLedgerProps {
  engineResult: EngineLoanResult;
}

/**
 * The year ledger — engine rows grouped into 12-month blocks.
 *
 * Every figure is a sum of `AmortizationRow` values the engine already
 * produced; nothing is recalculated here. The month-by-month schedule sits
 * beneath it for anyone who wants the detail.
 */
export function YearLedger({ engineResult }: YearLedgerProps) {
  const { language } = useLanguage();
  const kn = language === 'kn';
  const c = pageCopy[kn ? 'kn' : 'en'];
  const [showSchedule, setShowSchedule] = useState(false);

  const years = useMemo(
    () => getYearSummaries(engineResult.schedule),
    [engineResult.schedule]
  );

  return (
    <section
      className="w-full py-space-xl border-b border-outline-variant/40"
      aria-labelledby="loan-ledger-heading"
    >
      <div className="max-w-[1440px] mx-auto px-margin-mobile lg:px-margin">
        <div className="max-w-3xl mb-space-lg">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-semibold">
            {c.ledgerEyebrow}
          </span>
          <h2
            id="loan-ledger-heading"
            className="font-headline-lg text-headline-lg text-on-surface mt-1"
          >
            {c.ledgerTitle}
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2 leading-relaxed">
            {c.ledgerLead}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-space-lg">
          {years.map((y) => (
            <article
              key={y.year}
              className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm"
            >
              <div className="flex items-baseline justify-between gap-2 mb-3">
                <h3 className="font-title-md text-title-md text-on-surface">
                  {c.yearLabel(y.year)}
                </h3>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  {c.monthsRange(y.monthFrom, y.monthTo)}
                </span>
              </div>

              <dl className="space-y-2 font-body-sm text-body-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-on-surface-variant">{c.openingBalance}</dt>
                  <dd className="font-semibold tabular-nums text-on-surface">
                    {formatPaiseINR(y.openingBalancePaise)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-on-surface-variant">{c.principalPaid}</dt>
                  <dd className="font-semibold tabular-nums text-on-surface">
                    {formatPaiseINR(y.principalPaidPaise)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-on-surface-variant">{c.interestPaid}</dt>
                  <dd className="font-semibold tabular-nums text-error">
                    {formatPaiseINR(y.interestPaidPaise)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 border-t border-outline-variant pt-2">
                  <dt className="text-on-surface-variant">{c.endingBalance}</dt>
                  <dd className="font-semibold tabular-nums text-on-surface">
                    {formatPaiseINR(y.closingBalancePaise)}
                  </dd>
                </div>
              </dl>

              {/* Split bar — principal vs interest for the year. Values are
                  repeated as text above, so colour is never the only signal. */}
              {y.totalPaidPaise > 0 && (
                <div className="mt-3">
                  <div
                    className="flex h-2 w-full overflow-hidden rounded-full bg-surface-container-highest"
                    role="img"
                    aria-label={`${c.principalPaid} ${y.principalPercent}%, ${c.interestPaid} ${y.interestPercent}%`}
                  >
                    <span
                      className="h-full bg-secondary"
                      style={{ width: `${y.principalPercent}%` }}
                    />
                    <span
                      className="h-full bg-coral"
                      style={{ width: `${y.interestPercent}%` }}
                    />
                  </div>
                  <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">
                    {c.principalPaid} {y.principalPercent}% · {c.interestPaid} {y.interestPercent}%
                  </p>
                </div>
              )}
            </article>
          ))}
        </div>

        <p className="font-label-sm text-label-sm text-on-surface-variant mb-4">{c.localNote}</p>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSchedule((v) => !v)}
          aria-expanded={showSchedule}
          aria-controls="amortization-section"
          className="flex items-center space-x-1"
        >
          <span>
            {kn
              ? showSchedule
                ? 'ವೇಳಾಪಟ್ಟಿ ಮರೆಮಾಡಿ'
                : 'ಸಂಪೂರ್ಣ ತಿಂಗಳ ಮರುಪಾವತಿ ವೇಳಾಪಟ್ಟಿ ವೀಕ್ಷಿಸಿ'
              : showSchedule
                ? 'Hide month-by-month schedule'
                : 'View month-by-month schedule'}
          </span>
          {showSchedule ? (
            <ChevronUp className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          )}
        </Button>

        {showSchedule && (
          <div id="amortization-section" className="mt-4">
            <AmortizationTable schedule={engineResult.schedule} />
          </div>
        )}
      </div>
    </section>
  );
}
