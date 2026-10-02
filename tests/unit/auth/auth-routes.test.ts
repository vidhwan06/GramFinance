import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { _resetBuckets } from '@/lib/ai/rate-limiter';

/**
 * Unit tests for the three anonymous-session route handlers.
 *
 * These exist because the live integration suite in `tests/integration/
 * auth-api.test.ts` self-skips while anonymous sign-ins are disabled on the
 * Supabase project. Without them, the route logic — error mapping, envelope
 * shape, token handling, idempotence, cookie behaviour — would have NO coverage
 * at all on a machine where the live project is not yet configured.
 *
 * The Supabase client is mocked, so these assert the application's own
 * behaviour: which envelope is produced, what is and is not returned, what gets
 * logged, and in what order the checks run.
 */

const mockAuth = {
  getUser: vi.fn(),
  signInAnonymously: vi.fn(),
  signOut: vi.fn(),
};

const mockCreateClient = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockCreateClient(),
}));

// Mutable so a test can simulate an unconfigured deployment.
let envConfigured = true;
vi.mock('@/lib/supabase/env', () => ({
  getSupabasePublicEnv: () =>
    envConfigured ? { url: 'https://example.supabase.co', anonKey: 'anon-key' } : null,
  getMissingSupabaseEnvVars: () => ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'],
}));

vi.mock('next/headers', () => ({
  cookies: async () => ({ getAll: () => [], setAll: () => undefined, set: () => undefined }),
}));

type Envelope = {
  success?: boolean;
  data?: Record<string, unknown>;
  error?: { code?: string; message?: string; details?: unknown };
  meta?: { timestamp?: string };
};

function post(path: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`, { method: 'POST', headers });
}

function get(path: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`, { method: 'GET', headers });
}

async function call(fn: (r: NextRequest) => Promise<Response>, request: NextRequest) {
  const response = await fn(request);
  const json = (await response.json()) as Envelope;
  return { status: response.status, json };
}

const USER_ID = '11111111-1111-4111-8111-111111111111';
/** Shaped like a real Supabase session, to prove no token leaks into a body. */
const SECRET = 'SUPER-SECRET-ACCESS-TOKEN-VALUE';

/**
 * `types/environment.ts` declares NODE_ENV as a non-optional readonly member of
 * ProcessEnv, so a test that needs to exercise a production-only branch cannot
 * assign to it directly.
 */
function setNodeEnv(value: 'development' | 'production' | 'test'): void {
  (process.env as unknown as Record<string, string | undefined>).NODE_ENV = value;
}

