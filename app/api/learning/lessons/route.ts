import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api/response';
import { ErrorFactories } from '@/lib/api/errors';
import { checkRateLimit, retryAfterSeconds, ROUTE_LIMITS } from '@/lib/api/rate-limit';
import { createClient } from '@/lib/supabase/server';
import { loadActiveLessons, loadModules } from '@/features/learning/learning-service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/learning/lessons
 * Returns summary list of all active learning lessons, deterministically ordered.
 * Also returns module information with chapter counts.
 *
 * Authorisation: public. These are active-only reference rows, and RLS filters
 * drafts and archived lessons out before this code sees them.
 *
 * Rate limiting: 60/60s per IP, applied before any database work. This route
 * runs two queries (`loadActiveLessons` inside `loadModules`, plus the list
 * itself) on every page mount, so an unattended loop is real origin cost. The
 * budget matches `/api/schemes` and `/api/auth/session`: generous enough that a
 * learner paging through chapters is never throttled, bounded enough to stop a
 * script. Like every other IP-scoped route it keys on `resolveClientIp`, which
 * fails closed in production when no proxy header is present.
 */
export async function GET(request: NextRequest) {
  try {
    const limit = ROUTE_LIMITS.learningLessons;
    if (checkRateLimit(request, limit).limited) {
      throw ErrorFactories.rateLimited(
        'Too many requests. Please wait a moment.',
        retryAfterSeconds(request, limit)
      );
    }

    const supabase = await createClient();
    const [lessons, modules] = await Promise.all([
      loadActiveLessons(supabase),
      loadModules(supabase),
    ]);
    return successResponse({ lessons, modules });
  } catch (error) {
    return errorResponse(error);
  }
}
