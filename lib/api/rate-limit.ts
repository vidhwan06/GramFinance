/**
 * Per-IP rate limiting for anonymous session creation.
 *
 * Scope: `POST /api/auth/sign-in` only. This is deliberately not a global rate
 * limiting framework. It exists because that endpoint is unauthenticated, calls
 * the Supabase Auth server, and creates a real `auth.users` row per call — so
 * without a limit it is both a quota burner and a row-flooding lever. The
 * general F3 sweep across every API route is a separate change.
 *
 * ── Why a shared bucket is not an option ────────────────────────────────────
 * The assistant route (`app/api/assistant/route.ts`) falls back to the literal
 * key `'anonymous'` when no forwarded-IP header is present. That is a single
 * global bucket: ten requests from anywhere exhaust it and lock out every user
 * for the rest of the window. Copying that fallback here would reproduce the
 * same denial-of-service lever on a route that is far easier to find.
 *
 * So there is no shared fallback. When the client IP cannot be determined the
 * limiter reports it and the caller decides — see `checkAuthSignInRateLimit`.
 *
 * ── Header trust model ──────────────────────────────────────────────────────
 * Neither header is authenticated by this application; both are trusted on the
 * same basis the assistant route already documents:
 *
 *   * `x-forwarded-for` is a comma-separated chain with one entry appended per
 *     proxy. Only the LAST entry is written by the nearest trusted proxy;
 *     everything to its left arrived from the client and can be prepended at
 *     will. A leftmost pick therefore hands every attacker a fresh bucket and
 *     defeats the limiter entirely, so the rightmost entry is used.
 *   * `x-real-ip` carries a single value written by the nearest proxy, so it has
 *     no chain to manipulate. It is a fallback for hosts that set it instead of
 *     `x-forwarded-for`.
 *
 * Neither value is trusted as an identity — it only selects a bucket, so the
 * worst a spoofed header achieves is a bucket of its own, which is already
 * capped at `MAX_BUCKETS` in the underlying store. No header value is ever
 * logged, and the key is length-capped because the header is client-controlled.
 */

import type { NextRequest } from 'next/server';
import { isRateLimited } from '@/lib/ai/rate-limiter';

/** Anonymous session creation is a one-tap action; a handful per minute is generous. */
const DEFAULT_MAX = 5;
const DEFAULT_WINDOW_MS = 60_000;

/** Bucket keys are retained in memory for the whole window and come from a header. */
const MAX_KEY_LENGTH = 64;

export type RateLimitVerdict =
  | { limited: false }
  | { limited: true; reason: 'rate_limited' | 'no_client_ip' };

/**
 * The real client IP according to the documented trusted-header conventions,
 * or `null` when no proxy header is present.
 *
 * Returns `null` rather than a guess. There is no trustworthy fallback: the
 * request itself carries no client address that this application can verify.
 */
export function resolveClientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const hops = forwarded.split(',');
    // Rightmost entry only — see the module comment.
    const ip = hops[hops.length - 1]?.trim();
    if (ip) return ip.slice(0, MAX_KEY_LENGTH);
  }

  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp.slice(0, MAX_KEY_LENGTH);

  return null;
}

/**
 * Decide whether `POST /api/auth/sign-in` may proceed.
 *
 * ── When the IP cannot be determined ────────────────────────────────────────
 * Production fails closed with `no_client_ip`. That is a deliberate choice over
 * the shared-bucket alternative: GramFinance stays fully usable without a
 * session (only feedback is gated), so refusing to mint sessions on a
 * misconfigured host costs one optional feature, whereas a shared bucket lets
 * anyone lock that feature out for everyone. Every mainstream Next.js host
 * (Vercel, or nginx/Caddy in front of a self-hosted instance) sets one of these
 * headers, so this state indicates a deployment problem worth surfacing.
 *
 * Development and test keep working, because `next dev` sets neither header and
 * there is no adversary to limit. The key is namespaced to `dev:` so it can
 * never collide with a real-IP bucket, and it is intentionally a single shared
 * bucket — in that environment sharing costs nothing and inventing a
 * per-request key would silently disable the limiter during manual testing.
 */
export function checkAuthSignInRateLimit(
  request: NextRequest,
  options?: { max?: number; windowMs?: number }
): RateLimitVerdict {
  const max = options?.max ?? DEFAULT_MAX;
  const windowMs = options?.windowMs ?? DEFAULT_WINDOW_MS;

  const ip = resolveClientIp(request);

  if (!ip) {
    if (process.env.NODE_ENV === 'production') {
      return { limited: true, reason: 'no_client_ip' };
    }
    return isRateLimited('dev:no-client-ip', { max, windowMs })
      ? { limited: true, reason: 'rate_limited' }
      : { limited: false };
  }

  return isRateLimited(`auth-signin:ip:${ip}`, { max, windowMs })
    ? { limited: true, reason: 'rate_limited' }
    : { limited: false };
}

/** Exposed for tests, and for a route that wants a different budget. */
export const AUTH_SIGN_IN_RATE_LIMIT_DEFAULTS = {
  max: DEFAULT_MAX,
  windowMs: DEFAULT_WINDOW_MS,
} as const;