beforeEach(() => {
  vi.clearAllMocks();
  _resetBuckets();
  envConfigured = true;
  setNodeEnv('test');
  mockCreateClient.mockResolvedValue({ auth: mockAuth });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('POST /api/auth/sign-in', () => {
  it('returns the success envelope with only the user id', async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    mockAuth.signInAnonymously.mockResolvedValue({
      data: { user: { id: USER_ID }, session: { access_token: SECRET } },
      error: null,
    });

    const { POST } = await import('@/app/api/auth/sign-in/route');
    const { status, json } = await call(POST, post('/api/auth/sign-in', { 'x-forwarded-for': '1.1.1.1' }));

    expect(status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toEqual({ signedIn: true, userId: USER_ID, created: true });
    expect(typeof json.meta?.timestamp).toBe('string');

    // The decisive assertion: the access token exists in the mocked session but
    // must not appear anywhere in the response.
    expect(JSON.stringify(json)).not.toContain(SECRET);
    expect(JSON.stringify(json)).not.toContain('access_token');
    expect(JSON.stringify(json)).not.toContain('refresh_token');
  });

  it('reuses an existing session instead of minting a second identity', async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });

    const { POST } = await import('@/app/api/auth/sign-in/route');
    const { status, json } = await call(POST, post('/api/auth/sign-in', { 'x-forwarded-for': '1.1.1.1' }));

    expect(status).toBe(200);
    expect(json.data).toEqual({ signedIn: true, userId: USER_ID, created: false });
    expect(mockAuth.signInAnonymously).not.toHaveBeenCalled();
  });

  it('returns a clean 503 when Supabase is not configured', async () => {
    envConfigured = false;

    const { POST } = await import('@/app/api/auth/sign-in/route');
    const { status, json } = await call(POST, post('/api/auth/sign-in', { 'x-forwarded-for': '1.1.1.1' }));

    expect(status).toBe(503);
    expect(json.error?.code).toBe('AUTH_UNAVAILABLE');
    // Must not name the missing environment variables.
    expect(json.error?.message).not.toMatch(/NEXT_PUBLIC_/);
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('maps an upstream refusal to 503 without leaking its message', async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    mockAuth.signInAnonymously.mockResolvedValue({
      data: { user: null },
      error: { code: 'anonymous_provider_disabled', message: 'Anonymous sign-ins are disabled' },
    });

    const { POST } = await import('@/app/api/auth/sign-in/route');
    const { status, json } = await call(POST, post('/api/auth/sign-in', { 'x-forwarded-for': '1.1.1.1' }));

    expect(status).toBe(503);
    expect(json.error?.code).toBe('AUTH_UNAVAILABLE');
    expect(JSON.stringify(json)).not.toContain('anonymous_provider_disabled');
  });

  it('never logs the session or any token', async () => {
    const logs: string[] = [];
    vi.spyOn(console, 'error').mockImplementation((...args) => {
      logs.push(args.map(String).join(' '));
    });
    vi.spyOn(console, 'info').mockImplementation((...args) => {
      logs.push(args.map(String).join(' '));
    });

    mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    mockAuth.signInAnonymously.mockResolvedValue({
      data: { user: { id: USER_ID }, session: { access_token: SECRET, refresh_token: SECRET } },
      error: null,
    });

    const { POST } = await import('@/app/api/auth/sign-in/route');
    await call(POST, post('/api/auth/sign-in', { 'x-forwarded-for': '1.1.1.1' }));

    const all = logs.join('\n');
    expect(all).not.toContain(SECRET);
    expect(all).not.toContain('access_token');
    expect(all).not.toContain('refresh_token');
  });

  it('rate limits by client IP before doing any upstream work', async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    mockAuth.signInAnonymously.mockResolvedValue({
      data: { user: { id: USER_ID } },
      error: null,
    });

    const { POST } = await import('@/app/api/auth/sign-in/route');
    const headers = { 'x-forwarded-for': '4.4.4.4' };

    for (let i = 0; i < 5; i++) {
      expect((await call(POST, post('/api/auth/sign-in', headers))).status).toBe(200);
    }
    const blocked = await call(POST, post('/api/auth/sign-in', headers));
    expect(blocked.status).toBe(429);
    expect(blocked.json.error?.code).toBe('RATE_LIMITED');

    // The limiter must short-circuit before touching Supabase at all.
    const callsBefore = mockAuth.getUser.mock.calls.length;
    await call(POST, post('/api/auth/sign-in', headers));
    expect(mockAuth.getUser.mock.calls.length).toBe(callsBefore);
  });

  it('gives a different IP its own bucket', async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    mockAuth.signInAnonymously.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });

    const { POST } = await import('@/app/api/auth/sign-in/route');
    for (let i = 0; i < 5; i++) {
      await call(POST, post('/api/auth/sign-in', { 'x-forwarded-for': '4.4.4.4' }));
    }
    expect((await call(POST, post('/api/auth/sign-in', { 'x-forwarded-for': '4.4.4.4' }))).status).toBe(429);
    expect((await call(POST, post('/api/auth/sign-in', { 'x-forwarded-for': '5.5.5.5' }))).status).toBe(200);
  });

  it('fails closed in production when no client IP is available', async () => {
    setNodeEnv('production');
    mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const { POST } = await import('@/app/api/auth/sign-in/route');
    const { status, json } = await call(POST, post('/api/auth/sign-in'));

    expect(status).toBe(503);
    expect(json.error?.code).toBe('AUTH_UNAVAILABLE');
    expect(mockAuth.signInAnonymously).not.toHaveBeenCalled();
  });

  it('exports only a POST handler', async () => {
    const mod = await import('@/app/api/auth/sign-in/route');
    const handlers = Object.keys(mod).filter((k) =>
      /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/.test(k)
    );
    expect(handlers).toEqual(['POST']);
  });
});

