/**
 * Shapes for the admin feedback dashboard.
 *
 * ── `user_id` is deliberately absent ─────────────────────────────────────────
 * The `feedback` table has a `user_id` column and this response does not carry
 * it. That is a decision, not an oversight:
 *
 *   * Nothing in the dashboard needs it. There is no per-user view, no follow-up
 *     flow, and no profile to link to — GramFinance has no profile UI at all.
 *   * A raw auth UUID is a stable pseudonymous identifier. Handing it to a
 *     browser for a list view creates a correlation key that can be exported,
 *     logged or pasted into a spreadsheet, for no benefit.
 *   * The project's own precedent is the session endpoint, which returns the user
 *     id "because it is needed to correlate the session client-side" and nothing
 *     else. There is no such need here.
 *
 * `tests/unit/admin/feedback-service.test.ts` asserts the field never appears in
 * the serialised response, so this cannot quietly regress.
 *
 * If a future feature genuinely needs attribution, the right answer is a purpose
 * built, audited endpoint — not adding the column back to a general list.
 */

/** One feedback row, as shown in the dashboard. */
export interface AdminFeedbackItem {
  id: string;
  /** Which part of the app the feedback came from: 'general' | 'loan' | … */
  module: string;
  /** 1–5, constrained by a CHECK constraint in the database. */
  rating: number;
  /** Free text, or null when the user submitted a rating only. */
  comment: string | null;
  createdAt: string;
}

/** Counts per rating value, keyed "1"–"5". Always all five keys. */
export type RatingDistribution = Record<'1' | '2' | '3' | '4' | '5', number>;

export interface AdminFeedbackStats {
  /** Total submissions ever, across every page. */
  total: number;
  /** Mean rating to two decimals, or null when there is nothing to average. */
  averageRating: number | null;
  distribution: RatingDistribution;
}

export interface AdminFeedbackPagination {
  /** 1-based. */
  page: number;
  pageSize: number;
  totalItems: number;
  /** 0 when there are no rows at all, so the UI can render "page 1 of 0" safely. */
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

/** `data` of the GET /api/admin/feedback response envelope. */
export interface AdminFeedbackPage {
  items: AdminFeedbackItem[];
  stats: AdminFeedbackStats;
  pagination: AdminFeedbackPagination;
}

/**
 * Page-size bounds.
 *
 * The default is what the dashboard asks for on first load. The maximum is a
 * hard cap enforced server-side: a caller cannot ask for the whole table in one
 * response, which is both a denial-of-service lever and a way to pull an
 * unbounded amount of user-submitted text out of the database in one request.
 */
export const FEEDBACK_PAGE_SIZE_DEFAULT = 20;
export const FEEDBACK_PAGE_SIZE_MAX = 100;

/** Query parameters the endpoint accepts. Anything else is rejected. */
export const FEEDBACK_QUERY_KEYS = ['page', 'pageSize'] as const;