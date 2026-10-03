/**
 * API-facing rate limiting. One policy, one client-IP resolution, one bucket
 * store.
 *
 * Every IP-scoped route in the app calls `checkRateLimit`. The per-route budgets
 * are in `ROUTE_LIMITS`, chosen from measured per-endpoint cost rather than
 * guessed. Bucket storage, the expiry sweep and the `MAX_BUCKETS` eviction cap
 * live in `lib/ai/rate-limiter.ts` and are shared with the assistant route — no
 * second store exists anywhere in the project.
 *
 * ── Why one shared helper rather than per-route logic ───────────────────────
 * The assistant route originally carried its own key derivation, and its
 * fallback when no forwarded-IP header was present was the literal string
 * `'anonymous'`. That is a single global bucket: ten requests from anywhere
 * exhaust it and lock out every user for the rest of the window. Generalising
 * this helper removed that duplicate and its DoS lever in the same change.
 *
 * ── Header trust model ──────────────────────────────────────────────────────
 * Neither header is authenticated by this application; both are trusted on the
 * same basis:
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
 *
 * ── Deployment caveat ───────────────────────────────────────────────────────
 * Buckets live in the Node process heap. See AGENTS.md: limits are per instance,
 * reset on hot reload, and multiply on a horizontally scaled deployment. This
 * is best-effort application-level protection, not a globally enforced quota.
 */

import type { NextRequest } from 'next/server';
import { isRateLimited, getRetryDelayMs } from '@/lib/ai/rate-limiter';

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
 * Per-route limit budgets. Every value was chosen from the F3 audit's measured
 * per-endpoint cost, not arbitrarily:
 *
 *   assistant     10/min  a paid Gemini call per request, 1-3s each
 *   schemes       60/min  one 8 KB read that is CDN-cached; a backstop only
 *   session       60/min  polled on every header/menu mount; must not break nav
 *   fraud         20/min  1 query + pure engine, 1.4 KB response
 *   eligibility   12/min  4 queries and a 30 KB response: the most expensive
 *   sign-in        5/min  creates a real auth.users row (F1)
 *   feedback       5/min  authenticated, per user; prevents row spam
 *   learning-*    60/min  unauthenticated reference reads; see the audit note
 *   quiz submit   20/min  authenticated write; see the audit note
 *
 * ── The learning budgets (final audit) ──────────────────────────────────────
 * The three `/api/learning/*` routes were the last ones with no budget at all,
 * which made them the only unbounded origin-cost path in the app. Both reads are
 * public reference data served to every page load, so they get the same generous
 * 60/min as `/api/schemes` and `/api/auth/session` — a learner paging through
 * chapters must never be throttled. Quiz submission is a write, so it is
 * tighter at 20/min.
 *
 * The two reads get SEPARATE scopes rather than sharing one. They are different
 * resources, and the whole point of namespacing is that a script hammering one
 * cannot spend the other's allowance. Sharing a single 60/min bucket would let a
 * chapter-detail loop exhaust the lesson-list budget and break the catalogue
 * page for that IP.
 */
export interface RouteRateLimit {
  scope: string;
  max: number;
  windowMs: number;
}

/**
 * The single entry point every IP-scoped route uses.
 *
 * `scope` namespaces the bucket key, so two routes can never consume one
 * another's allowance even when they share an IP. The bucket store, the expiry
 * sweep and the `MAX_BUCKETS` eviction cap all live in `lib/ai/rate-limiter.ts`
 * and are shared with the assistant — no second store exists.
 *
 * ── When the IP cannot be determined ────────────────────────────────────────
 * Production fails closed with `no_client_ip`. That is a deliberate choice over
 * the shared-bucket alternative: a single global bucket is a denial-of-service
 * lever, because anyone can exhaust it for every user at once. That is exactly
 * the flaw this replaced in the assistant route, whose `'anonymous'` fallback
 * made ten requests from anywhere lock out the whole product. Every mainstream
 * Next.js host (Vercel, or nginx/Caddy in front of a self-hosted instance) sets
 * one of these headers, so this state indicates a deployment problem worth
 * surfacing rather than absorbing.
 *
 * Development and test keep working, because `next dev` sets neither header and
 * there is no adversary to limit. The key is namespaced to `dev:<scope>` so it
 * can never collide with a real-IP bucket, and it is intentionally a single
 * shared bucket — in that environment sharing costs nothing, and inventing a
 * per-request key would silently disable the limiter during manual testing.
 */
