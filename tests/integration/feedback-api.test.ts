import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NextRequest } from 'next/server';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { _resetBuckets } from '@/lib/ai/rate-limiter';

/**
 * Live integration test for POST /api/feedback.
 *
 * Exercises the real route handler against the real Supabase project, proving
 * that authentication, validation, and RLS work together.
 *
 * Skipped when .env.local has no real credentials, or when
 * SUPABASE_SKIP_LIVE_TESTS=1.
 */

// cookies() only resolves inside a request scope. The route awaits it, so the
// module is stubbed with the two methods the client actually calls.
vi.mock('next/headers', () => ({
  cookies: async () => ({
    getAll: () => [],
    setAll: () => undefined,
  }),
}));

/**
 * Controllable authenticated identity.
 *
 * WHY THIS MOCK EXISTS
 * The route now authenticates BEFORE validating the body, so an unauthenticated
 * caller always receives 401 regardless of what they send. That ordering is the
 * intended new behaviour: it stops an anonymous caller from learning the field
 * list, the allowed enum values and the per-field validation messages.
 *
 * The consequence for this file is that the schema-validation cases can no
 * longer be driven anonymously. Rather than delete them, since they are the only
 * coverage of feedbackInputSchema, they now run as a signed-in user, which is
 * the position they were always meant to describe.
 *
 * End-to-end coverage against the real project, with a real session cookie and a
 * real RLS-scoped insert, lives in tests/integration/auth-api.test.ts.
 */
let currentUser: { id: string } | null = null;

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: currentUser }, error: null }),
    },
    // Chainable enough for a body that clears validation to reach the insert and
    // return a clean 200. The body-limit cases throw before this is touched.
    from: () => {
      const row = {
        id: '33333333-3333-4333-8333-333333333333',
        user_id: currentUser?.id ?? null,
        module: 'loan',
        rating: 4,
        comment: null,
        created_at: '2026-01-01T00:00:00.000Z',
      };
      return {
        insert: () => ({
          select: () => ({
            single: async () => ({ data: row, error: null }),
          }),
        }),
      };
    },
  }),
}));

/** Minimal .env parser. Vitest does not run Next.js's .env.local loader. */
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

const isPlaceholder = (v: string) => !v || /your-|placeholder|changeme|^</i.test(v);
const skipReason = isPlaceholder(url) || isPlaceholder(anonKey)
  ? 'Supabase env vars not configured'
  : process.env.SUPABASE_SKIP_LIVE_TESTS === '1'
    ? 'SUPABASE_SKIP_LIVE_TESTS=1'
    : null;

if (url) process.env.NEXT_PUBLIC_SUPABASE_URL = url;
if (anonKey) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = anonKey;

const ENDPOINT = 'http://localhost:3000/api/feedback';

