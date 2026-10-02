import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * A-1, second call site: cookies written by the route-handler server client.
 *
 * This is the more important of the two paths. `POST /api/auth/sign-in` creates
 * the session through `lib/supabase/server.ts`, so the INITIAL cookie the
 * browser stores -- the one that exists before any middleware pass has run --
 * is written here. `cookie-egress.test.ts` covers the middleware refresh path;
 * a negative control confirmed that reverting only `server.ts` left those tests
 * passing, so without this file the initial cookie would be unprotected and
 * nothing would notice.
 */

const written: Array<{ name: string; value: string; options?: Record<string, unknown> }> = [];

vi.mock('next/headers', () => ({
  cookies: async () => ({
    getAll: () => [],
    set: (name: string, value: string, options?: Record<string, unknown>) => {
      written.push({ name, value, options });
    },
  }),
}));

/** The attributes `@supabase/ssr` supplies when the app passes none. */
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
        // A successful anonymous sign-in is what routes new cookies through
        // setAll inside the real SDK.
        signInAnonymously: vi.fn(async () => {
          config.cookies.setAll([
            {
              name: 'sb-project-auth-token',
              value: 'brand-new-session',
              options: { ...SDK_DEFAULTS },
            },
          ]);
          return { data: { user: { id: 'u1' } }, error: null };
        }),
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
      from: vi.fn(),
    })
  ),
}));

import { createClient } from '@/lib/supabase/server';

async function signInAndReadOptions() {
  written.length = 0;
  const supabase = await createClient();
  await supabase.auth.signInAnonymously();
  const cookie = written.find((c) => c.name === 'sb-project-auth-token');
  return cookie?.options;
}

beforeEach(() => {
  written.length = 0;
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
});

afterEach(() => {
  vi.unstubAllEnvs();

  vi.clearAllMocks();
});

describe('initial session cookie written by the server client (A-1)', () => {
  it('is written at all', async () => {
    expect(await signInAndReadOptions()).toBeDefined();
  });

  it('carries HttpOnly and Secure in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const options = (await signInAndReadOptions())!;

    expect(options.httpOnly).toBe(true);
    expect(options.secure).toBe(true);
  });

  it('keeps SameSite=Lax and Path=/ in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const options = (await signInAndReadOptions())!;

    expect(options.sameSite).toBe('lax');
    expect(options.path).toBe('/');
  });

  it('keeps HttpOnly in development', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect((await signInAndReadOptions())!.httpOnly).toBe(true);
  });

  it('omits Secure in development so localhost http still receives the cookie', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect((await signInAndReadOptions())!.secure).toBe(false);
  });

  it('preserves the SDK maxAge', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect((await signInAndReadOptions())!.maxAge).toBe(SDK_DEFAULTS.maxAge);
  });

  it('overrides the SDK httpOnly: false default', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(SDK_DEFAULTS.httpOnly).toBe(false);
    expect((await signInAndReadOptions())!.httpOnly).toBe(true);
  });
});