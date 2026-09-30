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
 * Check whether a key is rate-limited.
 *
 * Returns true if the request should be blocked (limit exceeded).
 * Returns false if the request is allowed. The bucket is updated
 * as a side effect when the request is allowed.
 */
export function isRateLimited(key: string): boolean {
  const now = Date.now();
  const max = getMax();
  const windowMs = getWindowMs();

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
