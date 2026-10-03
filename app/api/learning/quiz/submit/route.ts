import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api/response';
import { ErrorFactories } from '@/lib/api/errors';
import { readJsonBody } from '@/lib/api/read-json';
import { checkRateLimit, retryAfterSeconds, ROUTE_LIMITS } from '@/lib/api/rate-limit';
import { createClient } from '@/lib/supabase/server';
import { submitQuizAnswers } from '@/features/learning/learning-service';
import { quizSubmissionRequestSchema } from '@/features/learning/schemas';
import { formatValidationIssues } from '@/features/feedback/validation';

export const dynamic = 'force-dynamic';

/** Quiz submissions are tiny: a UUID pair, a language and a list of answers. */
const MAX_BODY_BYTES = 16 * 1024;

/**
 * POST /api/learning/quiz/submit
 *
 * Scores a user quiz submission against server-stored questions.
 * Authentication is strictly enforced via RLS and auth.getUser().
 * Returns 401 if caller is unauthenticated.
 *
 *  Order of operations
 * This route was reordered during the final security audit. The original sequence
 * was: read body -> validate -> authenticate, which meant an UNAUTHENTICATED
 * caller received a fully populated Zod error report describing the whole
 * request schema. That is free schema disclosure, and it directly contradicted
 * the convention already documented and enforced in `app/api/feedback/route.ts`,
 * whose comment states that an unauthenticated caller "does not receive the
 * field list, the allowed enum values or the per-field validation messages".
 *
 * The order is now the one every other route in this project uses:
 *
 *   1. rate limit   - IP-keyed, before any other work
 *   2. authenticate - `getUser()`, so anonymous callers learn nothing else
 *   3. read body    - bounded, AFTER auth, so an anonymous caller cannot even
 *                     probe the size limit
 *   4. validate     - formatted with the shared `formatValidationIssues`
 *   5. score        - against server-held questions
 *
 *  Why the rate limit sits BEFORE authentication here
 * Because this limit is IP-keyed. Every other IP-keyed route in the app
 * (`/api/assistant`, `/api/fraud/check`, `/api/schemes/eligibility`,
 * `/api/schemes`, `/api/auth/session`) checks it first, and it must: an
 * unauthenticated caller would otherwise reach `getUser()` - a network round trip
 * to the Supabase auth server - completely unmetered.
 *
 * `/api/feedback` is the one route that authenticates first, and that is because
 * its budget is keyed on the AUTHENTICATED USER ID, which does not exist until
 * `getUser()` has run. Different key, different order; the convention is "limit
 * before the work the limit exists to bound", not a fixed position.
 *
 *  Why the body limit comes AFTER auth
 * Deliberate, and the same reasoning `/api/feedback` documents: an oversized
 * request without a session is answered 401, not 413, so the endpoint cannot be
 * used to probe the limit without one.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Rate limit FIRST, before authentication and before the body is read.
    const limit = ROUTE_LIMITS.learningQuizSubmit;
    if (checkRateLimit(request, limit).limited) {
      throw ErrorFactories.rateLimited(
        'Too many requests. Please wait a moment.',
        retryAfterSeconds(request, limit)
      );
    }

    // 2. Authenticate, using getUser() rather than getSession() so the token is
    //    revalidated against the auth server.
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw ErrorFactories.unauthorized('Authentication is required to submit quizzes.');
    }

    // 3. Bounded body read. `readJsonBody` counts the bytes it actually reads
    //    rather than trusting Content-Length, which a client may omit (chunked
    //    transfer) or understate. The previous implementation checked only the
    //    header and then called `request.json()`, so a chunked request of any
    //    size was buffered whole - the exact flaw `lib/api/read-json.ts` exists
    //    to eliminate, and the only route still doing it.
    let payload: unknown;
    try {
      payload = await readJsonBody(request, MAX_BODY_BYTES);
    } catch (error) {
      if (error instanceof Error && error.name === 'ApiError') throw error;
      throw ErrorFactories.badRequest('Request body must be valid JSON.');
    }

    // 4. Validate, formatted with the shared helper so the response shape matches
    //    every other route in the app. The previous `parsed.error.format()` dumped
    //    Zod's nested internal structure into the API response.
    const parsed = quizSubmissionRequestSchema.safeParse(payload);
    if (!parsed.success) {
      throw ErrorFactories.badRequest(
        'Invalid submission payload.',
        formatValidationIssues(parsed.error)
      );
    }

    // 5. Score against server-held questions.
    const result = await submitQuizAnswers(supabase, parsed.data, true);
    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
