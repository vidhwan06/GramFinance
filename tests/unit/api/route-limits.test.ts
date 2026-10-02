import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { _resetBuckets } from '@/lib/ai/rate-limiter';
import {
  checkRateLimit,
  retryAfterSeconds,
  retryAfterSecondsForKey,
  resolveClientIp,
  ROUTE_LIMITS,
  checkAuthSignInRateLimit,
} from '@/lib/api/rate-limit';

/**
 * F3: shared rate-limit helper, and the per-route budgets built on it.
 *
 * Two things are being proven here:
 *
 *   1. The HELPER behaves correctly on its own - scope isolation, threshold,
 *      independent per-IP buckets, fail-closed in production, spoofed-hop
 *      resistance, the `x-real-ip` fallback, bucket eviction, and `Retry-After`.
 *   2. Each ROUTE applies its documented budget, at the right point in its own
 *      order of operations.
 *
 * Real `NextRequest` objects and the real route handlers are used throughout.
 * Only the two genuinely external dependencies are stubbed - the Supabase client
 * and the Gemini SDK - so that no test depends on network state or on paid quota.
 * The rate limiter itself is deliberately NOT mocked: the point is to exercise
 * the real bucket store.
 */

// ── Stub the Supabase client ─────────────────────────────────────────────────

let currentUser: { id: string } | null = null;

/** Thenable chain, so `await builder` yields `{ data, error }`. */
function table(rows: unknown[]) {
  const builder: Record<string, unknown> = {
    select: () => builder,
    eq: () => builder,
    in: () => builder,
    order: () => builder,
    insert: () => ({
      select: () => ({
        single: async () => ({
          data: {
            id: '44444444-4444-4444-8444-444444444444',
            user_id: currentUser?.id ?? null,
            module: 'loan',
            rating: 4,
            comment: null,
            created_at: '2026-01-01T00:00:00.000Z',
          },
          error: null,
        }),
      }),
    }),
    then: (resolve: (v: unknown) => void) => resolve({ data: rows, error: null }),
  };
  return builder;
}

const SCHEME_ROW = {
  id: '11111111-1111-4111-8111-111111111111',
  name_en: 'PM-KISAN',
  name_kn: 'ಪಿಎಂ ಕಿಸಾನ್',
  description_en: 'Income support.',
  description_kn: 'ಆದಾಯ ನೆರವು.',
  target_groups: ['farmer'],
  states: ['ALL'],
  required_documents: ['aadhaar'],
  official_url: 'https://example.invalid/x',
  last_verified: '2026-09-26',
  status: 'active',
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: currentUser }, error: null }),
      signOut: async () => ({ error: null }),
    },
    from: (tableName: string) => {
      if (tableName === 'schemes') return table([SCHEME_ROW]);
      if (tableName === 'scheme_rules') return table([]);
      if (tableName === 'rule_groups') return table([]);
      if (tableName === 'rule_nodes') return table([]);
      return table([]);
    },
  }),
}));

vi.mock('@/lib/supabase/env', () => ({
  getSupabasePublicEnv: () => ({ url: 'https://example.supabase.co', anonKey: 'anon' }),
  getMissingSupabaseEnvVars: () => [],
}));

vi.mock('@/lib/ai/gemini', () => ({
  getGenerativeModel: () => ({
    generateContent: async () => ({ response: { text: () => 'A calm explanation.' } }),
  }),
}));

vi.mock('next/headers', () => ({
  cookies: async () => ({ getAll: () => [], setAll: () => undefined, set: () => undefined }),
}));

const originalNodeEnv = process.env.NODE_ENV;
function setNodeEnv(value: 'development' | 'production' | 'test'): void {
  (process.env as unknown as Record<string, string | undefined>).NODE_ENV = value;
}

function req(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost:3000/api/x', { method: 'POST', headers });
}

const IP_A = { 'x-forwarded-for': '198.51.100.10' };
const IP_B = { 'x-forwarded-for': '198.51.100.11' };

/** Resolve a route's POST (or GET) handler by path. */
async function getPost(path: string): Promise<(r: NextRequest) => Promise<Response>> {
  const modules: Record<string, () => Promise<Record<string, unknown>>> = {
    '/api/fraud/check': () => import('@/app/api/fraud/check/route'),
    '/api/schemes/eligibility': () => import('@/app/api/schemes/eligibility/route'),
    '/api/feedback': () => import('@/app/api/feedback/route'),
    '/api/assistant': () => import('@/app/api/assistant/route'),
  };
  const mod = await modules[path]();
  return mod.POST as (r: NextRequest) => Promise<Response>;
}

