import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api/response';
import { ErrorFactories } from '@/lib/api/errors';
import { checkRateLimit, retryAfterSeconds, ROUTE_LIMITS } from '@/lib/api/rate-limit';
import { requireAdmin } from '@/lib/admin/require-admin';
import { parseAdminFeedbackQuery } from '@/features/admin/feedback/query';
import { loadAdminFeedback } from '@/features/admin/feedback/feedback-service';

/**
 * GET /api/admin/feedback
 *
 * Lists submitted feedback for an administrator. Read-only.
 *
 * ── Authorization ───────────────────────────────────────────────────────────
 * `requireAdmin()` runs first and is the whole gate. It revalidates the session
 * with `getUser()` and then asks the database's own `public.is_admin()` whether
 * that user holds the `admin` role — the mechanism migration 011 created for
 * exactly this and that no client can influence.
 *
 *   401  no valid session
 *   403  signed in, but not an administrator
 *
 * The query is then executed with the caller's own anon-key session, so RLS
 * applies and migration 031's `feedback_select_admin` policy is what actually
 * returns the rows. Hiding the route behind middleware would change nothing: the
 * handler is the only caller of the data, and the policy is in the database.
 *
 * The 401 is checked before the 403 on purpose. A signed-out caller is told that
 * authentication is required and learns nothing about whether an admin area
 * exists, what it contains, or which parameters it takes.
 *
 * ── No service-role key ─────────────────────────────────────────────────────
 * The same anon-key client as every other route. An administrator's read is
 * therefore subject to the same RLS as anyone else's, and there is no code path
 * in this project that can read feedback with RLS switched off.
 *
 * ── Rate limiting ───────────────────────────────────────────────────────────
 * Applied AFTER authorization. The bucket is IP-keyed, so limiting first would
 * hand any anonymous caller the ability to exhaust an administrator's budget for
 * their whole IP — a denial-of-service lever aimed at the only people who can
 * reach this route.
 *
 * ── Input handling ──────────────────────────────────────────────────────────
 * Only `page` and `pageSize` are accepted; any other key is rejected rather than
 * ignored, so a caller is never misled into thinking an unsupported filter was
 * applied. Both are parsed and bounded by `parseAdminFeedbackQuery` before any
 * query is built — the values that reach Supabase are integers inside a known
 * range. There is no parameter through which a caller can choose the columns, the
 * sort order, or a filter on any column.
 *
 * ── Caching ─────────────────────────────────────────────────────────────────
 * Not cacheable, and `Cache-Control: no-store` is set explicitly. This is
 * private, user-submitted content: a shared cache must never retain it, and the
 * default must not be left to a future change in host defaults.
 *
 * ── Error handling ──────────────────────────────────────────────────────────
 * A database failure logs its code server-side and returns a fixed 500 message.
 * The raw Supabase/PostgREST error can name the table, the column and the
 * constraint, which is schema disclosure with no diagnostic value for a caller
 * and an invitation to probe.
 */

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Authorize BEFORE the rate limit and before touching the query string.
    //
    // The order is deliberate. The limiter is IP-keyed, so checking it first
    // would let any anonymous caller spend an administrator's budget for their
    // whole IP — a denial-of-service lever aimed straight at the only people
    // who can use this route. Authorizing first means only real administrators
    // ever consume the bucket. It also means an unauthorized caller is refused
    // before it can learn the parameter surface.
    const { supabase } = await requireAdmin();

    const limit = ROUTE_LIMITS.adminFeedback;
    if (checkRateLimit(request, limit).limited) {
      throw ErrorFactories.rateLimited(
        'Too many requests. Please wait a moment.',
        retryAfterSeconds(request, limit)
      );
    }

    const query = parseAdminFeedbackQuery(request.nextUrl.searchParams);
    const data = await loadAdminFeedback(supabase, query);

    return successResponse(data, 200, { 'Cache-Control': 'no-store' });
  } catch (error) {
    const isExpected = error instanceof Error && error.name === 'ApiError';
    if (!isExpected) {
      // The service throws a bare Error for database failures so its internals
      // cannot reach the response; the cause is logged here and never returned.
      console.error('[admin] unexpected feedback read failure');
    }
    return errorResponse(error);
  }
}