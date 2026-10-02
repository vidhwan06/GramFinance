/**
 * GET /api/auth/session
 *
 * Reports whether the caller currently holds a session.
 *
 * ── Who calls this ───────────────────────────────────────────────────────────
 * Client components only, to decide which control to render (Continue vs Sign
 * out) and whether to show the "sign in to submit feedback" notice. It is a UI
 * convenience, never an authorization check — the server re-verifies with
 * `getUser()` in the route handler that actually protects anything.
 *
 * ── Why this is an endpoint and not a browser Supabase client ────────────────
 * Reading session state client-side the usual way means creating a browser
 * Supabase client, which would require adding the Supabase origin to
 * `connect-src` in next.config.ts and would put the project URL in the client
 * bundle. This same-origin endpoint keeps `connect-src 'self'` correct and keeps
 * the browser entirely unaware of the Supabase project.
 *
 * ── What is NOT returned ─────────────────────────────────────────────────────
 * No email, no phone, no provider, no metadata, no tokens, no profile row. The
 * user id is the only field beyond the boolean, and it is needed to correlate
 * the session client-side. Everything else about a user is deliberately absent:
 * there is no profile UI in GramFinance, so nothing else has a consumer.
 */

import { successResponse, errorResponse } from '@/lib/api/response';
import { ErrorFactories } from '@/lib/api/errors';
import { createClient } from '@/lib/supabase/server';
import { getSupabasePublicEnv } from '@/lib/supabase/env';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (!getSupabasePublicEnv()) {
      throw ErrorFactories.authUnavailable();
    }

    const supabase = await createClient();

    // getUser(), not getSession(): the session is revalidated against the auth
    // server, so a forged or tampered cookie cannot report itself as signed in.
    // This is the same rule the protected routes follow.
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      // Signed out is a normal state, not a failure — HTTP 200 with
      // signedIn: false. Treating it as an error would make every anonymous
      // visitor see a failure state on a page that is perfectly usable.
      return successResponse({ signedIn: false });
    }

    return successResponse({ signedIn: true, userId: user.id });
  } catch (error) {
    const isExpected = error instanceof Error && error.name === 'ApiError';
    if (!isExpected) {
      console.error('[auth] unexpected session lookup failure');
    }
    return errorResponse(error);
  }
}