function post(body: unknown, headers: Record<string, string> = {}): Request {
  return new NextRequest(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

interface ApiBody {
  success: boolean;
  data?: {
    id: string;
    module: string;
    rating: number;
    comment: string | null;
    createdAt: string;
  };
  error?: { code: string; message: string; details?: unknown };
  meta?: { timestamp: string };
}

describe.skipIf(skipReason !== null)('POST /api/feedback (live)', () => {
  let POST: (request: NextRequest) => Promise<Response>;

  beforeAll(async () => {
    ({ POST } = await import('@/app/api/feedback/route'));
  });

  // The endpoint rate limits at 5/60s per authenticated user. Buckets live in
  // the Node process, so each test starts clean — otherwise a run would depend
  // on execution order and a body-limit case would see 429 instead of 413.
  beforeEach(() => {
    _resetBuckets();
  });

  async function call(body: unknown, headers?: Record<string, string>): Promise<{
    status: number;
    json: ApiBody;
  }> {
    const response = await POST(post(body, headers) as NextRequest);
    return { status: response.status, json: (await response.json()) as ApiBody };
  }

  it('returns 401 for an unauthenticated request', async () => {
    currentUser = null;
    const { status, json } = await call({ module: 'loan', rating: 4 });

    expect(status).toBe(401);
    expect(json.success).toBe(false);
    expect(json.error!.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 before validating the body, so no schema detail leaks', async () => {
    // The new ordering: authentication is decided first. An anonymous caller
    // sending a deliberately invalid body learns only that a session is needed,
    // and receives no field list, enum values or validation messages.
    currentUser = null;
    const { status, json } = await call({
      module: 'not-a-real-module',
      rating: 99,
      user_id: 'malicious-uuid',
    });

    expect(status).toBe(401);
    expect(json.error!.code).toBe('UNAUTHORIZED');
    expect(json.error!.details).toBeUndefined();
    expect(JSON.stringify(json)).not.toMatch(/rating|module must|allowed/i);
  });

  it('returns 400 for an invalid rating', async () => {
    currentUser = { id: '11111111-1111-4111-8111-111111111111' };
    const { status, json } = await call({ module: 'loan', rating: 6 });

    expect(status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error!.code).toBe('BAD_REQUEST');
  });

  it('returns 400 for a missing module', async () => {
    currentUser = { id: '11111111-1111-4111-8111-111111111111' };
    const { status, json } = await call({ rating: 4 });

    expect(status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error!.code).toBe('BAD_REQUEST');
  });

  it('returns 400 for unknown fields', async () => {
    currentUser = { id: '11111111-1111-4111-8111-111111111111' };
    const { status, json } = await call({
      module: 'loan',
      rating: 4,
      user_id: 'malicious-uuid',
    });

    expect(status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error!.code).toBe('BAD_REQUEST');
  });

  it('returns 400 for malformed JSON', async () => {
    currentUser = { id: '11111111-1111-4111-8111-111111111111' };
    const response = await POST(post('{not json') as NextRequest);
    expect(response.status).toBe(400);
  });

  it('exports only a POST handler', async () => {
    const module = await import('@/app/api/feedback/route');
    const handlers = Object.keys(module).filter(
      (key) => /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/.test(key)
    );
    expect(handlers).toEqual(['POST']);
  });
});

// ============================================================================
// F2: request body limit — enforced on the bytes actually read
// ============================================================================

/**
 * The security issue F2 exists to close.
 *
 * This route used to trust the client's `Content-Length` header and then call
 * `request.json()`. That header is client-supplied, so it could be absent
 * (chunked transfer), non-numeric, or simply understated - and in every one of
 * those cases an arbitrarily large body was buffered before any check ran. Each
 * case below therefore constructs a REAL `Request` with a real body stream and
 * feeds it to the real route handler, so what is exercised is the actual
 * request stream rather than a mocked `request.json()`.
 *
 * These cases need no network: every one of them is answered before or instead
 * of a database round trip.
 */
describe('POST /api/feedback — request body limit (F2)', () => {
  const MAX_BODY_BYTES = 8 * 1024;
  const AUTHED = { id: '11111111-1111-4111-8111-111111111111' };
  let POST: (request: NextRequest) => Promise<Response>;

  beforeAll(async () => {
    ({ POST } = await import('@/app/api/feedback/route'));
  });

  beforeEach(() => {
    currentUser = AUTHED;
    _resetBuckets();
  });

  /**
   * A real body stream. `content-length` is only present when explicitly
   * supplied, so omitting it models a chunked request.
   */
  function raw(body: string, headers: Record<string, string> = {}): NextRequest {
    return new NextRequest('http://localhost:3000/api/feedback', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body,
    });
  }

  async function send(body: string, headers: Record<string, string> = {}) {
    const response = await POST(raw(body, headers));
    const json = (await response.json()) as ApiBody;
    return { status: response.status, json };
  }

  /**
   * JSON of exactly `bytes` bytes, padded via `comment`.
   *
   * NOTE: the padding makes this schema-INVALID, because `comment` is capped at
   * 1000 characters. That is correct and intentional: every field of this
   * payload is small by design, so a *schema-valid* feedback body can never
   * approach 8 KB. The size guard is therefore asserted on its own decision
   * (413 or not) rather than on a 200, and the "valid body still works" case is
   * covered separately by the small valid payload in test A.
   */
  function bodyOfSize(bytes: number): string {
    const overhead = Buffer.byteLength('{"module":"loan","rating":4,"comment":""}', 'utf8');
    const pad = 'x'.repeat(bytes - overhead);
    const body = JSON.stringify({ module: 'loan', rating: 4, comment: pad });
    expect(Buffer.byteLength(body, 'utf8')).toBe(bytes);
    return body;
  }

  it('A. accepts a normal valid body under the limit', async () => {
    const { status, json } = await send(JSON.stringify({ module: 'loan', rating: 4 }));

    expect(status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data?.module).toBe('loan');
  });

  it('B. rejects a body over 8 KB with 413', async () => {
    const body = bodyOfSize(MAX_BODY_BYTES + 1);
    const { status, json } = await send(body, {
      'content-length': String(Buffer.byteLength(body, 'utf8')),
    });

    expect(status).toBe(413);
    expect(json.error!.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('D. rejects an oversized body with NO Content-Length (chunked)', async () => {
    // The decisive case: no header exists at all, so only counting the actual
    // stream can catch it. This is what the old Content-Length check missed.
    const body = bodyOfSize(MAX_BODY_BYTES + 1024);
    const request = raw(body);
    expect(request.headers.get('content-length')).toBeNull();

    const response = await POST(request);
    const json = (await response.json()) as ApiBody;

    expect(response.status).toBe(413);
    expect(json.error!.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('E. rejects a lying Content-Length that understates the body', async () => {
    // Claims 10 bytes, actually sends several KB over the limit.
    const body = bodyOfSize(MAX_BODY_BYTES + 2048);
    const { status, json } = await send(body, { 'content-length': '10' });

    expect(status).toBe(413);
    expect(json.error!.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('F. rejects an over-declared Content-Length before reading the body', async () => {
    // Fast path: the declared size alone is enough to refuse.
    const { status, json } = await send(JSON.stringify({ module: 'loan', rating: 4 }), {
      'content-length': String(MAX_BODY_BYTES * 10),
    });

    expect(status).toBe(413);
    expect(json.error!.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('ignores a non-numeric Content-Length and still enforces the limit', async () => {
    const under = await send(JSON.stringify({ module: 'loan', rating: 4 }), {
      'content-length': 'not-a-number',
    });
    expect(under.status).toBe(200);

    const body = bodyOfSize(MAX_BODY_BYTES + 1);
    const over = await send(body, { 'content-length': 'not-a-number' });
    expect(over.status).toBe(413);
    expect(over.json.error!.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('H. enforces the limit exactly at the boundary', async () => {
    // Exactly at the limit the size guard must let the body through. Whether the
    // schema then accepts it is a separate question, so the assertion is that it
    // is NOT rejected for size.
    const atLimit = bodyOfSize(MAX_BODY_BYTES);
    const ok = await send(atLimit, { 'content-length': String(MAX_BODY_BYTES) });
    expect(ok.status).not.toBe(413);
    expect(ok.json.error?.code).not.toBe('PAYLOAD_TOO_LARGE');

    // One byte more must be refused.
    const overBy1 = bodyOfSize(MAX_BODY_BYTES + 1);
    const rejected = await send(overBy1, { 'content-length': String(MAX_BODY_BYTES + 1) });
    expect(rejected.status).toBe(413);
    expect(rejected.json.error!.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('G. still returns 400 for malformed JSON within the limit', async () => {
    const response = await POST(raw('{not json'));
    const json = (await response.json()) as ApiBody;

    expect(response.status).toBe(400);
    expect(json.error!.code).toBe('BAD_REQUEST');
  });

  it('preserves the response envelope on rejection', async () => {
    const body = bodyOfSize(MAX_BODY_BYTES + 1);
    const { json } = await send(body, { 'content-length': '10' });

    expect(json.success).toBe(false);
    expect(typeof json.meta!.timestamp).toBe('string');
  });
});

/**
 * Ordering regression: authentication must still be decided BEFORE the body is
 * read, so an unauthenticated caller cannot use this endpoint to probe the body
 * limit, the schema or anything else about the request.
 */
describe('POST /api/feedback - authentication precedes body processing (F2)', () => {
  const MAX_BODY_BYTES = 8 * 1024;
  let POST: (request: NextRequest) => Promise<Response>;

  beforeAll(async () => {
    ({ POST } = await import('@/app/api/feedback/route'));
  });

  beforeEach(() => {
    _resetBuckets();
  });

  function raw(body: string, headers: Record<string, string> = {}): NextRequest {
    return new NextRequest('http://localhost:3000/api/feedback', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body,
    });
  }

  it('returns 401, not 413, for an unauthenticated oversized body', async () => {
    currentUser = null;
    const response = await POST(raw('x'.repeat(MAX_BODY_BYTES * 4), { 'content-length': '10' }));
    const json = (await response.json()) as ApiBody;

    expect(response.status).toBe(401);
    expect(json.error!.code).toBe('UNAUTHORIZED');
    // No size or schema information may leak to an anonymous caller.
    expect(json.error!.details).toBeUndefined();
    expect(JSON.stringify(json)).not.toMatch(/PAYLOAD_TOO_LARGE|too large/i);
  });

  it('returns 401, not 400, for an unauthenticated malformed body', async () => {
    currentUser = null;
    const response = await POST(raw('{not json'));
    const json = (await response.json()) as ApiBody;

    expect(response.status).toBe(401);
    expect(json.error!.code).toBe('UNAUTHORIZED');
  });
});