async function getRoute(path: string): Promise<(r: NextRequest) => Promise<Response>> {
  if (path === '/api/schemes') {
    const mod = await import('@/app/api/schemes/route');
    return mod.GET as (r: NextRequest) => Promise<Response>;
  }
  const mod = await import('@/app/api/auth/session/route');
  return mod.GET as (r: NextRequest) => Promise<Response>;
}

beforeEach(() => {
  _resetBuckets();
  currentUser = null;
  setNodeEnv('test');
});

afterEach(() => {
  setNodeEnv(originalNodeEnv as 'development' | 'production' | 'test');
  vi.restoreAllMocks();
});

// ============================================================================
// Shared helper
// ============================================================================

describe('checkRateLimit - shared helper', () => {
  const LIMIT = { scope: 'unit', max: 3, windowMs: 60_000 };

  it('allows exactly `max` then blocks the next', () => {
    for (let i = 0; i < 3; i++) {
      expect(checkRateLimit(req(IP_A), LIMIT).limited).toBe(false);
    }
    expect(checkRateLimit(req(IP_A), LIMIT).limited).toBe(true);
  });

  it('gives separate IPs independent buckets', () => {
    for (let i = 0; i < 3; i++) checkRateLimit(req(IP_A), LIMIT);
    expect(checkRateLimit(req(IP_A), LIMIT).limited).toBe(true);
    expect(checkRateLimit(req(IP_B), LIMIT).limited).toBe(false);
  });

  it('isolates scopes: the same IP cannot drain another scope', () => {
    for (let i = 0; i < 3; i++) checkRateLimit(req(IP_A), LIMIT);
    expect(checkRateLimit(req(IP_A), LIMIT).limited).toBe(true);
    expect(checkRateLimit(req(IP_A), { ...LIMIT, scope: 'other' }).limited).toBe(false);
  });

  it('a spoofed left XFF hop cannot mint a fresh bucket', () => {
    for (let i = 0; i < 3; i++) checkRateLimit(req(IP_A), LIMIT);
    // Prepending a fake left entry must not look like a new client.
    const spoofed = { 'x-forwarded-for': '10.0.0.1, 198.51.100.10' };
    expect(checkRateLimit(req(spoofed), LIMIT).limited).toBe(true);
  });

  it('honours the x-real-ip fallback', () => {
    const real = { 'x-real-ip': '203.0.113.5' };
    for (let i = 0; i < 3; i++) checkRateLimit(req(real), LIMIT);
    expect(checkRateLimit(req(real), LIMIT).limited).toBe(true);
    expect(checkRateLimit(req({ 'x-real-ip': '203.0.113.6' }), LIMIT).limited).toBe(false);
  });

  it('fails closed in production when no client IP is derivable', () => {
    setNodeEnv('production');
    const verdict = checkRateLimit(req(), LIMIT);
    expect(verdict.limited).toBe(true);
    expect(verdict.limited && verdict.reason).toBe('no_client_ip');
  });

  it('never shares a global bucket for header-less requests', () => {
    // The regression this whole helper exists for: the assistant used to fall
    // back to the literal key 'anonymous'.
    for (let i = 0; i < 3; i++) checkRateLimit(req(), LIMIT);
    // A header-less caller must not have consumed the IP-addressed budget...
    expect(checkRateLimit(req(IP_A), LIMIT).limited).toBe(false);
    // ...and an IP-addressed caller must not have unlocked the header-less one.
    for (let i = 0; i < 3; i++) checkRateLimit(req(IP_A), LIMIT);
    expect(checkRateLimit(req(IP_B), LIMIT).limited).toBe(false);
  });

  it('resolveClientIp still reads the rightmost hop and returns null otherwise', () => {
    expect(resolveClientIp(req({ 'x-forwarded-for': '1.1.1.1, 2.2.2.2, 3.3.3.3' }))).toBe('3.3.3.3');
    expect(resolveClientIp(req({ 'x-real-ip': '8.8.8.8' }))).toBe('8.8.8.8');
    expect(resolveClientIp(req())).toBeNull();
  });

  it('evicts oldest buckets rather than growing without bound', async () => {
    const { _resetBuckets: reset } = await import('@/lib/ai/rate-limiter');
    reset();
    // 10_000 MAX_BUCKETS; pushing past it must not throw and must keep working.
    for (let i = 0; i < 10_050; i++) {
      checkRateLimit(req({ 'x-forwarded-for': `10.0.${Math.floor(i / 250)}.${i % 250}` }), LIMIT);
    }
    // Still functional after eviction pressure.
    expect(checkRateLimit(req(IP_B), LIMIT).limited).toBe(false);
    reset();
  });

  it('preserves the F1 sign-in behaviour through the shared helper', () => {
    for (let i = 0; i < 5; i++) checkAuthSignInRateLimit(req(IP_A));
    expect(checkAuthSignInRateLimit(req(IP_A)).limited).toBe(true);
    expect(checkAuthSignInRateLimit(req(IP_B)).limited).toBe(false);
  });
});

