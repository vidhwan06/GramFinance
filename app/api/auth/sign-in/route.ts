/**
 * POST /api/auth/sign-in
 *
 * Creates a lightweight anonymous Supabase session and persists it as
 * HTTP-only cookies.
 *
 * ── Why anonymous sign-in ────────────────────────────────────────────────────
 * GramFinance is a public-interest tool. Every feature works without an
 * account: the loan calculator, the fraud checker, the scheme catalogue, the
 * eligibility engine and the AI assistant are all public, and they stay public.
 * The only feature gated behind a session is submitting feedback, which needs an
 * owner-scoped `user_id` to satisfy the `feedback_insert_own` RLS policy.
 *
 * So a full identity — email, password, OTP, phone — would be a large amount of
 * personal data collected for one low-stakes action, from an audience that is
 * largely low-literacy, on shared devices and unreliable networks. A Supabase
 * anonymous session gives a real `auth.users` row with a real UUID, which is
 * exactly what RLS needs, and nothing more. The UUID is stable and can later be
 * linked to a real credential without changing it, if a future feature ever
 * needs cross-device identity.
 *
 * ── Authorisation ────────────────────────────────────────────────────────────
 * There is no meaningful authorization here: the caller has no identity yet.
 * What protects this endpoint is the per-IP rate limit below, plus the
 * `enable_anonymous_sign_ins` project setting.
 *
 * ── The browser never talks to Supabase ──────────────────────────────────────
 * This is a same-origin route handler using the existing server client. The
 * Supabase project URL and the session tokens never reach the browser: the
 * browser only ever sees this endpoint and the resulting cookies. That is what
 * keeps `connect-src 'self'` in next.config.ts correct, and it is why no browser
 * Supabase client exists in this project.
 */

import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api/response';
import { ErrorFactories } from '@/lib/api/errors';
import { createClient } from '@/lib/supabase/server';
import { getSupabasePublicEnv } from '@/lib/supabase/env';
import { checkAuthSignInRateLimit } from '@/lib/api/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Rate limit BEFORE any upstream work: this endpoint creates a real
    // auth.users row and calls the Supabase Auth server, so it must not be
    // reachable as a free quota burner.
    const verdict = checkAuthSignInRateLimit(request);
    if (verdict.limited) {
      if (verdict.reason === 'no_client_ip') {
        // No proxy header to derive a bucket from. Failing closed is
        // deliberate — see lib/api/rate-limit.ts for why a shared bucket is
        // the worse failure mode here.
        throw ErrorFactories.clientIpUnavailable();
      }
      throw ErrorFactories.rateLimited('Too many sign-in attempts. Please wait a moment.');
    }

    // createClient() throws when the env vars are absent. Check first so a
    // misconfigured deployment gets a clean 503 rather than a 500 whose
    // message names internal variable names.
    if (!getSupabasePublicEnv()) {
      throw ErrorFactories.authUnavailable();
    }

    const supabase = await createClient();

    // Idempotence: a caller that already holds a valid session gets that
    // session back rather than a second identity. Otherwise every visit to the
    // sign-in page would mint a new user and orphan the previous one's profile.
    const {
      data: { user: existingUser },
    } = await supabase.auth.getUser();

    if (existingUser) {
      return successResponse({ signedIn: true, userId: existingUser.id, created: false });
    }

    const { data, error } = await supabase.auth.signInAnonymously();

    if (error || !data.user) {
      // Log the machine-readable code only. Never the message (it can echo
      // request detail) and never any token.
      console.error('[auth] anonymous sign-in failed', { code: error?.code ?? 'UNKNOWN' });
      throw ErrorFactories.authUnavailable();
    }

    // Cookies are already persisted: createServerClient's onAuthStateChange
    // handler routed the SIGNED_IN event through the setAll above, which writes
    // to the Route Handler's own cookie store.
    //
    // Nothing about the session is returned beyond the user id. The access and
    // refresh tokens stay in HTTP-only cookies and are never included in a
    // response body.
    return successResponse({ signedIn: true, userId: data.user.id, created: true });
  } catch (error) {
    const isExpected = error instanceof Error && error.name === 'ApiError';
    if (!isExpected) {
      console.error('[auth] unexpected sign-in failure');
    }
    return errorResponse(error);
  }
}
