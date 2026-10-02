/**
 * POST /api/auth/sign-out
 *
 * Ends the anonymous session and expires its cookies.
 *
 * ── Scope of sign-out ────────────────────────────────────────────────────────
 * This ends the SESSION and nothing else. It deliberately does not:
 *   * delete the `public.users` profile row — that is the user's record, and
 *     deleting it would cascade through `auth.users` and null out the
 *     `user_id` on feedback they already submitted (migrations 001 and 006);
 *   * delete any feedback row.
 *
 * Signing out and destroying an account are different operations, and only the
 * first one is implemented.
 *
 * ── Idempotence ──────────────────────────────────────────────────────────────
 * Signing out with no session, or twice in a row, succeeds. There is nothing to
 * undo and nothing to report as an error, so a retry after a flaky network is
 * always safe. The route also only exports POST — there is no GET that could
 * end a session as a side effect of a prefetch or a link.
 */

import { successResponse, errorResponse } from '@/lib/api/response';
import { ErrorFactories } from '@/lib/api/errors';
import { createClient } from '@/lib/supabase/server';
import { getSupabasePublicEnv } from '@/lib/supabase/env';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    if (!getSupabasePublicEnv()) {
      throw ErrorFactories.authUnavailable();
    }

    const supabase = await createClient();

    // signOut() revokes the refresh token upstream and fires SIGNED_OUT, which
    // createServerClient's auth-state handler writes back through setAll as an
    // expired cookie. That is the same mechanism that persisted the session, so
    // no bespoke cookie clearing is needed here.
    const { error } = await supabase.auth.signOut();

    if (error) {
      // Log the code only — never the session or its tokens.
      console.error('[auth] sign-out failed', { code: error.code });
      throw ErrorFactories.authUnavailable();
    }

    return successResponse({ signedIn: false });
  } catch (error) {
    const isExpected = error instanceof Error && error.name === 'ApiError';
    if (!isExpected) {
      console.error('[auth] unexpected sign-out failure');
    }
    return errorResponse(error);
  }
}