describe('retryAfterSeconds', () => {
  const LIMIT = { scope: 'retry', max: 1, windowMs: 60_000 };

  beforeEach(() => {
    _resetBuckets();
  });

  it('is undefined when the caller is not limited', () => {
    expect(retryAfterSeconds(req(IP_A), LIMIT)).toBeUndefined();
  });

  it('reports whole seconds once limited, and never zero', () => {
    checkRateLimit(req(IP_A), LIMIT);
    checkRateLimit(req(IP_A), LIMIT);
    expect(checkRateLimit(req(IP_A), LIMIT).limited).toBe(true);

    const value = retryAfterSeconds(req(IP_A), LIMIT);
    expect(typeof value).toBe('number');
    expect(value).toBeGreaterThanOrEqual(1);
    expect(value).toBeLessThanOrEqual(60);
  });

  it('does not count as traffic when read', () => {
    checkRateLimit(req(IP_A), LIMIT);
    checkRateLimit(req(IP_A), LIMIT);
    expect(checkRateLimit(req(IP_A), LIMIT).limited).toBe(true);
    const before = retryAfterSeconds(req(IP_A), LIMIT);
    // Reading the retry value must not push the window forward or consume budget.
    retryAfterSeconds(req(IP_A), LIMIT);
    retryAfterSeconds(req(IP_A), LIMIT);
    expect(retryAfterSeconds(req(IP_A), LIMIT)).toBe(before);
  });

  it('key-based variant resolves without mutating', () => {
    expect(retryAfterSecondsForKey('nothing-here')).toBeUndefined();
  });
});

// ============================================================================
// Per-route budgets
// ============================================================================

describe('POST /api/assistant - 10/60s per IP', () => {
  it('allows 10, then 429 on the 11th', async () => {
    const POST = await getPost('/api/assistant');
    const body = { message: 'What is an EMI?', language: 'en' as const };

    for (let i = 0; i < 10; i++) {
      const response = await POST(
        new NextRequest('http://localhost:3000/api/assistant', {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...IP_A },
          body: JSON.stringify(body),
        })
      );
      expect(response.status, `request ${i + 1}`).toBe(200);
    }

    const blocked = await POST(
      new NextRequest('http://localhost:3000/api/assistant', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...IP_A },
        body: JSON.stringify(body),
      })
    );
    expect(blocked.status).toBe(429);
    expect((await blocked.json()).error.code).toBe('RATE_LIMITED');
    expect(blocked.headers.get('retry-after')).toBeTruthy();
  });

  it('leaves a different IP unaffected', async () => {
    const POST = await getPost('/api/assistant');
    const body = { message: 'hello', language: 'en' as const };
    const call = (headers: Record<string, string>) =>
      POST(
        new NextRequest('http://localhost:3000/api/assistant', {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...headers },
          body: JSON.stringify(body),
        })
      );

    for (let i = 0; i < 10; i++) await call(IP_A);
    expect((await call(IP_A)).status).toBe(429);
    expect((await call(IP_B)).status).toBe(200);
  });

  it('does not fall back to a global "anonymous" bucket', async () => {
    const POST = await getPost('/api/assistant');
    const body = { message: 'hello', language: 'en' as const };
    const call = (headers: Record<string, string>) =>
      POST(
        new NextRequest('http://localhost:3000/api/assistant', {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...headers },
          body: JSON.stringify(body),
        })
      );

    // Exhaust the header-less budget...
    for (let i = 0; i < 10; i++) await call({});
    expect((await call({})).status).toBe(429);

    // ...which must not have touched any IP-addressed budget.
    expect((await call(IP_A)).status).toBe(200);
    expect((await call(IP_B)).status).toBe(200);
  });
});

