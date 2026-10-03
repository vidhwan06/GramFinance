'use client';

import React from 'react';
import { MessageSquareQuote, Star } from 'lucide-react';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { adminFeedbackCopy } from './presentation/copy';
import type { AdminFeedbackStats } from './types';

/**
 * Summary statistics for the dashboard.
 *
 * ── Three numbers, not a dashboard ──────────────────────────────────────────
 * The brief for an admin opening this page is to answer "how are people finding
 * the app, and is anything obviously broken" in a few seconds. Three figures do
 * that; a wall of charts would obscure them.
 *
 * ── Colour is never the only signal ──────────────────────────────────────────
 * The distribution bars are teal for every row, not a red-to-green scale. A
 * traffic-light gradient would imply that 1 star is "bad" in a way the data
 * cannot support — one person rating 1 out of 500 is not the same problem as
 * half the table rating 1. Colouring by value would encode that judgement into
 * the chart. The bar length carries the quantity; the number beside it carries it
 * exactly. Each row is also labelled for a screen reader, so the bar is a
 * reinforcement rather than the only representation.
 */

interface SummaryCardsProps {
  stats: AdminFeedbackStats;
}

export function FeedbackSummary({ stats }: SummaryCardsProps) {
  const { language } = useLanguage();
  const copy = adminFeedbackCopy[language];

  const maxCount = Math.max(1, ...(Object.values(stats.distribution) as number[]));
  const rated = (Object.keys(stats.distribution) as Array<keyof typeof stats.distribution>)
    .map(Number)
    .reduce((sum, rating) => sum + stats.distribution[String(rating) as keyof typeof stats.distribution], 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-rule bg-white p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-ink">
            {copy.totalSubmissions}
          </p>
          <p className="mt-1 text-3xl font-bold text-ink">{stats.total}</p>
        </div>

        <div className="rounded-xl border border-rule bg-white p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-ink">
            {copy.averageRating}
          </p>
          <p className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-ink">
              {stats.averageRating === null ? '—' : stats.averageRating.toFixed(2)}
            </span>
            {stats.averageRating !== null && (
              <span className="text-sm text-muted-ink">{copy.outOfFive}</span>
            )}
          </p>
          {stats.averageRating === null && (
            <p className="mt-1 text-sm text-muted-ink">{copy.noAverageYet}</p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-rule bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-muted-ink">
          {copy.distributionTitle}
        </h2>
        <ul className="space-y-2">
          {([5, 4, 3, 2, 1] as const).map((rating) => {
            const count = stats.distribution[String(rating) as keyof typeof stats.distribution];
            const percent = rated === 0 ? 0 : Math.round((count / rated) * 100);

            return (
              <li
                key={rating}
                className="flex items-center gap-3"
                aria-label={copy.distributionRowLabel
                  .replace('{count}', String(count))
                  .replace('{total}', String(rated))
                  .replace('{rating}', String(rating))}
              >
                <span className="flex w-12 shrink-0 items-center gap-1 text-sm font-semibold text-ink">
                  <Star className="h-4 w-4 text-warning-600" aria-hidden="true" />
                  {rating}
                </span>
                <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-stone">
                  <span
                    className="block h-full rounded-full bg-deep-teal"
                    style={{ width: `${(count / maxCount) * 100}%` }}
                  />
                </span>
                <span className="w-16 shrink-0 text-right text-sm tabular-nums text-muted-ink">
                  {count} ({percent}%)
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/** Empty state. Says plainly that there is nothing, rather than showing zeroes. */
export function FeedbackEmptyState() {
  const { language } = useLanguage();
  const copy = adminFeedbackCopy[language];

  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-rule bg-white px-4 py-12 text-center">
      <MessageSquareQuote className="h-8 w-8 text-muted-ink" aria-hidden="true" />
      <h2 className="text-lg font-bold text-ink">{copy.emptyTitle}</h2>
      <p className="max-w-md text-sm leading-relaxed text-muted-ink">{copy.emptyBody}</p>
    </div>
  );
}