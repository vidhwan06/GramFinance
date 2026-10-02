import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NextRequest } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { _resetBuckets } from '@/lib/ai/rate-limiter';

/**
 * Live integration test for the anonymous session flow.
 *
 * This is the ONLY place the positive authentication path is exercised. Before
 * this feature existed there was no way to obtain a session at all, and the
 * existing feedback suite mocks `cookies()` to an empty array, so it can only
 * ever assert the 401 branch. Everything below runs against the real Supabase
 * project and proves the RLS architecture works with a real `auth.users` UUID:
 *
 *   1. POST /api/auth/sign-in creates a session
 *   2. the Set-Cookie values are captured and replayed against POST /api/feedback
 *   3. feedback is accepted
 *   4. the public.users profile was auto-created by the migration 009 trigger
 *   5. a second submission from the same session is accepted
 *   6. a DIFFERENT session cannot read the first session's feedback
 *   7. sign-out invalidates the session, and replaying the old cookies yields 401
 *   8. a request with no session at all is rejected
 *
 * ── Skips ───────────────────────────────────────────────────────────────────
 * Two independent conditions, both reported as the skip reason so a green run is
 * never mistaken for a verified one:
 *
 *   * `SUPABASE_SKIP_LIVE_TESTS=1`, matching the existing convention.
 *   * Anonymous sign-ins are disabled on the live project. `config.toml` only
 *     configures the LOCAL Supabase instance; the live project has its own
 *     switch under Authentication -> Providers -> Anonymous. Until it is
 *     enabled, `POST /api/auth/sign-in` returns 503 AUTH_UNAVAILABLE and none of
 *     the flow below can be exercised. The preflight probe detects this
 *     explicitly rather than letting the suite fail with a confusing assertion.
 */

// ── Cookie jar ────────────────────────────────────────────────────────────────

/**
 * Mutable cookie store standing in for `next/headers`' `cookies()`.
 *
 * Route Handlers have a writable cookie store, so `lib/supabase/server.ts`'s
 * `setAll` genuinely persists the session in production. The mock reproduces
 * that so a session created by one call is visible to the next, exactly as it
 * would be across two real HTTP requests sharing a cookie jar.
 */
interface StoredCookie {
  name: string;
  value: string;
}

let jar: StoredCookie[] = [];

vi.mock('next/headers', () => ({
  cookies: async () => ({
    getAll: () => jar.map((c) => ({ name: c.name, value: c.value })),
    set: (name: string, value: string) => {
      const existing = jar.findIndex((c) => c.name === name);
      // An empty or immediately-expired value is a deletion, matching Next.
      if (value === '' || value === undefined) {
        if (existing >= 0) jar.splice(existing, 1);
        return;
      }
      if (existing >= 0) jar[existing] = { name, value };
      else jar.push({ name, value });
    },
  }),
}));

// `vi` is used inside the hoisted mock factory above, and is imported at the top
// of the file.

// ── Env ───────────────────────────────────────────────────────────────────────

function readEnvFile(file: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return out;
}

const envPath = resolve(process.cwd(), '.env.local');
const fileEnv = existsSync(envPath) ? readEnvFile(envPath) : {};
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? fileEnv.NEXT_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? fileEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

// Publish the values into process.env so the route handlers under test can see
// them. Vitest does not run the Next.js .env.local loader, and the routes read
// configuration through lib/supabase/env.ts, which reads process.env directly.
// Without this the locals above work for the preflight probe but every route
// call sees an unconfigured project, fails to build a client, and returns
// 503/500 instead of the real result.
//
// This mirrors the established pattern in tests/integration/feedback-api.test.ts.
// No credential is hardcoded: the values are only ever read from the environment
// or from .env.local.
if (url) process.env.NEXT_PUBLIC_SUPABASE_URL = url;
if (anonKey) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = anonKey;

const isPlaceholder = (v: string) => !v || /your-|placeholder|changeme|^</i.test(v);

const BASE_SKIP = isPlaceholder(url) || isPlaceholder(anonKey)
  ? 'Supabase env vars not configured'
  : process.env.SUPABASE_SKIP_LIVE_TESTS === '1'
    ? 'SUPABASE_SKIP_LIVE_TESTS=1'
    : null;

