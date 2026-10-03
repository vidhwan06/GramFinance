'use client';

import React, { useState } from 'react';
import { AlertTriangle, ArrowDownRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatPaiseINR } from '../../engine/utils/money';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { existingLoanCopy } from '../copy';
import { ExistingLoanStatus } from '../types';

/**
 * The status snapshot for a running loan.
 *
 * ── Reading order is the point ───────────────────────────────────────────────
 * progress → outstanding principal → EMI/remaining EMIs → breakdown. That is the
 * order of the questions someone actually has about a loan they already hold,
 * and it is why the outstanding principal is the single largest element on the
 * page rather than one of a dozen equal figures.
 *
 * ── The disclaimer is inside this component, not after it ───────────────────
 * It renders immediately below the breakdown, inside the same visual group, so
 * an estimate can never be read as an authoritative balance by someone who
 * scroll past the rest of the page.
 */

/** A single label/value pair. */
function Stat({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="rounded-lg border border-outline-variant/50 bg-surface-container-lowest p-3">
      <p className="font-label-sm text-label-sm uppercase tracking-wide text-on-surface-variant">{label}</p>
      <p
        className={
          emphasis
            ? 'mt-1 font-headline-sm text-headline-sm text-on-surface'
            : 'mt-1 font-title-lg text-title-lg text-on-surface'
        }
      >
        {value}
      </p>
    </div>
  );
}

interface ExistingLoanStatusProps {
  status: ExistingLoanStatus;
}

