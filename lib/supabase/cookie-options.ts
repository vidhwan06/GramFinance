/**
 * Explicit cookie attributes for the Supabase session cookie.
 *
 * ── Why this module exists ──────────────────────────────────────────────────
 * `@supabase/ssr` applies its own defaults when no options are supplied:
 *
 *     DEFAULT_COOKIE_OPTIONS = { path: '/', sameSite: 'lax', httpOnly: false }
 *
 * `httpOnly: false` means the session cookie is readable by any JavaScript
 * running on the origin. That is the single most valuable thing a session
 * cookie does not do: it turns any future XSS from "a nuisance" into "full
 * session theft", and it is the one control that would still work if the CSP
 * script-src 'unsafe-inline' limitation (F16) were ever exploited.
 *
 * No `secure` flag is set by that default either, so the cookie would be sent
 * over plaintext HTTP if the origin were ever reached that way. HSTS limits
 * that in browsers, but HSTS is ignored on a first visit and on any host the
 * browser has not seen before, so the cookie should not depend on it.
 *
 * ── Why `secure` is conditional ─────────────────────────────────────────────
 * A `Secure` cookie is not stored at all over plaintext, so unconditionally
 * setting it silently breaks `next dev` on `http://localhost:3000` -- sign-in
 * would appear to succeed and the session would simply be missing on the next
 * request. The flag is therefore applied in production only, and localhost over
 * HTTP keeps working.
 *
 * ── What is deliberately NOT changed ────────────────────────────────────────
 * `path`, `sameSite` and `maxAge` are restated to pin the behaviour explicitly
 * rather than to alter it: `@supabase/ssr` already chose these, and they are
 * the values the session has always been verified against. `sameSite: 'lax'`
 * is also what keeps the cookie off cross-site POSTs, which is the app's only
 * CSRF boundary -- changing it is out of scope here.
 */

export interface SessionCookieOptions {
  path: string;
  sameSite: 'lax';
  httpOnly: true;
  secure: boolean;
}

/**
 * The attributes every session cookie is written with.
 *
 * `secure` tracks NODE_ENV. The caller may still pass per-cookie options from
 * `@supabase/ssr` (notably `maxAge`); those are preserved, and these values win
 * for any key both specify, so a future SDK default cannot quietly reintroduce
 * `httpOnly: false`.
 */
export function sessionCookieOptions(): SessionCookieOptions {
  return {
    path: '/',
    sameSite: 'lax',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  };
}

/**
 * Merges the SDK's per-cookie options with the enforced attributes above.
 *
 * @param sdkOptions whatever `@supabase/ssr` supplied for this cookie, if any.
 * @returns a plain object safe to hand to `ResponseCookies.set` /
 *   `ReadonlyRequestCookies.set`.
 */
export function withSessionCookieAttributes(
  sdkOptions?: Record<string, unknown>
): Record<string, unknown> {
  return { ...(sdkOptions ?? {}), ...sessionCookieOptions() };
}