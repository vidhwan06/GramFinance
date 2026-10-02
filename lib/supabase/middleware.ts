import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/types/database';
import { getSupabasePublicEnv } from './env';
import { withSessionCookieAttributes } from './cookie-options';

/**
 * Refreshes the Supabase session cookie on every matched request.
 *
 * Why this must exist: `server.ts` cannot write cookies from a Server
 * Component, so an expiring access token would never be refreshed and the user
 * would be silently signed out. Middleware runs on the Edge with full cookie
 * write access, which is exactly what Supabase's SSR guide prescribes.
 *
 * This is a separate client instance from `server.ts` on purpose, not a
 * duplicate: middleware runs in a different runtime with a different cookie
 * source (the incoming `NextRequest` rather than `next/headers`), so it cannot
 * share the server client.
 *
 * Unlike the other two clients this one does NOT throw when Supabase is
 * unconfigured — it returns the response untouched so the app still renders
 * without a backend.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const env = getSupabasePublicEnv();
  if (!env) return supabaseResponse;

  const supabase = createServerClient<Database>(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        // Re-create the response so the refreshed cookies are carried onto it.
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          // Same enforced attributes as `server.ts`. Both call sites must agree:
          // a cookie written by middleware is the one the browser stores, so
          // this is the site that actually determines the Set-Cookie flags.
          supabaseResponse.cookies.set(
            name,
            value,
            withSessionCookieAttributes(options)
          )
        );
      },
    },
  });

  // ── Refresh pass only — NOT an authorization decision ──────────────────────
  // `getClaims()` validates the access token's signature locally against the
  // cached JWKS and checks `exp`. It does not call the Supabase Auth server.
  // `getUser()` did make a network round trip to `/auth/v1/user` on every
  // single matched request, which is pure overhead for a pass whose only job is
  // to keep the cookie fresh.
  //
  // What actually keeps the session alive: `getSession()` (called internally by
  // `getClaims()`) refreshes when the access token is within its expiry margin,
  // and the `SIGNED_IN` / `TOKEN_REFRESHED` auth-state handler installed by
  // `createServerClient` routes those new tokens back through `setAll` above.
  // Because `setAll` re-creates `supabaseResponse`, the refreshed cookies are
  // carried onto the response that is actually returned.
  //
  // Authorization is still decided with `getUser()` in the individual route
  // handlers that need it (see `app/api/feedback/route.ts`). Nothing here is
  // ever used to allow or deny a request.
  const { error: claimsError } = await supabase.auth.getClaims();

  // A rejected or absent token is not an error condition: the overwhelming
  // majority of GramFinance traffic is anonymous, and public pages must render
  // without a session. Supabase has already cleared any unusable cookie through
  // `setAll` above, so the response simply carries on unsigned.
  if (claimsError) {
    // Intentionally silent. This fires on every anonymous request, so logging
    // it would be pure noise, and the token itself must never be logged.
  }

  return supabaseResponse;
}
