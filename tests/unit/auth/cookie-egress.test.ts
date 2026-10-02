import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * A-1 end-to-end: what the browser is actually told.
 *
 * `cookie-options.test.ts` pins the attribute values. This file proves they
 * reach the wire through the real middleware path, because a correct helper
 * that a caller forgets to use is worth nothing.
 *
 * `@supabase/ssr` is mocked so that `auth.getClaims()` performs a token refresh
 * by routing a cookie through `setAll` -- which is what the real SDK does
 * internally (getClaims -> getSession -> auto-refresh -> TOKEN_REFRESHED ->
 * the auth-state listener -> setAll), and what the comment in
 * `lib/supabase/middleware.ts` describes. The options handed to `setAll` are the
 * SDK's real defaults, notably `httpOnly: false`, so the test fails if the merge
 * ever stops overriding them.
 */

const SDK_DEFAULTS = vi.hoisted(() => ({
  path: '/',
  sameSite: 'lax' as const,
  httpOnly: false,
  maxAge: 400 * 24 * 60 * 60,
}));

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(
    (
      _url: string,
      _key: string,
      config: { cookies: { getAll: () => unknown; setAll: (c: unknown) => void } }
    ) => ({
      auth: {
        getClaims: vi.fn(async () => {
          // Simulate the SDK's automatic token refresh.
          config.cookies.setAll([
            {
              name: 'sb-project-auth-token',
              value: 'refreshed-token-value',
              options: { ...SDK_DEFAULTS },
            },
          ]);
          return { data: {}, error: null };
        }),
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
      from: vi.fn(),
    })
  ),
}));

import { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

function refreshAndReadCookies() {
  const request = new NextRequest('http://localhost:3000/home', {
    headers: { cookie: 'sb-project-auth-token=existing' },
  });
  return updateSession(request).then((response) => response.cookies.getAll());
}

function sessionCookie(cookies: Array<{ name: string }>) {
  return cookies.find((c) => c.name === 'sb-project-auth-token') as
    | {
        name: string;
        value: string;
        httpOnly?: boolean;
        secure?: boolean;
        sameSite?: string;
        path?: string;
        maxAge?: number;
      }
    | undefined;
}

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
});

afterEach(() => {
  vi.unstubAllEnvs();

  vi.clearAllMocks();
});

describe('session cookie written by the auth middleware (A-1)', () => {
  it('writes the refreshed cookie at all', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(sessionCookie(await refreshAndReadCookies())).toBeDefined();
  });

  it('carries HttpOnly and Secure in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const cookie = sessionCookie(await refreshAndReadCookies())!;

    expect(cookie.httpOnly).toBe(true);
    expect(cookie.secure).toBe(true);
  });

  it('keeps SameSite=Lax and Path=/ in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const cookie = sessionCookie(await refreshAndReadCookies())!;

    expect(cookie.sameSite).toBe('lax');
    expect(cookie.path).toBe('/');
  });

  it('keeps HttpOnly in development, where Secure cannot be used', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const cookie = sessionCookie(await refreshAndReadCookies())!;

    // HttpOnly is unconditional: it costs nothing over http://localhost.
    expect(cookie.httpOnly).toBe(true);
    // Secure is off, otherwise the cookie would be dropped over plaintext and
    // `next dev` sign-in would silently lose the session.
    expect(cookie.secure).toBe(false);
  });

  it('keeps SameSite=Lax and Path=/ in development too', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const cookie = sessionCookie(await refreshAndReadCookies())!;

    expect(cookie.sameSite).toBe('lax');
    expect(cookie.path).toBe('/');
  });

  it('preserves the SDK maxAge', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const cookie = sessionCookie(await refreshAndReadCookies())!;

    expect(cookie.maxAge).toBe(SDK_DEFAULTS.maxAge);
  });

  it('overrides the SDK httpOnly: false default instead of deferring to it', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const cookie = sessionCookie(await refreshAndReadCookies())!;

    // The regression guarded here: if the merge order inverts on an SDK
    // upgrade, the cookie silently becomes script-readable again.
    expect(SDK_DEFAULTS.httpOnly).toBe(false);
    expect(cookie.httpOnly).toBe(true);
  });

  it('does not regress session refresh: the new value is carried', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const cookie = sessionCookie(await refreshAndReadCookies())!;

    // Proves the flags were added alongside the refresh, not at its expense.
    expect(cookie.value).toBe('refreshed-token-value');
  });
});