/**
 * Probes whether the live project actually permits anonymous sign-ins.
 *
 * Done against the Auth server directly rather than through the app, so the
 * result is unambiguous and does not depend on route-handler behaviour.
 */
async function probeAnonymousSupport(): Promise<string | null> {
  try {
    const response = await fetch(`${url}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ grant_type: 'anonymous' }),
    });
    if (response.ok) return null;

    const body = await response.json().catch(() => ({}));
    const code = (body as { error_code?: string }).error_code;
    if (code === 'anonymous_provider_disabled') {
      return 'anonymous sign-ins are disabled on the live Supabase project (Authentication -> Providers -> Anonymous must be enabled)';
    }
    return `anonymous sign-in probe failed: ${response.status} ${code ?? 'UNKNOWN'}`;
  } catch (err) {
    return `anonymous sign-in probe could not reach the project: ${
      err instanceof Error ? err.message : 'unknown error'
    }`;
  }
}

let skipReason: string | null = BASE_SKIP;

/**
 * Resolved at COLLECTION time, not in `beforeAll`.
 *
 * `describe.skipIf` is evaluated when the file is loaded, so probing inside a
 * hook is too late: the suite would still be collected, run, and then fail
 * against handlers that were never loaded. A top-level await settles the
 * question before `describe` is ever called.
 */
if (!skipReason) {
  skipReason = await probeAnonymousSupport();
}

// ── Cookie helpers ────────────────────────────────────────────────────────────

/** Session cookies written by @supabase/ssr, in chunk order. */
function sessionCookies(): StoredCookie[] {
  return jar
    .filter((c) => c.name.includes('auth-token'))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}

/**
 * Reassembles the chunked, base64url-encoded session cookie and returns the
 * access token, so DB-level assertions can run as that user.
 */
function accessTokenFromJar(): string | null {
  const cookies = sessionCookies();
  if (cookies.length === 0) return null;

  // Chunk 0 carries the payload; later chunks are appended in index order.
  const combined = cookies
    .map((c) => c.value)
    .join('')
    .replace(/^base64-/, '');

  try {
    const json = Buffer.from(combined, 'base64url').toString('utf8');
    const parsed = JSON.parse(json) as { access_token?: string };
    return parsed.access_token ?? null;
  } catch {
    return null;
  }
}

function cookieHeader(): Record<string, string> {
  const cookies = sessionCookies();
  if (cookies.length === 0) return {};
  return { cookie: cookies.map((c) => `${c.name}=${c.value}`).join('; ') };
}

// ── Route invokers ────────────────────────────────────────────────────────────

type Handlers = {
  signIn: (r: NextRequest) => Promise<Response>;
  signOut: (r: NextRequest) => Promise<Response>;
  session: (r: NextRequest) => Promise<Response>;
  feedback: (r: NextRequest) => Promise<Response>;
};

function post(path: string, body?: unknown, extraHeaders: Record<string, string> = {}): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...extraHeaders },
    body: body === undefined ? '{}' : JSON.stringify(body),
  });
}

async function invoke<T = unknown>(fn: (r: NextRequest) => Promise<Response>, request: NextRequest) {
  const response = await fn(request);
  const json = (await response.json().catch(() => null)) as {
    success?: boolean;
    data?: T;
    error?: { code?: string; message?: string; details?: unknown };
  } | null;
  return { status: response.status, json };
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe.skipIf(skipReason !== null)('anonymous session flow (live)', () => {
  let handlers: Handlers;

  beforeAll(async () => {
    const [signIn, signOut, session, feedback] = await Promise.all([
      import('@/app/api/auth/sign-in/route'),
      import('@/app/api/auth/sign-out/route'),
      import('@/app/api/auth/session/route'),
      import('@/app/api/feedback/route'),
    ]);
    handlers = {
      signIn: signIn.POST,
      signOut: signOut.POST,
      session: session.GET,
      feedback: feedback.POST,
    };
  });

  /**
   * Clear the rate-limit buckets between tests.
   *
   * This suite sends no x-forwarded-for header, so every sign-in lands in the
   * limiter's single no-client-IP bucket. In a non-production environment that
   * bucket is shared, so the several sign-ins spread across this file would
   * exhaust one another's allowance and make results depend on execution order.
   *
   * `_resetBuckets()` is the reset hook the limiter already exposes for tests
   * (`lib/ai/rate-limiter.ts`: "Exposed for tests"), so this reuses the existing
   * mechanism instead of adding one. It changes no production behaviour: the
   * threshold, the per-IP bucketing and the production fail-closed path are all
   * untouched, and this function is only ever called from a test. Rate limiting
   * itself is asserted directly in tests/unit/auth/auth-rate-limit.test.ts and
   * tests/unit/auth/auth-routes.test.ts.
   */
  beforeEach(() => {
    _resetBuckets();
  });

  it('rejects a request with no session', async () => {
    jar = [];
    const { status, json } = await invoke(handlers.session, post('/api/auth/session'));
    expect(status).toBe(200);
    expect(json?.data).toEqual({ signedIn: false });
  });

  it('rejects feedback with no session, before validating the body', async () => {
    jar = [];
    // An invalid body AND no session: the 401 must win, so an anonymous caller
    // learns nothing about the schema.
    const { status, json } = await invoke(
      handlers.feedback,
      post('/api/feedback', { module: 'not-a-module', rating: 99, user_id: 'x' })
    );
    expect(status).toBe(401);
    expect(json?.error?.code).toBe('UNAUTHORIZED');
    expect(json?.error?.details).toBeUndefined();
  });

  it('creates an anonymous session and persists it as cookies', async () => {
    jar = [];
    const { status, json } = await invoke<{ signedIn: boolean; userId: string; created: boolean }>(
      handlers.signIn,
      post('/api/auth/sign-in')
    );

    expect(status).toBe(200);
    expect(json?.success).toBe(true);
    expect(json?.data?.signedIn).toBe(true);
    expect(json?.data?.userId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(json?.data?.created).toBe(true);

    // The session must live in cookies, not in the response body.
    expect(sessionCookies().length).toBeGreaterThan(0);
    expect(JSON.stringify(json)).not.toContain('access_token');
    expect(JSON.stringify(json)).not.toContain('refresh_token');
  });

  it('reports the session as signed in, and creates no second identity', async () => {
    const { status, json } = await invoke<{ signedIn: boolean; userId: string }>(
      handlers.session,
      post('/api/auth/session')
    );
    expect(status).toBe(200);
    expect(json?.data?.signedIn).toBe(true);

    const before = sessionCookies();

    // A second sign-in while a session exists must reuse it, not mint a new user.
    await invoke(handlers.signIn, post('/api/auth/sign-in'));
    expect(sessionCookies()).toEqual(before);
  });

  it('auto-creates the public.users profile via the migration 009 trigger', async () => {
    const token = accessTokenFromJar();
    expect(token, 'expected an access token in the session cookie').not.toBeNull();

    // Reads through the RLS-protected table as the signed-in user. If the
    // trigger had not fired, `users_select_own` would return zero rows.
    const supabase = createSupabaseClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase.from('users').select('id, language').limit(1);
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    expect(data!.length).toBe(1);
    // The CASE in the trigger constrains this to 'en' or 'kn'.
    expect(['en', 'kn']).toContain(data![0].language);
  });

  it('accepts feedback from the session', async () => {
    const { status, json } = await invoke<{ id: string; module: string; rating: number }>(
      handlers.feedback,
      post('/api/feedback', { module: 'loan', rating: 4, comment: 'live auth test' })
    );

    expect(status).toBe(200);
    expect(json?.success).toBe(true);
    expect(json?.data?.module).toBe('loan');
    expect(json!.data!.id).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it('still rejects a body-supplied user_id even when signed in', async () => {
    const { status, json } = await invoke(
      handlers.feedback,
      post('/api/feedback', {
        module: 'loan',
        rating: 4,
        user_id: '99999999-9999-4999-8999-999999999999',
      })
    );
    // .strict() rejects the extra key outright.
    expect(status).toBe(400);
    expect(json?.error?.code).toBe('BAD_REQUEST');
  });

  it('accepts a second submission from the same session', async () => {
    const first = await invoke<{ id: string }>(
      handlers.feedback,
      post('/api/feedback', { module: 'schemes', rating: 5 })
    );
    expect(first.status).toBe(200);

    const second = await invoke<{ id: string }>(
      handlers.feedback,
      post('/api/feedback', { module: 'fraud-check', rating: 3, comment: 'second' })
    );
    expect(second.status).toBe(200);
    expect(second.json?.data?.id).not.toBe(first.json?.data?.id);
  });

  it('does not let a different session read the first session feedback', async () => {
    const tokenA = accessTokenFromJar();
    expect(tokenA).not.toBeNull();

    // Capture what session A can see.
    const clientA = createSupabaseClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${tokenA}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: rowsA } = await clientA.from('feedback').select('id');
    expect(rowsA!.length).toBeGreaterThan(0);
    const idsA = rowsA!.map((r) => r.id as string);

    // A completely separate anonymous session.
    jar = [];
    await invoke(handlers.signIn, post('/api/auth/sign-in'));
    const tokenB = accessTokenFromJar();
    expect(tokenB).not.toBeNull();
    expect(tokenB).not.toBe(tokenA);

    const clientB = createSupabaseClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${tokenB}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: rowsB } = await clientB.from('feedback').select('id');
    const idsB = (rowsB ?? []).map((r) => r.id as string);

    // feedback_select_own is owner-scoped: zero overlap is the whole point.
    expect(idsB.filter((id) => idsA.includes(id))).toEqual([]);

    // And session B's own profile was auto-created too.
    const { data: usersB } = await clientB.from('users').select('id').limit(1);
    expect(usersB!.length).toBe(1);
  });

  it('signs out, and replaying the old cookies is rejected', async () => {
    // Re-establish a session, then keep its cookies for replay.
    jar = [];
    await invoke(handlers.signIn, post('/api/auth/sign-in'));
    const cookiesBefore = sessionCookies();
    expect(cookiesBefore.length).toBeGreaterThan(0);

    const out = await invoke(handlers.session, post('/api/auth/session'));
    expect(out.json?.data).toMatchObject({ signedIn: true });

    const signOut = await invoke(handlers.signOut, post('/api/auth/sign-out'));
    expect(signOut.status).toBe(200);
    expect(signOut.json?.data).toEqual({ signedIn: false });

    // Sign-out is idempotent.
    const again = await invoke(handlers.signOut, post('/api/auth/sign-out'));
    expect(again.status).toBe(200);

    // The jar no longer holds a usable session.
    const afterOut = await invoke(handlers.session, post('/api/auth/session'));
    expect(afterOut.json?.data).toEqual({ signedIn: false });

    // Replaying the pre-sign-out cookies must not resurrect the session: the
    // refresh token was revoked upstream.
    jar = [...cookiesBefore];
    const replayed = await invoke(handlers.session, post('/api/auth/session'));
    expect(replayed.json?.data).toEqual({ signedIn: false });

    const replayedFeedback = await invoke(
      handlers.feedback,
      post('/api/feedback', { module: 'general', rating: 1 })
    );
    expect(replayedFeedback.status).toBe(401);
  });

  it('sign-out ends the session without destroying the feedback it recorded', async () => {
    // Sign-out must be a session operation only. It must NOT delete the
    // public.users profile or any feedback row, because the FK is
    // ON DELETE SET NULL (migration 006) and a cascade would silently strip
    // attribution from feedback the team still needs to act on.
    //
    // Verified structurally: the route calls only auth.signOut() and never
    // touches a table. Deleting a profile would require a service-role client,
    // which does not exist in this project by design.
    const source = readFileSync(
      resolve(process.cwd(), 'app/api/auth/sign-out/route.ts'),
      'utf8'
    );
    expect(source).toContain('auth.signOut()');
    expect(source).not.toMatch(/\.from\(['"`]/);
    expect(source).not.toContain('SERVICE_ROLE');
  });
});

// A separate, unconditional block so the skip reason is always visible in the
// report rather than hidden behind a filtered-out suite.
describe('anonymous session flow preflight', () => {
  it('reports why the live flow may be skipped', async () => {
    if (skipReason) {
      // Surfaced explicitly so a green run is never mistaken for a verified
      // one: a silently skipped suite reads exactly like a passing one.
      console.warn(
        `[auth] live anonymous-session flow SKIPPED — ${skipReason}. ` +
          'The positive auth path is therefore UNVERIFIED until this is resolved.'
      );
      expect(typeof skipReason).toBe('string');
      return;
    }
    // Anonymous sign-ins are enabled and the full suite above is running.
    expect(skipReason).toBeNull();
  });
});
