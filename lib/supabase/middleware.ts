import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/types/database';
import { getSupabasePublicEnv } from './env';

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
          supabaseResponse.cookies.set(name, value, options as Parameters<typeof supabaseResponse.cookies.set>[2])
        );
      },
    },
  });

  // Do not swap this for getSession(): getUser() revalidates the JWT with the
  // auth server, which is what makes it safe to read `user` from for
  // authorization decisions.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // No auth guard is applied here yet. When a route requires a session, the
  // check belongs on the specific route/Server Action, and the redirect must
  // be applied to `supabaseResponse` (not a fresh NextResponse) so refreshed
  // cookies survive the redirect.

  void user; // Reserved for the route guards described above.

  return supabaseResponse;
}
