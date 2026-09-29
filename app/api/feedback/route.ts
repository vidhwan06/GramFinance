import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api/response';
import { ErrorFactories } from '@/lib/api/errors';
import { createClient } from '@/lib/supabase/server';
import {
  feedbackInputSchema,
  formatValidationIssues,
} from '@/features/feedback/validation';

/**
 * POST /api/feedback
 *
 * Accepts feedback from an authenticated user and stores it in the database.
 *
 * ── Authorisation ───────────────────────────────────────────────────────────
 * Uses the anon-key server client with the caller's session cookie. RLS
 * applies: the `feedback_insert_own` policy requires `auth.uid() = user_id`,
 * so a user can only insert their own feedback. An unauthenticated request
 * is rejected with 401 before any database work is attempted.
 *
 * ── No service-role key ─────────────────────────────────────────────────────
 * The server client uses the anon key only. RLS is never bypassed.
 */

export const dynamic = 'force-dynamic';

/** Feedback payloads are tiny. Anything larger is not a real request. */
const MAX_BODY_BYTES = 8 * 1024;

export async function POST(request: NextRequest) {
  try {
    // Cheap rejection before parsing, so an oversized body is never materialised.
    const declaredLength = Number(request.headers.get('content-length') ?? '0');
    if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
      throw ErrorFactories.badRequest('Request body is too large.');
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      // Deliberately vague: the parse error can echo fragments of the body.
      throw ErrorFactories.badRequest('Request body must be valid JSON.');
    }

    const parsed = feedbackInputSchema.safeParse(payload);
    if (!parsed.success) {
      throw ErrorFactories.badRequest(
        'The request body is not valid.',
        formatValidationIssues(parsed.error)
      );
    }

    const { module, rating, comment } = parsed.data;

    const supabase = await createClient();

    // Authenticate the request. The RLS policy will also enforce this, but
    // checking here gives a clean 401 rather than a database error.
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw ErrorFactories.unauthorized('You must be signed in to submit feedback.');
    }

    // Insert the feedback. user_id comes from the authenticated session,
    // never from the request body. RLS enforces that it matches auth.uid().
    const { data, error } = await supabase
      .from('feedback')
      .insert({
        user_id: user.id,
        module,
        rating,
        comment: comment ?? null,
      })
      .select('id, user_id, module, rating, comment, created_at')
      .single();

    if (error) {
      // Log the error code server-side for debugging, but never log the
      // user-submitted content (module, rating, comment).
      console.error('[feedback] database insert failed', { code: error.code });
      throw ErrorFactories.internal('Unable to save feedback. Please try again.');
    }

    // Log only non-personal metadata for debugging.
    console.info('[feedback] submitted', { module, rating });

    return successResponse({
      id: data.id,
      module: data.module,
      rating: data.rating,
      comment: data.comment,
      createdAt: data.created_at,
    });
  } catch (error) {
    // Log the real cause server-side; the client only ever sees the sanitised
    // message that errorResponse derives from the ApiError.
    const isExpected = error instanceof Error && error.name === 'ApiError';
    if (!isExpected) {
      console.error('[feedback] unexpected failure', error);
    }
    return errorResponse(error);
  }
}
