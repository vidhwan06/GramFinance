import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api/response';
import { ErrorFactories } from '@/lib/api/errors';
import { readJsonBody } from '@/lib/api/read-json';
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
 * ── Request body limit ───────────────────────────────────────────────────────
 * Bounded by readJsonBody AFTER authentication, which counts the bytes it
 * actually reads rather than trusting Content-Length. The previous check trusted
 * the header alone, so a chunked request or one that understated its size was
 * buffered without limit.
 *
 * BEHAVIOUR CHANGE: an oversized body now returns 413 PAYLOAD_TOO_LARGE rather
 * than 400 BAD_REQUEST. The unauthenticated path is unchanged and still wins:
 * an oversized request without a session returns 401, not 413.
 *
 * ── No service-role key ─────────────────────────────────────────────────────
 * The server client uses the anon key only. RLS is never bypassed.
 */

export const dynamic = 'force-dynamic';

/** Feedback payloads are tiny. Anything larger is not a real request. */
const MAX_BODY_BYTES = 8 * 1024;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Authenticate BEFORE reading or validating the body. getUser(), never
    // getSession(): the token is revalidated with the auth server, which is what
    // makes the resulting user id safe to write as user_id below. The RLS policy
    // enforces the same rule independently; this check exists to return a clean
    // 401 rather than a database error, and to keep anonymous callers away from
    // both the size and the validation surface.
    //
    // It deliberately runs before readJsonBody: an unauthenticated oversized
    // request is answered 401, never 413, so the endpoint cannot be used to
    // probe the body limit without a session.
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw ErrorFactories.unauthorized('You must be signed in to submit feedback.');
    }

    // Size-capped on the bytes actually read, not on the Content-Length header.
    // readJsonBody uses the header only as a cheap early exit and enforces the
    // real limit while counting the stream, so a request with no Content-Length
    // (chunked transfer) or a header that understates the body is still bounded.
    let payload: unknown;
    try {
      payload = await readJsonBody(request, MAX_BODY_BYTES);
    } catch (error) {
      if (error instanceof Error && error.name === 'ApiError') throw error;
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
