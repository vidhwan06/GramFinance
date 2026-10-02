import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match page requests, excluding:
     * - api       (route handlers — see below)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - common static asset extensions
     *
     * ── Why /api is excluded ────────────────────────────────────────────────
     * The session refresh this middleware performs is not needed for route
     * handlers. `lib/supabase/server.ts` gives a Route Handler its own writable
     * cookie store, so `getUser()` there refreshes an expiring token on demand
     * and persists the result through the same `setAll` mechanism. Excluding
     * /api therefore does not weaken refresh — it removes a redundant auth
     * pass, and with it the framework-level request-body buffering that the
     * matcher would otherwise trigger on every API call.
     *
     * The routes that genuinely need an authoritative answer keep calling
     * `getUser()` themselves. Nothing about authorization moved into here.
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