describe('GET /api/schemes - 60/60s per IP plus public caching', () => {
  it('allows 60, then 429 on the 61st', async () => {
    const GET = await getRoute('/api/schemes');
    const call = (headers: Record<string, string>) =>
      GET(new NextRequest('http://localhost:3000/api/schemes', { headers }));

    for (let i = 0; i < 60; i++) {
      expect((await call(IP_A)).status, `request ${i + 1}`).toBe(200);
    }
    const blocked = await call(IP_A);
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('retry-after')).toBeTruthy();
    expect((await call(IP_B)).status).toBe(200);
  });

  it('sends public caching headers and an ETag', async () => {
    const GET = await getRoute('/api/schemes');
    const response = await GET(new NextRequest('http://localhost:3000/api/schemes', {}));

    expect(response.headers.get('cache-control')).toBe(
      'public, max-age=60, s-maxage=300, stale-while-revalidate=600'
    );
    expect(response.headers.get('etag')).toMatch(/^"[0-9a-f]{32}"$/);
    // No Vary: the payload is identical regardless of Accept-Language.
    expect(response.headers.get('vary')).toBeNull();
  });

  it('answers 304 for a matching If-None-Match, with no body', async () => {
    const GET = await getRoute('/api/schemes');
    const first = await GET(new NextRequest('http://localhost:3000/api/schemes', {}));
    const etag = first.headers.get('etag')!;

    const second = await GET(
      new NextRequest('http://localhost:3000/api/schemes', { headers: { 'if-none-match': etag } })
    );
    expect(second.status).toBe(304);
    expect(await second.text()).toBe('');
    expect(second.headers.get('etag')).toBe(etag);
  });

  it('returns a byte-identical body across IP, language and a bogus cookie', async () => {
    const GET = await getRoute('/api/schemes');
    const fetchBody = async (headers: Record<string, string>) => {
      const r = await GET(new NextRequest('http://localhost:3000/api/schemes', { headers }));
      const json = await r.json();
      return JSON.stringify({ ...json, meta: undefined });
    };

    const base = await fetchBody(IP_A);
    expect(await fetchBody(IP_B)).toBe(base);
    expect(await fetchBody({ 'accept-language': 'kn' })).toBe(base);
    expect(
      await fetchBody({ cookie: 'sb-garbage-auth-token=nonsense', 'accept-language': 'kn' })
    ).toBe(base);
  });

  it('serves only active schemes, so a draft can never reach a cache', async () => {
    const GET = await getRoute('/api/schemes');
    const r = await GET(new NextRequest('http://localhost:3000/api/schemes', {}));
    const json = (await r.json()) as { data: { schemes: Array<{ status: string }> } };

    expect(json.data.schemes.length).toBeGreaterThan(0);
    for (const s of json.data.schemes) expect(s.status).toBe('active');
  });
});

describe('POST /api/schemes/eligibility - 12/60s per IP', () => {
  it('allows 12, then 429 on the 13th, and F2 body limits still apply', async () => {
    const POST = await getPost('/api/schemes/eligibility');
    const call = (headers: Record<string, string>, body: unknown = { applicant: {} }) =>
      POST(
        new NextRequest('http://localhost:3000/api/schemes/eligibility', {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...headers },
          body: JSON.stringify(body),
        })
      );

    for (let i = 0; i < 12; i++) {
      expect((await call(IP_A)).status, `request ${i + 1}`).toBe(200);
    }
    expect((await call(IP_A)).status).toBe(429);
    expect((await call(IP_B)).status).toBe(200);

    // F2: the 16 KB cap is unchanged and still returns 413 on a fresh bucket.
    const huge = JSON.stringify({ applicant: { occupation: 'A'.repeat(20 * 1024) } });
    const oversized = await POST(
      new NextRequest('http://localhost:3000/api/schemes/eligibility', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'content-length': '10' },
        body: huge,
      })
    );
    expect(oversized.status).toBe(413);
  });
});