describe('POST /api/auth/sign-out', () => {
  it('returns the standard envelope and signs out', async () => {
    mockAuth.signOut.mockResolvedValue({ error: null });

    const { POST } = await import('@/app/api/auth/sign-out/route');
    const { status, json } = await call(POST, post('/api/auth/sign-out'));

    expect(status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toEqual({ signedIn: false });
    expect(mockAuth.signOut).toHaveBeenCalled();
  });

  it('is idempotent — a second call also succeeds', async () => {
    mockAuth.signOut.mockResolvedValue({ error: null });

    const { POST } = await import('@/app/api/auth/sign-out/route');
    expect((await call(POST, post('/api/auth/sign-out'))).status).toBe(200);
    expect((await call(POST, post('/api/auth/sign-out'))).status).toBe(200);
  });

  it('returns a clean 503 when Supabase is not configured', async () => {
    envConfigured = false;

    const { POST } = await import('@/app/api/auth/sign-out/route');
    const { status, json } = await call(POST, post('/api/auth/sign-out'));

    expect(status).toBe(503);
    expect(json.error?.code).toBe('AUTH_UNAVAILABLE');
  });

  it('never deletes a table row', async () => {
    mockAuth.signOut.mockResolvedValue({ error: null });
    const client = { auth: mockAuth, from: vi.fn() };
    mockCreateClient.mockResolvedValue(client);

    const { POST } = await import('@/app/api/auth/sign-out/route');
    await call(POST, post('/api/auth/sign-out'));

    // A delete would need a service-role client; neither is present.
    expect(client.from).not.toHaveBeenCalled();
  });

  it('exports only a POST handler, so no GET can end a session', async () => {
    const mod = await import('@/app/api/auth/sign-out/route');
    const handlers = Object.keys(mod).filter((k) =>
      /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/.test(k)
    );
    expect(handlers).toEqual(['POST']);
  });
});

describe('GET /api/auth/session', () => {
  it('reports signed out with HTTP 200 — a normal state, not an error', async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const { GET } = await import('@/app/api/auth/session/route');
    const { status, json } = await call(GET, get('/api/auth/session'));

    expect(status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toEqual({ signedIn: false });
  });

  it('reports signed out when the token cannot be revalidated', async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: { message: 'bad jwt' } });

    const { GET } = await import('@/app/api/auth/session/route');
    const { status, json } = await call(GET, get('/api/auth/session'));

    expect(status).toBe(200);
    expect(json.data).toEqual({ signedIn: false });
  });

  it('reports signed in with only the user id', async () => {
    mockAuth.getUser.mockResolvedValue({
      data: {
        user: {
          id: USER_ID,
          email: 'someone@example.com',
          phone: '+919999999999',
          user_metadata: { language: 'kn' },
          app_metadata: { provider: 'anonymous' },
        },
      },
      error: null,
    });

    const { GET } = await import('@/app/api/auth/session/route');
    const { status, json } = await call(GET, get('/api/auth/session'));

    expect(status).toBe(200);
    expect(json.data).toEqual({ signedIn: true, userId: USER_ID });

    // No profile data of any kind may be exposed.
    const body = JSON.stringify(json);
    expect(body).not.toContain('someone@example.com');
    expect(body).not.toContain('+919999999999');
    expect(body).not.toContain('app_metadata');
    expect(body).not.toContain('user_metadata');
  });

  it('exports only a GET handler', async () => {
    const mod = await import('@/app/api/auth/session/route');
    const handlers = Object.keys(mod).filter((k) =>
      /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/.test(k)
    );
    expect(handlers).toEqual(['GET']);
  });
});
