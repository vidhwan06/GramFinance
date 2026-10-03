'use client';

import React from 'react';
import { Star } from 'lucide-react';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { adminFeedbackCopy } from './presentation/copy';
import type { AdminFeedbackItem } from './types';

/**
 * The feedback list.
 *
 * ── One list, not a table plus cards ─────────────────────────────────────────
 * The obvious approach — a `<table>` for desktop and a card list for mobile, both
 * rendered and toggled with CSS — was written first and thrown away. It renders
 * the DOM twice: every message, up to 1000 characters each, is present twice and
 * only one copy is visible. That is dead weight in the payload, and it means the
 * "which one does a screen reader read" question has to be answered by trusting
 * that `display: none` is honoured everywhere. A jsdom test caught it by finding
 * two copies of every row.
 *
 * So there is a single list, and the layout changes with CSS rather than with a
 * second render. On desktop the rows are a grid with labelled columns; on mobile
 * the same rows stack. Column headings are rendered once, and hidden from the
 * visual flow on mobile where each value carries its own label.
 *
 * ── Messages are shown in full ───────────────────────────────────────────────
 * Comments are capped at 1000 characters by the submission schema, so truncating
 * would hide text an administrator was asked to read. `whitespace-pre-wrap` keeps
 * the author's line breaks, and `break-words` wraps a pasted URL or a long number
 * run instead of letting it widen the page.
 *
 * ── No `user_id` ─────────────────────────────────────────────────────────────
 * Deliberate: see types.ts. The list is fully reviewable without it.
 */

/** Locale-aware date and time. An unparseable value renders as a dash. */
function formatTimestamp(value: string, language: 'en' | 'kn'): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleString(language === 'kn' ? 'kn-IN' : 'en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function RatingBadge({ rating, language }: { rating: number; language: 'en' | 'kn' }) {
  const copy = adminFeedbackCopy[language];
  return (
    <span
      className="inline-flex items-center gap-1 rounded border border-rule bg-surface-container-low px-2 py-0.5 text-sm font-semibold tabular-nums text-ink"
      aria-label={copy.ratingLabel.replace('{rating}', String(rating))}
    >
      <Star className="h-3.5 w-3.5 text-warning-600" aria-hidden="true" />
      {rating}
    </span>
  );
}

function ModuleTag({ module }: { module: string }) {
  return (
    <span className="inline-block rounded border border-deep-teal/30 bg-deep-teal/10 px-2 py-0.5 text-xs font-semibold text-deep-teal">
      {module}
    </span>
  );
}

interface FeedbackListProps {
  items: AdminFeedbackItem[];
}

export function FeedbackList({ items }: FeedbackListProps) {
  const { language } = useLanguage();
  const copy = adminFeedbackCopy[language];

  return (
    <div className="space-y-2">
      {/* Column headings: layout-only, so they are hidden from assistive tech.
          Each value below carries its own visible label instead, which is what
          makes the stacked mobile layout readable without them. */}
      <div
        aria-hidden="true"
        className="hidden gap-3 px-3 pb-1 text-xs font-bold uppercase tracking-wide text-muted-ink md:grid md:grid-cols-[4rem_minmax(0,1fr)_7rem_9rem]"
      >
        <span>{copy.columnRating}</span>
        <span>{copy.columnMessage}</span>
        <span>{copy.columnModule}</span>
        <span>{copy.columnDate}</span>
      </div>

      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="rounded-xl border border-rule bg-white p-3 shadow-sm md:grid md:grid-cols-[4rem_minmax(0,1fr)_7rem_9rem] md:items-start md:gap-3"
          >
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 md:mb-0 md:block">
              <RatingBadge rating={item.rating} language={language} />
              {/* On mobile the module belongs in the header line; on desktop it has
                  its own column below. Shown once, never twice. */}
              <span className="md:hidden">
                <ModuleTag module={item.module} />
              </span>
            </div>

            <p className="text-sm leading-6 text-ink">
              {item.comment ? (
                <span className="whitespace-pre-wrap break-words">{item.comment}</span>
              ) : (
                <span className="text-muted-ink italic">{copy.noComment}</span>
              )}
            </p>

            <div className="mt-2 md:mt-0">
              <span className="hidden md:inline-block">
                <ModuleTag module={item.module} />
              </span>
            </div>

            <p className="mt-2 text-xs text-muted-ink md:mt-0 md:whitespace-nowrap md:text-sm">
              {formatTimestamp(item.createdAt, language)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface FeedbackPaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

/**
 * Pagination controls.
 *
 * Rendered only when there is more than one page, and both controls are real
 * `<button>`s rather than links, so the current page does not enter browser
 * history and there is no URL to share that might outlive the session.
 *
 * The position is a live region, because paging changes the visible content
 * without moving focus.
 */
export function FeedbackPagination({ page, totalPages, onChange }: FeedbackPaginationProps) {
  const { language } = useLanguage();
  const copy = adminFeedbackCopy[language];

  if (totalPages <= 1) return null;

  const control =
    'inline-flex min-h-[44px] items-center justify-center rounded-lg border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-teal focus-visible:ring-offset-2 disabled:opacity-50 motion-reduce:transition-none';

  return (
    <nav
      aria-label={copy.listTitle}
      className="flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-4"
    >
      <button
        type="button"
        className={`${control} border-rule bg-white text-ink hover:bg-surface-container-low`}
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
      >
        {copy.previous}
      </button>

      <p aria-live="polite" className="text-sm font-semibold text-muted-ink">
        {copy.pageOf.replace('{page}', String(page)).replace('{total}', String(totalPages))}
      </p>

      <button
        type="button"
        className={`${control} border-deep-teal bg-deep-teal text-warm-ivory hover:bg-deep-teal/90`}
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
      >
        {copy.next}
      </button>
    </nav>
  );
}