describe('POST /api/fraud/check - 20/60s per IP', () => {
  it('allows 20, then 429 on the 21st, and F2 body limits still apply', async () => {
    const POST = await getPost('/api/fraud/check');
    const call = (headers: Record<string, string>) =>
      POST(
        new NextRequest('http://localhost:3000/api/fraud/check', {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...headers },
          body: JSON.stringify({ inputType: 'message', text: 'hello' }),
        })
      );

    for (let i = 0; i < 20; i++) {
      expect((await call(IP_A)).status, `request ${i + 1}`).toBe(200);
    }
    expect((await call(IP_A)).status).toBe(429);
    expect((await call(IP_B)).status).toBe(200);

    const oversized = await POST(
      new NextRequest('http://localhost:3000/api/fraud/check', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'content-length': '10' },
        body: 'x'.repeat(40 * 1024),
      })
    );
    expect(oversized.status).toBe(413);
  });
});

describe('GET /api/auth/session - 60/60s per IP, still public', () => {
  it('allows 60, then 429 on the 61st', async () => {
    const GET = await getRoute('/api/auth/session');
    const call = (headers: Record<string, string>) =>
      GET(new NextRequest('http://localhost:3000/api/auth/session', { headers }));

    for (let i = 0; i < 60; i++) {
      const r = await call(IP_A);
      expect(r.status, `request ${i + 1}`).toBe(200);
      // Still reachable without a session - that is the whole point.
      expect(((await r.json()) as { data: { signedIn: boolean } }).data.signedIn).toBe(false);
    }
    expect((await call(IP_A)).status).toBe(429);
    expect((await call(IP_B)).status).toBe(200);
  });
});

describe('POST /api/feedback - 5/60s per authenticated user, after auth', () => {
  const USER_A = 'aaaaaaaa-1111-4111-8111-111111111111';
  const USER_B = 'bbbbbbbb-2222-4222-8222-222222222222';

  it('allows 5, then 429 on the 6th for the same user', async () => {
    currentUser = { id: USER_A };
    const POST = await getPost('/api/feedback');
    const call = () =>
      POST(
        new NextRequest('http://localhost:3000/api/feedback', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ module: 'loan', rating: 4 }),
        })
      );

    for (let i = 0; i < 5; i++) {
      expect((await call()).status, `request ${i + 1}`).toBe(200);
    }
    const blocked = await call();
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('retry-after')).toBeTruthy();
  });

  it('gives a different authenticated user an independent bucket', async () => {
    currentUser = { id: USER_A };
    const POST = await getPost('/api/feedback');
    const call = () =>
      POST(
        new NextRequest('http://localhost:3000/api/feedback', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ module: 'loan', rating: 4 }),
        })
      );

    for (let i = 0; i < 6; i++) await call();
    expect((await call()).status).toBe(429);

    currentUser = { id: USER_B };
    expect((await call()).status).toBe(200);
  });

  it('returns 401, not 429, for an unauthenticated caller over the limit', async () => {
    // Drain one user's budget, then present an anonymous request. The limiter
    // must never fire before authentication.
    currentUser = { id: USER_A };
    const POST = await getPost('/api/feedback');
    const call = () =>
      POST(
        new NextRequest('http://localhost:3000/api/feedback', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ module: 'loan', rating: 4 }),
        })
      );

    for (let i = 0; i < 6; i++) await call();
    expect((await call()).status).toBe(429);

    currentUser = null;
    const anonymous = await call();
    expect(anonymous.status).toBe(401);
    expect(((await anonymous.json()) as { error: { code: string } }).error.code).toBe(
      'UNAUTHORIZED'
    );
  });

  it('keys on the user id, not the IP, so one IP cannot drain another user', async () => {
    const POST = await getPost('/api/feedback');
    const call = (headers: Record<string, string>) =>
      POST(
        new NextRequest('http://localhost:3000/api/feedback', {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...headers },
          body: JSON.stringify({ module: 'loan', rating: 4 }),
        })
      );

    currentUser = { id: USER_A };
    for (let i = 0; i < 6; i++) await call(IP_A);
    expect((await call(IP_A)).status).toBe(429);

    // A different user behind the SAME IP is unaffected.
    currentUser = { id: USER_B };
    expect((await call(IP_A)).status).toBe(200);

    // The same user from a different IP shares the same budget.
    currentUser = { id: USER_A };
    expect((await call(IP_B)).status).toBe(429);
  });
});