export function ExistingLoanStatusCard({ status }: ExistingLoanStatusProps) {
  const { language } = useLanguage();
  const c = existingLoanCopy[language];
  const [showSchedule, setShowSchedule] = useState(false);

  const remainingRows = status.remainingSchedule;

  return (
    <div className="space-y-4">
      {/* ── 1. Progress ── */}
      <div className="rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-title-lg text-title-lg text-on-surface">{c.progressTitle}</h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant tabular-nums">
            {c.progressOf
              .replace('{paid}', String(status.emisPaid))
              .replace('{total}', String(status.originalTenureMonths))}
          </p>
        </div>

        <div
          role="progressbar"
          aria-valuenow={status.progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={c.progressTitle}
          className="mt-3 h-3 w-full overflow-hidden rounded-full bg-surface-container-highest"
        >
          <div
            className="h-full rounded-full bg-secondary motion-safe:transition-all motion-safe:duration-300"
            style={{ width: `${status.progressPercent}%` }}
          />
        </div>
        <p className="mt-1 font-body-sm text-body-sm font-semibold text-secondary tabular-nums">
          {status.progressPercent}%
        </p>
      </div>

      {/* ── 2. Outstanding principal: the headline number ── */}
      <div className="rounded-xl border-2 border-secondary/40 bg-secondary/5 p-4 sm:p-5">
        <p className="font-label-sm text-label-sm uppercase tracking-widest text-secondary">
          {c.statusEyebrow}
        </p>
        <p className="mt-1 font-label-md text-label-md uppercase tracking-wide text-on-surface-variant">
          {c.outstandingLabel}
        </p>
        <p className="mt-1 font-headline-lg text-headline-lg text-on-surface tabular-nums">
          {formatPaiseINR(status.outstandingPrincipalPaise)}
        </p>
        <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">{c.outstandingCaption}</p>
      </div>

      {/* ── Completed state ── */}
      {status.isCompleted && (
        <div className="rounded-xl border border-secondary/40 bg-secondary/5 p-4">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-secondary" aria-hidden="true" />
            <div>
              <h3 className="font-title-lg text-title-lg text-on-surface">{c.completedTitle}</h3>
              <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">{c.completedBody}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. EMI / remaining EMIs ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat label={c.emiCurrentLabel} value={formatPaiseINR(status.effectiveEmiPaise)} />
        <Stat label={c.emisRemainingLabel} value={String(status.emisRemaining)} />
        <Stat label={c.rateCurrentLabel} value={`${status.annualInterestRate}%`} />
      </div>

      {/* ── 4. Remaining breakdown ── */}
      <div className="rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-4">
        <h3 className="font-title-lg text-title-lg text-on-surface">{c.breakdownTitle}</h3>
        <dl className="mt-3 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <dt className="font-body-md text-body-md text-on-surface-variant">{c.breakdownPrincipal}</dt>
            <dd className="font-body-md text-body-md font-semibold text-on-surface tabular-nums">
              {formatPaiseINR(status.outstandingPrincipalPaise)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="font-body-md text-body-md text-on-surface-variant">{c.breakdownInterest}</dt>
            <dd className="font-body-md text-body-md font-semibold text-on-surface tabular-nums">
              {formatPaiseINR(status.remainingInterestPaise)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-outline-variant/50 pt-2">
            <dt className="font-body-md text-body-md font-semibold text-on-surface">{c.breakdownTotal}</dt>
            <dd className="font-title-lg text-title-lg font-bold text-on-surface tabular-nums">
              {formatPaiseINR(status.totalRemainingPaymentsPaise)}
            </dd>
          </div>
        </dl>
      </div>

      {/* ── EMI consistency ── */}
      {status.emiConsistency === 'derived' && (
        <p className="flex items-start gap-2 font-body-sm text-body-sm text-on-surface-variant">
          <ArrowDownRight className="mt-0.5 h-4 w-4 shrink-0 text-secondary" aria-hidden="true" />
          <span>{c.emiDerivedNote}</span>
        </p>
      )}
      {status.emiConsistency === 'matches' && (
        <p className="flex items-start gap-2 font-body-sm text-body-sm text-on-surface-variant">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-secondary" aria-hidden="true" />
          <span>{c.emiMatchesNote}</span>
        </p>
      )}
      {status.emiConsistency === 'differs' && (
        <div
          role="alert"
          className="rounded-xl border border-warning-500/60 bg-warning-50 p-4"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning-700" aria-hidden="true" />
            <div>
              <h3 className="font-title-md text-title-md text-on-surface">{c.emiDiffersTitle}</h3>
              <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                {c.emiDiffersBody}
              </p>
              <p className="mt-2 font-body-sm text-body-sm font-semibold text-on-surface tabular-nums">
                {c.emiCurrentLabel}: {formatPaiseINR(status.effectiveEmiPaise)} →{' '}
                {formatPaiseINR(status.standardEmiPaise)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── 5. Collapsible schedule ── */}
      {remainingRows.length > 0 && (
        <div className="rounded-xl border border-outline-variant/60 bg-surface-container-lowest">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <h3 className="font-title-md text-title-md text-on-surface">{c.scheduleTitle}</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">{c.scheduleNote}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSchedule((previous) => !previous)}
              aria-expanded={showSchedule}
              aria-controls="existing-loan-schedule"
            >
              {showSchedule ? c.scheduleToggleClose : c.scheduleToggleOpen}
            </Button>
          </div>

          {showSchedule && (
            <div id="existing-loan-schedule" className="border-t border-outline-variant/50">
              {/* Desktop: a real table. Mobile: stacked cards, so a long schedule
                  never becomes a horizontal scroll on a 390px screen. */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <caption className="sr-only">{c.scheduleTitle}</caption>
                  <thead>
                    <tr className="border-b border-outline-variant/50">
                      <th scope="col" className="px-4 py-2 font-label-sm text-label-sm uppercase tracking-wide text-on-surface-variant">
                        {c.scheduleEmi}
                      </th>
                      <th scope="col" className="px-4 py-2 font-label-sm text-label-sm uppercase tracking-wide text-on-surface-variant">
                        {c.schedulePrincipal}
                      </th>
                      <th scope="col" className="px-4 py-2 font-label-sm text-label-sm uppercase tracking-wide text-on-surface-variant">
                        {c.scheduleInterest}
                      </th>
                      <th scope="col" className="px-4 py-2 font-label-sm text-label-sm uppercase tracking-wide text-on-surface-variant">
                        {c.scheduleBalance}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {remainingRows.map((row) => (
                      <tr key={row.remainingEmiNumber} className="border-b border-outline-variant/30 last:border-b-0">
                        <td className="px-4 py-2 font-body-sm text-body-sm text-on-surface tabular-nums">
                          {c.scheduleRemainingOf
                            .replace('{n}', String(row.remainingEmiNumber))
                            .replace('{total}', String(remainingRows.length))}
                        </td>
                        <td className="px-4 py-2 font-body-sm text-body-sm text-on-surface tabular-nums">
                          {formatPaiseINR(row.principalPaise)}
                        </td>
                        <td className="px-4 py-2 font-body-sm text-body-sm text-on-surface tabular-nums">
                          {formatPaiseINR(row.interestPaise)}
                        </td>
                        <td className="px-4 py-2 font-body-sm text-body-sm text-on-surface tabular-nums">
                          {formatPaiseINR(row.closingBalancePaise)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="sm:hidden divide-y divide-outline-variant/30">
                {remainingRows.map((row) => (
                  <li key={row.remainingEmiNumber} className="p-4 space-y-1">
                    <p className="font-label-sm text-label-sm uppercase tracking-wide text-on-surface-variant">
                      {c.scheduleRemainingOf
                        .replace('{n}', String(row.remainingEmiNumber))
                        .replace('{total}', String(remainingRows.length))}
                    </p>
                    <p className="font-body-sm text-body-sm text-on-surface tabular-nums">
                      {c.schedulePrincipal}: {formatPaiseINR(row.principalPaise)} ·{' '}
                      {c.scheduleInterest}: {formatPaiseINR(row.interestPaise)}
                    </p>
                    <p className="font-body-sm text-body-sm font-semibold text-on-surface tabular-nums">
                      {c.scheduleBalance}: {formatPaiseINR(row.closingBalancePaise)}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ── 6. What this mode does not cover ── */}
      <div className="rounded-xl border border-outline-variant/60 bg-surface-container-low p-4">
        <h3 className="font-title-md text-title-md text-on-surface">{c.unsupportedTitle}</h3>
        <ul className="mt-2 space-y-2">
          {[c.unsupportedPrepayment, c.unsupportedFlatRate].map((line) => (
            <li key={line} className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-600" aria-hidden="true" />
              <span className="font-body-sm text-body-sm leading-relaxed text-on-surface-variant">
                {line}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* ── 7. The disclaimer, immediately after the numbers ── */}
      <div className="rounded-xl border-2 border-warning-500/60 bg-warning-50 p-4">
        <h3 className="font-title-md text-title-md text-on-surface">{c.disclaimerTitle}</h3>
        <p className="mt-1 font-body-sm text-body-sm leading-relaxed text-on-surface">
          {c.disclaimerBody}
        </p>
        <p className="mt-2 font-body-sm text-body-sm text-on-surface-variant">{c.privacyNote}</p>
      </div>
    </div>
  );
}