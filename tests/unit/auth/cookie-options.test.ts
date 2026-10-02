import { describe, it, expect, vi, afterEach } from 'vitest';
import { sessionCookieOptions, withSessionCookieAttributes } from '@/lib/supabase/cookie-options';

/**
 * A-1: the session cookie must not be readable by JavaScript.
 *
 * `@supabase/ssr` defaults to `httpOnly: false`, which makes the Supabase
 * session cookie readable by any script on the origin. That turns any future
 * XSS into full session theft, and it is precisely the control that has to keep
 * working while the F16 CSP limitation (script-src 'unsafe-inline') is accepted.
 *
 * These tests pin the attributes themselves. The end-to-end proof that the
 * browser actually receives them is a live header check, recorded in the audit
 * and reproducible with `npm run build && npm start`.
 */

/**
 * `vi.stubEnv` rather than a direct assignment: Next.js's types declare
 * `process.env.NODE_ENV` as read-only, so `process.env.NODE_ENV = 'production'`
 * is a compile error even though it works at runtime. `vi.unstubAllEnvs()` in
 * afterEach restores the original value.
 */
function setNodeEnv(value: string | undefined) {
  if (value === undefined) vi.stubEnv('NODE_ENV', undefined);
  else vi.stubEnv('NODE_ENV', value);
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('sessionCookieOptions', () => {
  it('always sets httpOnly: true, regardless of environment', () => {
    for (const env of ['production', 'development', 'test', undefined]) {
      setNodeEnv(env);
      expect(sessionCookieOptions().httpOnly, `NODE_ENV=${env}`).toBe(true);
    }
  });

  it('pins path=/ and sameSite=lax in every environment', () => {
    for (const env of ['production', 'development', undefined]) {
      setNodeEnv(env);
      const opts = sessionCookieOptions();
      expect(opts.path, `NODE_ENV=${env}`).toBe('/');
      // sameSite=lax is the app's only CSRF boundary for the cookie; it must not
      // drift. Relaxing it to 'none' would make the cookie cross-site readable.
      expect(opts.sameSite, `NODE_ENV=${env}`).toBe('lax');
    }
  });

  it('sets secure: true in production', () => {
    setNodeEnv('production');
    expect(sessionCookieOptions().secure).toBe(true);
  });

  it('leaves secure false in development so localhost http keeps working', () => {
    // A Secure cookie is not stored at all over plaintext http, so setting it
    // unconditionally would make `next dev` sign-in silently appear to succeed
    // and then lose the session on the next request.
    setNodeEnv('development');
    expect(sessionCookieOptions().secure).toBe(false);
  });

  it('treats an unset NODE_ENV as non-production', () => {
    setNodeEnv(undefined);
    expect(sessionCookieOptions().secure).toBe(false);
  });
});

describe('withSessionCookieAttributes', () => {
  it('preserves the SDK maxAge while enforcing the attributes', () => {
    setNodeEnv('production');
    const merged = withSessionCookieAttributes({ maxAge: 34560000, path: '/' });

    // maxAge is meaningful behaviour and must survive.
    expect(merged.maxAge).toBe(34560000);
    // The enforced values must survive too.
    expect(merged.httpOnly).toBe(true);
    expect(merged.secure).toBe(true);
    expect(merged.sameSite).toBe('lax');
    expect(merged.path).toBe('/');
  });

  it('overrides an SDK default that would re-expose the cookie to JavaScript', () => {
    // This is the regression that matters: if @supabase/ssr ever passes
    // httpOnly: false explicitly, the enforced value must still win, otherwise
    // the fix silently reverts on an SDK upgrade.
    setNodeEnv('production');
    const merged = withSessionCookieAttributes({ httpOnly: false, secure: false });

    expect(merged.httpOnly).toBe(true);
    expect(merged.secure).toBe(true);
  });

  it('tolerates being called with no options at all', () => {
    setNodeEnv('production');
    const merged = withSessionCookieAttributes();

    expect(merged).toMatchObject({
      path: '/',
      sameSite: 'lax',
      httpOnly: true,
      secure: true,
    });
  });

  it('tolerates an explicitly undefined options argument', () => {
    setNodeEnv('development');
    expect(withSessionCookieAttributes(undefined).httpOnly).toBe(true);
  });

  it('does not mutate the caller-supplied options object', () => {
    const sdkOptions = { maxAge: 100 };
    withSessionCookieAttributes(sdkOptions);
    expect(sdkOptions).toEqual({ maxAge: 100 });
  });
});