export function checkRateLimit(request: NextRequest, limit: RouteRateLimit): RateLimitVerdict {
  const { scope, max, windowMs } = limit;
  const ip = resolveClientIp(request);

  if (!ip) {
    if (process.env.NODE_ENV === 'production') {
      return { limited: true, reason: 'no_client_ip' };
    }
    return isRateLimited(`dev:${scope}`, { max, windowMs })
      ? { limited: true, reason: 'rate_limited' }
      : { limited: false };
  }

  return isRateLimited(`${scope}:ip:${ip}`, { max, windowMs })
    ? { limited: true, reason: 'rate_limited' }
    : { limited: false };
}

/**
 * Whole seconds until the bucket for an already-derived key resets, for a
 * `Retry-After` header.
 *
 * Strictly non-mutating, so reading it never counts as traffic. Returns
 * `undefined` when there is nothing to wait for, so the header is omitted
 * rather than emitted with a meaningless value.
 */
export function retryAfterSecondsForKey(bucketKey: string): number | undefined {
  const remaining = getRetryDelayMs(bucketKey);
  if (remaining <= 0) return undefined;

  // Round up so a client that waits exactly this long does not immediately land
  // on a still-closed window, and clamp to at least 1 so the header is never
  // "0" while a limit is in force.
  return Math.max(1, Math.ceil(remaining / 1000));
}

/**
 * The `Retry-After` value for an IP-scoped route. Derives the same bucket key
 * as `checkRateLimit` so the two can never disagree.
 */
export function retryAfterSeconds(
  request: NextRequest,
  limit: RouteRateLimit
): number | undefined {
  const ip = resolveClientIp(request);
  const key = ip === null ? `dev:${limit.scope}` : `${limit.scope}:ip:${ip}`;
  return retryAfterSecondsForKey(key);
}

/**
 * Decide whether `POST /api/auth/sign-in` may proceed.
 *
 * Retained as the named F1 entry point and now delegating to `checkRateLimit`,
 * so the existing behaviour and its tests are preserved exactly.
 */
export function checkAuthSignInRateLimit(
  request: NextRequest,
  options?: { max?: number; windowMs?: number }
): RateLimitVerdict {
  return checkRateLimit(request, {
    scope: 'auth-signin',
    max: options?.max ?? DEFAULT_MAX,
    windowMs: options?.windowMs ?? DEFAULT_WINDOW_MS,
  });
}

/** Exposed for tests, and for a route that wants a different budget. */
export const AUTH_SIGN_IN_RATE_LIMIT_DEFAULTS = {
  max: DEFAULT_MAX,
  windowMs: DEFAULT_WINDOW_MS,
} as const;

/**
 * The per-route budgets used in production. Declared here so the numbers are
 * visible in one place and cannot drift between a route and its test.
 */
export const ROUTE_LIMITS = {
  /** Paid Gemini call per request — the most expensive endpoint in the app. */
  assistant: { scope: 'assistant', max: 10, windowMs: 60_000 },
  /** CDN-cached catalogue read; this is only an origin backstop. */
  schemes: { scope: 'schemes', max: 60, windowMs: 60_000 },
  /** Polled on every header/menu mount, so it must not be tight. */
  authSession: { scope: 'auth-session', max: 60, windowMs: 60_000 },
  /** One query plus a pure engine; 1.4 KB response. */
  fraud: { scope: 'fraud', max: 20, windowMs: 60_000 },
  /** Four queries and a 30 KB response — the most expensive read path. */
  eligibility: { scope: 'eligibility', max: 12, windowMs: 60_000 },
  /** Authenticated and keyed per user, not per IP. */
  feedback: { scope: 'feedback', max: 5, windowMs: 60_000 },
  /**
   * Admin-only read of submitted feedback. One page query plus one count per
   * rating value, so it is materially more expensive than the other read routes.
   * Generous enough that paging through a long history is never interrupted.
   */
  adminFeedback: { scope: 'admin-feedback', max: 30, windowMs: 60_000 },
  /**
   * Public lesson list. Read-only reference data, loaded on every /learn mount,
   * so the ceiling is generous and exists only to bound an unattended loop.
   */
  learningLessons: { scope: 'learning-lessons', max: 60, windowMs: 60_000 },
  /**
   * A single lesson's content. Its own scope, deliberately NOT shared with
   * `learningLessons`, so one endpoint's traffic cannot drain the other's.
   */
  learningLesson: { scope: 'learning-lesson', max: 60, windowMs: 60_000 },
  /**
   * Quiz submission. Authenticated, and a write, so tighter than the reads.
   * IP-keyed like every other limit here: the route runs before authentication,
   * so there is no server-derived identity to key on yet.
   */
  learningQuizSubmit: { scope: 'learning-quiz-submit', max: 20, windowMs: 60_000 },
} as const satisfies Record<string, RouteRateLimit>;
