'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { FeedbackSummary, FeedbackEmptyState } from './FeedbackSummary';
import { FeedbackList, FeedbackPagination } from './FeedbackList';
import { adminFeedbackCopy } from './presentation/copy';
import { AdminFeedbackError, loadAdminFeedbackPage } from './lib/admin-feedback-client';
import { FEEDBACK_PAGE_SIZE_DEFAULT, type AdminFeedbackPage } from './types';

/**
 * The admin feedback dashboard.
 *
 * ── This component is not the security boundary ──────────────────────────────
 * The page that renders it (`app/(main)/admin/feedback/page.tsx`) already checked
 * the administrator server-side and does not render this at all for anyone else.
 * What remains here is presentation plus the data read.
 *
 * That ordering is the point. The client-side handling of a 401 or 403 below is a
 * courtesy for a session that lapsed *while the page is open* — not the protection
 * itself. Mounted for an ordinary user, this would show a refusal, and the rows
 * would still not arrive, because the API and RLS refuse them independently.
 *
 * ── Three states, deliberately distinct ──────────────────────────────────────
 *   loading  a spinner and the word "loading" — never an empty table
 *   error    what failed, plus a retry control
 *   empty    a real empty state, different from "nothing has loaded yet"
 *
 * Folding empty into loading is how a dashboard ends up looking broken, so they
 * are separate branches with separate copy.
 *
 * ── Requests are cancellable, and `attempt` is what makes retry work ─────────
 * Paging and retrying both fire a new request. An AbortController stops a slow
 * earlier response from landing after a later one and overwriting it, which would
 * otherwise show page 1's rows under "Page 2". `attempt` is separate from
 * `pageNumber` precisely because re-setting the same page number would not
 * re-run the effect, and a Retry button that does not retry is worse than none.
 */

type ViewState =
  | { status: 'loading' }
  | { status: 'ready'; page: AdminFeedbackPage }
  | { status: 'error'; message: string };

export function FeedbackDashboard() {
  const { language } = useLanguage();
  const copy = adminFeedbackCopy[language];

  const [state, setState] = useState<ViewState>({ status: 'loading' });
  const [pageNumber, setPageNumber] = useState(1);
  const [attempt, setAttempt] = useState(0);

  const load = useCallback(
    async (page: number, signal: AbortSignal) => {
      try {
        const data = await loadAdminFeedbackPage({
          page,
          pageSize: FEEDBACK_PAGE_SIZE_DEFAULT,
          signal,
        });
        setState({ status: 'ready', page: data });
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;

        if (error instanceof AdminFeedbackError) {
          // The session lapsed or the role changed while the page was open. The
          // server is the authority on that; say so plainly instead of retrying
          // into the same refusal.
          setState({
            status: 'error',
            message:
              error.kind === 'forbidden'
                ? copy.notAdminTitle
                : error.kind === 'unauthorized'
                  ? copy.signedOutTitle
                  : error.message,
          });
          return;
        }
        setState({ status: 'error', message: copy.errorTitle });
      }
    },
    [copy.errorTitle, copy.notAdminTitle, copy.signedOutTitle]
  );

  useEffect(() => {
    const controller = new AbortController();
    // Re-entering the loading state on every page change is deliberate: it stops
    // the previous page's rows from sitting on screen under the new page number
    // while the request is in flight.
    setState({ status: 'loading' });
    void load(pageNumber, controller.signal);
    return () => controller.abort();
  }, [load, pageNumber, attempt]);

  const retry = () => setAttempt((n) => n + 1);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">{copy.pageTitle}</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-ink">{copy.pageLead}</p>
      </header>

      {state.status === 'loading' && (
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col items-center justify-center gap-3 py-16"
        >
          <Spinner size="lg" />
          <p className="text-sm text-muted-ink">{copy.loading}</p>
        </div>
      )}

      {state.status === 'error' && (
        <div className="space-y-3">
          <Alert variant="danger" title={copy.errorTitle}>
            {state.message}
          </Alert>
          <Button variant="outline" onClick={retry}>
            {copy.retry}
          </Button>
        </div>
      )}

      {state.status === 'ready' && (
        <>
          <FeedbackSummary stats={state.page.stats} />

          <section aria-labelledby="admin-feedback-list" className="space-y-3">
            <h2 id="admin-feedback-list" className="text-lg font-bold text-ink">
              {copy.listTitle}
            </h2>

            {state.page.items.length === 0 ? (
              <FeedbackEmptyState />
            ) : (
              <>
                <FeedbackList items={state.page.items} />
                <FeedbackPagination
                  page={state.page.pagination.page}
                  totalPages={state.page.pagination.totalPages}
                  onChange={setPageNumber}
                />
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}