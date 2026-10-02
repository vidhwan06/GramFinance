import { describe, it, expect } from 'vitest';
import nextConfig from '@/next.config';
import { ErrorFactories, ApiError } from '@/lib/api/errors';

/**
 * Guards the HTTP-response correctness settings.
 *
 * Two defects are covered, both of which are invisible at build time and in
 * TypeScript:
 *
 *   1. `serviceUnavailable` used to answer HTTP 533, which is not a registered
 *      status code. It round-trips on a bare Node origin but is invalid to a
 *      CDN, proxy or WAF, which may rewrite it to 500/502 or drop it. The
 *      condition it reports is exactly the "upstream is down, retry" case that
 *      health checks key off, so an unregistered code there is actively harmful.
 *   2. `X-Powered-By: Next.js` advertised the framework and its exact major
 *      version to every unauthenticated visitor.
 *
 * Neither would fail a test that only exercised behaviour, so both are asserted
 * here against the source of truth: the config object and the error factories.
 */

/** Every status the error factories may produce must be a real HTTP status. */
const IANA_STATUSES = new Set([
  400, 401, 403, 404, 405, 408, 409, 410, 413, 415, 418, 422, 425, 429, 500, 501, 502, 503, 504,
]);

function statusCodes(): Array<[string, ApiError]> {
  const f = ErrorFactories;
  return [
    ['badRequest', f.badRequest()],
    ['unauthorized', f.unauthorized()],
    ['forbidden', f.forbidden()],
    ['notFound', f.notFound()],
    ['rateLimited', f.rateLimited()],
    ['payloadTooLarge', f.payloadTooLarge()],
    ['internal', f.internal()],
    ['serviceUnavailable', f.serviceUnavailable()],
    ['aiUnavailable', f.aiUnavailable()],
    ['authUnavailable', f.authUnavailable()],
    ['clientIpUnavailable', f.clientIpUnavailable()],
  ];
}

async function resolvedHeaders(): Promise<Array<{ key: string; value: string }>> {
  const headers = nextConfig.headers as (
    req: unknown
  ) => Promise<Array<{ headers: Array<{ key: string; value: string }> }>>;
  // The config ignores its argument entirely; the dummy keeps the type honest.
  const result = await headers({});
  return result[0].headers;
}

describe('HTTP status correctness (F4)', () => {
  it('serviceUnavailable answers 503, not a custom code', () => {
    const error = ErrorFactories.serviceUnavailable();
    expect(error.statusCode).toBe(503);
    expect(error.code).toBe('SERVICE_UNAVAILABLE');
  });

  it('no error factory emits a non-standard status code', () => {
    for (const [name, error] of statusCodes()) {
      expect(IANA_STATUSES.has(error.statusCode), `${name} -> ${error.statusCode}`).toBe(true);
    }
  });

  it('does not regress to 533 for any factory', () => {
    for (const [name, error] of statusCodes()) {
      expect(error.statusCode, `${name} must not be 533`).not.toBe(533);
    }
  });

  it('still produces a well-formed ApiError envelope for each factory', () => {
    for (const [name, error] of statusCodes()) {
      expect(error, name).toBeInstanceOf(ApiError);
      expect(error.name).toBe('ApiError');
      expect(typeof error.message).toBe('string');
      expect(error.message.length).toBeGreaterThan(0);
      expect(typeof error.code).toBe('string');
    }
  });

  it('rateLimited still carries Retry-After only when a value is supplied', () => {
    expect(ErrorFactories.rateLimited().headers).toBeUndefined();
    expect(ErrorFactories.rateLimited('slow down', 30).headers).toEqual({ 'Retry-After': '30' });
  });
});

describe('response header hardening (F5)', () => {
  it('suppresses X-Powered-By', () => {
    expect(nextConfig.poweredByHeader).toBe(false);
  });

  it('keeps the established security headers', async () => {
    expect(typeof nextConfig.headers).toBe('function');
    const keys = (await resolvedHeaders()).map((h) => h.key.toLowerCase());

    for (const expected of [
      'content-security-policy',
      'x-content-type-options',
      'x-frame-options',
      'referrer-policy',
      'strict-transport-security',
      'permissions-policy',
      'x-permitted-cross-domain-policies',
    ]) {
      expect(keys, `missing ${expected}`).toContain(expected);
    }
  });

  it('does not widen CSP connect-src to a third-party origin', async () => {
    const headers = await resolvedHeaders();
    const csp = headers.find((h) => h.key === 'Content-Security-Policy')!.value;
    const connectSrc = csp.match(/connect-src '([^']*)'/);

    expect(connectSrc).not.toBeNull();
    expect(connectSrc![1].split(/\s+/)).toEqual(['self']);
    // A browser Supabase client would require this to change. It must not.
    expect(csp).not.toMatch(/https?:\/\//);
  });

  it('does not add middleware to strip the header', () => {
    // The idiomatic config switch is used; a middleware workaround would tax
    // every response to remove something Next.js already has a setting for.
    const middleware = readFileSync(resolve(process.cwd(), 'middleware.ts'), 'utf8');
    expect(middleware).not.toMatch(/x-powered-by/i);
  });
});

// Imported late so the module-level import order above stays readable.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';