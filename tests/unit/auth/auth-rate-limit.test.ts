import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  resolveClientIp,
  checkAuthSignInRateLimit,
  AUTH_SIGN_IN_RATE_LIMIT_DEFAULTS,
} from '@/lib/api/rate-limit';
import { _resetBuckets } from '@/lib/ai/rate-limiter';

/**
 * Rate limiting for POST /api/auth/sign-in.
 *
 * The endpoint is unauthenticated, calls the Supabase Auth server and creates a
 * real auth.users row, so it must not ship unprotected. Two properties matter:
 *
 *   1. a real client IP yields a per-IP bucket;
 *   2. when no IP can be determined, the route must NOT silently fall back to a
 *      bucket shared by every anonymous caller — that is a one-line denial of
 *      service against the whole product's feedback feature.
 */

function request(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost:3000/api/auth/sign-in', {
    method: 'POST',
    headers,
  });
}

const originalNodeEnv = process.env.NODE_ENV;

/**
 * `types/environment.ts` declares NODE_ENV as a non-optional readonly member of
 * ProcessEnv, so a test that needs to exercise a production-only branch cannot
 * assign to it directly.
 */
function setNodeEnv(value: 'development' | 'production' | 'test'): void {
  (process.env as unknown as Record<string, string | undefined>).NODE_ENV = value;
}

describe('resolveClientIp', () => {
  it('reads the rightmost x-forwarded-for hop', () => {
    // Everything to the left of the last entry is client-supplied and can be
    // prepended at will, so a leftmost pick would give every attacker a fresh
    // bucket and defeat the limiter.
    const ip = resolveClientIp(request({ 'x-forwarded-for': '1.1.1.1, 2.2.2.2, 3.3.3.3' }));
    expect(ip).toBe('3.3.3.3');
  });

  it('trims whitespace around a single hop', () => {
    expect(resolveClientIp(request({ 'x-forwarded-for': '  9.9.9.9  ' }))).toBe('9.9.9.9');
  });

  it('falls back to x-real-ip', () => {
    expect(resolveClientIp(request({ 'x-real-ip': '8.8.8.8' }))).toBe('8.8.8.8');
  });

  it('prefers x-forwarded-for over x-real-ip', () => {
    const ip = resolveClientIp(
      request({ 'x-forwarded-for': '1.1.1.1, 2.2.2.2', 'x-real-ip': '8.8.8.8' })
    );
    expect(ip).toBe('2.2.2.2');
  });

  it('returns null when neither header is present', () => {
    expect(resolveClientIp(request())).toBeNull();
  });

  it('caps the key length, because the header is client-controlled', () => {
    const long = 'a'.repeat(500);
    const ip = resolveClientIp(request({ 'x-forwarded-for': long }));
    expect(ip).toHaveLength(64);
  });
});

describe('checkAuthSignInRateLimit', () => {
  beforeEach(() => {
    _resetBuckets();
  });

  afterEach(() => {
    (process.env as unknown as Record<string, string | undefined>).NODE_ENV = originalNodeEnv;
    _resetBuckets();
  });

  it('allows requests up to the limit for a given IP, then blocks', () => {
    const req = request({ 'x-forwarded-for': '5.5.5.5' });
    const max = AUTH_SIGN_IN_RATE_LIMIT_DEFAULTS.max;

    for (let i = 0; i < max; i++) {
      expect(checkAuthSignInRateLimit(req).limited).toBe(false);
    }
    expect(checkAuthSignInRateLimit(req).limited).toBe(true);
  });

  it('gives separate buckets to separate IPs', () => {
    const a = request({ 'x-forwarded-for': '5.5.5.5' });
    const b = request({ 'x-forwarded-for': '6.6.6.6' });
    const max = AUTH_SIGN_IN_RATE_LIMIT_DEFAULTS.max;

    for (let i = 0; i < max; i++) checkAuthSignInRateLimit(a);
    expect(checkAuthSignInRateLimit(a).limited).toBe(true);
    // A different caller must not be affected.
    expect(checkAuthSignInRateLimit(b).limited).toBe(false);
  });

  it('blocks an attacker rotating the leftmost forwarded hop', () => {
    // Prepending a fake left entry must not mint a fresh bucket.
    const max = AUTH_SIGN_IN_RATE_LIMIT_DEFAULTS.max;
    for (let i = 0; i < max; i++) {
      checkAuthSignInRateLimit(
        request({ 'x-forwarded-for': `10.0.0.${i}, 5.5.5.5` })
      );
    }
    expect(
      checkAuthSignInRateLimit(request({ 'x-forwarded-for': '10.0.0.99, 5.5.5.5' })).limited
    ).toBe(true);
  });

  it('fails closed in production when no client IP can be determined', () => {
    setNodeEnv('production');
    const verdict = checkAuthSignInRateLimit(request());
    // The whole point: no shared fallback bucket that one caller can exhaust
    // for everyone.
    expect(verdict.limited).toBe(true);
    expect(verdict.limited && verdict.reason).toBe('no_client_ip');
  });

  it('does not block the first request in development without a proxy header', () => {
    // `next dev` sets neither header; failing closed there would make the
    // feature impossible to exercise by hand.
    setNodeEnv('development');
    expect(checkAuthSignInRateLimit(request()).limited).toBe(false);
  });

  it('still limits the development fallback rather than disabling the check', () => {
    setNodeEnv('development');
    const req = request();
    const max = AUTH_SIGN_IN_RATE_LIMIT_DEFAULTS.max;
    for (let i = 0; i < max; i++) {
      expect(checkAuthSignInRateLimit(req).limited).toBe(false);
    }
    expect(checkAuthSignInRateLimit(req).limited).toBe(true);
  });

  it('honours explicit overrides', () => {
    const req = request({ 'x-forwarded-for': '7.7.7.7' });
    expect(checkAuthSignInRateLimit(req, { max: 2, windowMs: 60_000 }).limited).toBe(false);
    expect(checkAuthSignInRateLimit(req, { max: 2, windowMs: 60_000 }).limited).toBe(false);
    expect(checkAuthSignInRateLimit(req, { max: 2, windowMs: 60_000 }).limited).toBe(true);
  });
});
