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
 * The authentication check runs FIRST, ahead of parsing and schema validation.
 * That ordering is deliberate:
 *   * An unauthenticated caller learns only that authentication is required. It
 *     does not receive the field list, the allowed enum values or the per-field
 *     validation messages, which is free schema disclosure.
 *   * No work is done for a request that cannot succeed anyway. Previously an
 *     anonymous caller caused a body parse, a Zod pass, and two Supabase round
 *     trips before reaching the same 401.
 * The size guard stays ahead of both, because it bounds memory rather than
 * describing the schema.
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

    const supabase = await createClient();

    // Authenticate BEFORE validating the body. getUser(), never getSession():
    // the token is revalidated with the auth server, which is what makes the
    // resulting user id safe to write as user_id below. The RLS policy enforces
    // the same rule independently; this check exists to return a clean 401
    // rather than a database error, and to keep anonymous callers away from the
    // validation surface.
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw ErrorFactories.unauthorized('You must be signed in to submit feedback.');
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
