/**
 * In-memory rate limiter for the AI assistant.
 *
 * Simple token-bucket per key. Designed for a single-instance
 * Next.js deployment. The interface is intentionally small so it
 * can later be replaced by Redis without changing the API route.
 *
 * Keys are session/user identifiers when available, otherwise a
 * safe IP fallback. The limiter never logs the key value.
 */

/** Default: 10 requests per 60 seconds. */
const DEFAULT_MAX = 10;
const DEFAULT_WINDOW_MS = 60_000;

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/**
 * Hard cap on tracked keys.
 *
 * The map is module-scoped and long-lived, and keys are derived from a
 * client-influenced header, so without a cap an attacker rotating the
 * header grows the map without bound. Expired buckets are swept first so
 * honest traffic is unaffected; only surplus keys are evicted.
 */
const MAX_BUCKETS = 10_000;

/** Drop expired buckets, then evict oldest-first if still over the cap. */
function sweep(now: number): void {
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key);
  }

  // Map preserves insertion order, so the first key is the oldest bucket.
  while (buckets.size > MAX_BUCKETS) {
    const oldest = buckets.keys().next();
    if (oldest.done) break;
    buckets.delete(oldest.value);
  }
}

/** Read the configured limit, falling back to defaults. */
function getMax(): number {
  const raw = process.env.ASSISTANT_RATE_LIMIT_MAX;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : DEFAULT_MAX;
}

/** Read the configured window, falling back to defaults. */
function getWindowMs(): number {
  const raw = process.env.ASSISTANT_RATE_LIMIT_WINDOW_MS;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_WINDOW_MS;
}

/**
 * Explicit limits, for a caller that needs a different budget from the
 * assistant's env-configured default.
 *
 * Omitting this argument preserves the original behaviour exactly: the
 * `ASSISTANT_RATE_LIMIT_*` environment variables, falling back to the
 * defaults. The bucket store, the expiry sweep and the `MAX_BUCKETS` cap are
 * shared, so adding a second caller does not add a second implementation of
 * the security-relevant part.
 */
export interface RateLimitOverrides {
  max?: number;
  windowMs?: number;
}

/**
 * Check whether a key is rate-limited.
 *
 * Returns true if the request should be blocked (limit exceeded).
 * Returns false if the request is allowed. The bucket is updated
 * as a side effect when the request is allowed.
 */
export function isRateLimited(key: string, overrides?: RateLimitOverrides): boolean {
  const now = Date.now();
  const max = overrides?.max ?? getMax();
  const windowMs = overrides?.windowMs ?? getWindowMs();

  // Reclaim memory only when the cap is reached — normal traffic skips this.
  if (buckets.size >= MAX_BUCKETS) sweep(now);

  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    // New window
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  if (bucket.count >= max) {
    return true;
  }

  bucket.count += 1;
  return false;
}

/**
 * Clear all buckets. Exposed for tests.
 */
export function _resetBuckets(): void {
  buckets.clear();
}
