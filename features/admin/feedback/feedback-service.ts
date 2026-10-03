import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import {
  FEEDBACK_PAGE_SIZE_MAX,
  type AdminFeedbackItem,
  type AdminFeedbackPage,
  type RatingDistribution,
} from './types';

/**
 * Reading submitted feedback for the admin dashboard.
 *
 * ── Called only after `requireAdmin()` has succeeded ─────────────────────────
 * This module performs no authorization of its own, by design: keeping the check
 * in one function (`lib/admin/require-admin.ts`) means there is a single answer
 * to "may this caller read admin data", not one per query site. The client passed
 * in is always the anon-key server client carrying the caller's own session, so
 * RLS applies exactly as it does in the browser — migration 031's
 * `feedback_select_admin` policy is what actually permits the rows this returns.
 * There is no service-role client, so an admin read cannot bypass RLS.
 *
 * ── Columns ──────────────────────────────────────────────────────────────────
 * An explicit column list, never `.select('*')`. Two reasons:
 *   * `user_id` must not reach the browser (see types.ts).
 *   * A future column added to the table cannot silently start appearing in an
 *     admin export. Naming the columns is what makes that impossible rather than
 *     merely unlikely.
 */

/** The only feedback columns this feature is allowed to read. */
const ITEM_COLUMNS = 'id, module, rating, comment, created_at' as const;

/** Ratings the dashboard reports a count for. Matches the table's CHECK. */
const RATING_VALUES = [1, 2, 3, 4, 5] as const;

const EMPTY_DISTRIBUTION = (): RatingDistribution => ({ '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 });

/** Maps a database row to the wire shape. Keeps the `user_id` omission enforced. */
function toItem(row: {
  id: string;
  module: string;
  rating: number;
  comment: string | null;
  created_at: string;
}): AdminFeedbackItem {
  return {
    id: row.id,
    module: row.module,
    rating: row.rating,
    comment: row.comment,
    createdAt: row.created_at,
  };
}

/**
 * Reads one page of feedback plus the summary statistics.
 *
 * ── Ordering is deterministic, and that is load-bearing ──────────────────────
 * `created_at DESC, id DESC`. The `id` tiebreak is not decoration: the column
 * defaults to `now()`, so several submissions inside one transaction share a
 * timestamp. Without a unique tiebreak, Postgres is free to return tied rows in
 * any order, which would make a row appear on two pages and silently skip
 * another while paging. With it, the order is total.
 *
 * ── Statistics come from the database, not from the current page ─────────────
 * An average or a distribution computed from the 20 rows on screen would be
 * wrong in a way that looks right — the dashboard would show a healthy 4.8
 * average while the two hundred older one-star submissions went unmentioned.
 * So the counts are exact counts over the whole table.
 *
 * That costs one filtered count per rating value. The alternative — selecting
 * the `rating` column for every row and tallying in JavaScript — would transfer
 * an unbounded number of rows to compute a number, which is both slow and a
 * denial-of-service lever aimed at the administrator. These counts carry no row
 * data (`head: true`), so nothing scales with the table size except the scan.
 * The average is then derived from the distribution, which avoids a separate
 * aggregate query entirely.
 */
export async function loadAdminFeedback(
  supabase: SupabaseClient<Database>,
  query: { page: number; pageSize: number }
): Promise<AdminFeedbackPage> {
  const pageSize = Math.min(Math.max(query.pageSize, 1), FEEDBACK_PAGE_SIZE_MAX);
  const from = (query.page - 1) * pageSize;

  const itemsQuery = supabase
    .from('feedback')
    .select(ITEM_COLUMNS, { count: 'exact' })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(from, from + pageSize - 1);

  const countQueries = RATING_VALUES.map((rating) =>
    supabase.from('feedback').select('rating', { count: 'exact', head: true }).eq('rating', rating)
  );

  const [itemsResult, ...countResults] = await Promise.all([
    itemsQuery,
    ...countQueries,
  ]);

  if (itemsResult.error) {
    // Only the code is logged. The message can name the table, the column and
    // the constraint, which is schema disclosure and tells a caller nothing
    // actionable.
    console.error('[admin] feedback page query failed', { code: itemsResult.error.code });
    throw new Error('Failed to load feedback.');
  }

  const failedCount = countResults.find((result) => result.error);
  if (failedCount) {
    console.error('[admin] feedback stats query failed', { code: failedCount.error?.code });
    throw new Error('Failed to load feedback statistics.');
  }

  const distribution = EMPTY_DISTRIBUTION();
  let weightedSum = 0;

  RATING_VALUES.forEach((rating, index) => {
    const count = countResults[index].count ?? 0;
    distribution[String(rating) as keyof RatingDistribution] = count;
    weightedSum += rating * count;
  });

  const totalItems = itemsResult.count ?? 0;
  const total = RATING_VALUES.reduce((sum, rating) => sum + distribution[String(rating) as keyof RatingDistribution], 0);

  return {
    items: (itemsResult.data ?? []).map(toItem),
    stats: {
      total,
      // Null rather than 0 when there is nothing to average: "no ratings yet"
      // and "an average rating of zero" are different facts, and showing 0 for
      // an empty table would read as terrible feedback.
      averageRating: total > 0 ? Number((weightedSum / total).toFixed(2)) : null,
      distribution,
    },
    pagination: {
      page: query.page,
      pageSize,
      totalItems,
      totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize),
      hasPrevious: query.page > 1,
      // Derived from the exact count, not from whether this page came back full,
      // so a trailing empty page is not reported as another page of results.
      hasNext: from + pageSize < totalItems,
    },
  };
}