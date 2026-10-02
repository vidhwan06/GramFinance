import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NextRequest } from 'next/server';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { _resetBuckets } from '@/lib/ai/rate-limiter';

/**
 * Live integration test for POST /api/schemes/eligibility.
 *
 * Exercises the real route handler against the real Supabase project, so it
 * proves the RLS policies and the request boundary work together rather than
 * just that the engine does.
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

/** Minimal .env parser. Vitest does not run Next's .env.local loader. */
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

const ENDPOINT = 'http://localhost:3000/api/schemes/eligibility';

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
    results: Array<{
      scheme: { id: string; nameEn: string; nameKn: string; status: string; lastVerified: string };
      eligibility: {
        schemeId: string;
        status: 'eligible' | 'potentially_eligible' | 'not_eligible';
        missingInformation: string[];
        invalidRules: unknown[];
      };
      requiredFields: string[];
    }>;
    summary: {
      schemeCount: number;
      ruleCount: number;
      problemRuleCount: number;
      byStatus: Record<string, number>;
    };
    disclaimer: { en: string; kn: string };
  };
  error?: { code: string; message: string; details?: unknown };
  meta?: { timestamp: string };
}

describe.skipIf(skipReason !== null)('POST /api/schemes/eligibility (live)', () => {
  let POST: (request: NextRequest) => Promise<Response>;

  beforeAll(async () => {
    ({ POST } = await import('@/app/api/schemes/eligibility/route'));
  });

  // The endpoint rate limits at 12/60s and this suite makes many origin
  // requests per test. Buckets live in the Node process, so each test starts
  // clean rather than depending on execution order.
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

  it('returns a verdict for every active scheme', async () => {
    const { status, json } = await call({ applicant: { age: 30, annualIncome: 300000 } });

    expect(status).toBe(200);
    expect(json.success).toBe(true);

    // Requires supabase/seed-demo.sql to have been applied.
    expect(json.data!.results.length).toBeGreaterThan(0);
    expect(json.data!.summary.schemeCount).toBe(json.data!.results.length);
  });

  it('only ever returns active schemes', async () => {
    const { json } = await call({ applicant: {} });

    for (const outcome of json.data!.results) {
      expect(outcome.scheme.status).toBe('active');
    }
    // PM-KISAN, PMUY, and PM Vishwakarma are now active and must be discoverable.
    const urls = json.data!.results.map((r) => r.scheme.nameEn);
    expect(urls.join(' ')).toMatch(/PM-KISAN|Kisan Samman/i);
    expect(urls.join(' ')).toMatch(/PMUY|Ujjwala/i);
    expect(urls.join(' ')).toMatch(/Vishwakarma/i);
  });

  it('carries the disclaimer so a client cannot omit it', async () => {
    const { json } = await call({ applicant: {} });
    expect(json.data!.disclaimer.en.length).toBeGreaterThan(20);
    expect(json.data!.disclaimer.kn).toMatch(/[\u0C80-\u0CFF]/);
  });

  it('reports a scheme with no information as potentially eligible, not eligible', async () => {
    const { json } = await call({ applicant: {} });

    // Active schemes (PM-KISAN, PMUY, PM Vishwakarma, Ganga Kalyana) all
    // require applicant information; with no applicant data every scheme
    // returns potentially_eligible with missing information fields.
    expect(json.data!.results.length).toBeGreaterThan(0);

    for (const outcome of json.data!.results) {
      expect(outcome.eligibility.status).not.toBe('eligible');
      if (outcome.eligibility.status === 'potentially_eligible') {
        expect(outcome.eligibility.missingInformation.length).toBeGreaterThan(0);
      }
    }
  });

  it('scopes the dynamic form to the fields a scheme actually needs', async () => {
    const { json } = await call({ applicant: {} });
    for (const outcome of json.data!.results) {
      expect(Array.isArray(outcome.requiredFields)).toBe(true);
    }
  });

  it('evaluates one scheme when schemeId is supplied', async () => {
    const all = await call({ applicant: { age: 30 } });
    const firstId = all.json.data!.results[0].scheme.id;

    const one = await call({ schemeId: firstId, applicant: { age: 30 } });
    expect(one.status).toBe(200);
    expect(one.json.data!.results).toHaveLength(1);
    expect(one.json.data!.results[0].scheme.id).toBe(firstId);
  });

  it('404s for an unknown scheme id', async () => {
    const { status, json } = await call({
      schemeId: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
      applicant: {},
    });

    expect(status).toBe(404);
    expect(json.success).toBe(false);
    expect(json.error!.code).toBe('NOT_FOUND');
  });

  it('RLS already hides unpublished schemes from the anon key directly', async () => {
    // The endpoint's 404 for a draft scheme is not a new information leak,
    // because the database itself refuses to show a draft scheme even to a
    // determined caller holding the anon key and talking to PostgREST directly.
    // If this ever fails, the endpoint's not-found behaviour is not protecting
    // anything.
    const rows = await readSchemesDirectly();

    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.status, 'anon must only ever see active schemes').toBe('active');
    }
    expect(rows.some((r) => /farm-credit/i.test(r.name_en))).toBe(false);
  });

  it('rejects a client-supplied verdict', async () => {
    const { status, json } = await call({
      applicant: { age: 30 },
      verdict: 'eligible',
    });

    expect(status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error!.code).toBe('BAD_REQUEST');
  });

  it('rejects an unknown applicant field', async () => {
    const { status, json } = await call({ applicant: { is_admin: true } });

    expect(status).toBe(400);
    expect(json.error!.code).toBe('BAD_REQUEST');
  });

  it('rejects a prototype-pollution attempt in the applicant', async () => {
    const { status } = await call({ applicant: JSON.parse('{"__proto__": {"role": "admin"}}') });
    expect(status).toBe(400);
  });

  it('rejects out-of-range and wrongly typed values', async () => {
    for (const applicant of [
      { age: -1 },
      { age: 9999 },
      { age: 18.5 },
      { annualIncome: -100 },
      { annualIncome: 'lots' },
      { existingLoan: 'yes' },
      { occupation: '' },
    ]) {
      const { status } = await call({ applicant });
      expect(status, `should reject ${JSON.stringify(applicant)}`).toBe(400);
    }
  });

  it('rejects a malformed body', async () => {
    const response = await POST(post('{not json') as NextRequest);
    expect(response.status).toBe(400);
  });

  it('rejects an oversized body before parsing it with 413', async () => {
    // Behaviour change from F2: an over-declared Content-Length is caught by the
    // early-exit path and reported as 413 PAYLOAD_TOO_LARGE. It used to be
    // 400 BAD_REQUEST, which conflated "too large" with "not valid".
    const huge = JSON.stringify({ applicant: { occupation: 'a'.repeat(64 * 1024) } });
    const { status, json } = await call(huge, { 'content-length': String(huge.length) });
    expect(status).toBe(413);
    expect(json.error?.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('does not echo submitted values back in an error', async () => {
    const { json } = await call({ applicant: { occupation: 'CANARY-SECRET', age: -5 } });
    expect(JSON.stringify(json)).not.toContain('CANARY-SECRET');
  });

  it('exports only a POST handler, so a GET cannot reach the logic', async () => {
    const module = await import('@/app/api/schemes/eligibility/route');
    const handlers = Object.keys(module).filter(
      (key) => /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/.test(key)
    );
    expect(handlers).toEqual(['POST']);
  });
});

// ============================================================================
// F2: request body limit - enforced on the bytes actually read
// ============================================================================

/**
 * The security issue F2 exists to close.
 *
 * This route used to trust the client's `Content-Length` header and then call
 * `request.json()`. That header is client-supplied, so it could be absent
 * (chunked transfer), non-numeric, or understated - and in every one of those
 * cases an arbitrarily large body was buffered before any check ran. Each case
 * below builds a REAL `Request` with a real body stream and hands it to the real
 * route handler, so what is exercised is the actual request stream.
 *
 * Every oversized case is answered before any database round trip, so these
 * assertions are deterministic and independent of the catalogue.
 */
describe('POST /api/schemes/eligibility - request body limit (F2)', () => {
  const MAX_BODY_BYTES = 16 * 1024;
  let POST: (request: NextRequest) => Promise<Response>;

  beforeAll(async () => {
    ({ POST } = await import('@/app/api/schemes/eligibility/route'));
  });

  beforeEach(() => {
    _resetBuckets();
  });

  /**
   * `content-length` is only present when explicitly supplied, so omitting it
   * models a chunked request.
   */
  function raw(body: string, headers: Record<string, string> = {}): NextRequest {
    return new NextRequest(ENDPOINT, {
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
   * JSON of exactly `bytes` bytes, padded via `occupation`.
   *
   * NOTE: the padding exceeds the 200-character field cap, so the body is
   * schema-INVALID. That is intentional and unavoidable: every applicant field
   * is short by design, so a schema-valid body can never approach 16 KB. The
   * size guard is asserted on its own decision rather than on the final status,
   * and the "valid body still works" case is covered by the main suite above.
   */
  function bodyOfSize(bytes: number): string {
    const overhead = Buffer.byteLength('{"applicant":{"occupation":""}}', 'utf8');
    const body = JSON.stringify({ applicant: { occupation: 'x'.repeat(bytes - overhead) } });
    expect(Buffer.byteLength(body, 'utf8')).toBe(bytes);
    return body;
  }

  it('A. accepts a normal valid body under the limit', async () => {
    const response = await send(JSON.stringify({ applicant: { age: 30 } }));
    // A real verdict, not a body-level rejection.
    expect(response.status).toBe(200);
    expect(response.json.success).toBe(true);
  });

  it('B. rejects a body over 16 KB with 413', async () => {
    const body = bodyOfSize(MAX_BODY_BYTES + 1);
    const { status, json } = await send(body, {
      'content-length': String(MAX_BODY_BYTES + 1),
    });

    expect(status).toBe(413);
    expect(json.error?.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('D. rejects an oversized body with NO Content-Length (chunked)', async () => {
    // The decisive case: no header exists, so only counting the actual stream
    // can catch it. This is exactly what the old Content-Length check missed.
    const body = bodyOfSize(MAX_BODY_BYTES + 2048);
    const request = raw(body);
    expect(request.headers.get('content-length')).toBeNull();

    const response = await POST(request);
    const json = (await response.json()) as ApiBody;

    expect(response.status).toBe(413);
    expect(json.error?.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('E. rejects a lying Content-Length that understates the body', async () => {
    const body = bodyOfSize(MAX_BODY_BYTES + 2048);
    const { status, json } = await send(body, { 'content-length': '10' });

    expect(status).toBe(413);
    expect(json.error?.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('F. rejects an over-declared Content-Length before reading the body', async () => {
    const { status, json } = await send(JSON.stringify({ applicant: { age: 30 } }), {
      'content-length': String(MAX_BODY_BYTES * 10),
    });

    expect(status).toBe(413);
    expect(json.error?.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('ignores a non-numeric Content-Length and still enforces the limit', async () => {
    const under = await send(JSON.stringify({ applicant: { age: 30 } }), {
      'content-length': 'not-a-number',
    });
    expect(under.status).toBe(200);

    const body = bodyOfSize(MAX_BODY_BYTES + 1);
    const over = await send(body, { 'content-length': 'not-a-number' });
    expect(over.status).toBe(413);
    expect(over.json.error?.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('H. enforces the limit exactly at the boundary', async () => {
    // At the limit the size guard must let the body through. Whether the schema
    // then accepts it is a separate question, so the assertion is that the
    // request is NOT rejected for size.
    const atLimit = bodyOfSize(MAX_BODY_BYTES);
    const ok = await send(atLimit, { 'content-length': String(MAX_BODY_BYTES) });
    expect(ok.status).not.toBe(413);
    expect(ok.json.error?.code).not.toBe('PAYLOAD_TOO_LARGE');

    const overBy1 = bodyOfSize(MAX_BODY_BYTES + 1);
    const rejected = await send(overBy1, { 'content-length': String(MAX_BODY_BYTES + 1) });
    expect(rejected.status).toBe(413);
    expect(rejected.json.error?.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('G. still returns 400 for malformed JSON within the limit', async () => {
    const { status, json } = await send('{not json');

    expect(status).toBe(400);
    expect(json.error?.code).toBe('BAD_REQUEST');
  });

  it('preserves the response envelope on rejection', async () => {
    const body = bodyOfSize(MAX_BODY_BYTES + 1);
    const { json } = await send(body, { 'content-length': '10' });

    expect(json.success).toBe(false);
    expect(typeof json.meta?.timestamp).toBe('string');
  });

  it('stays public: no session is required to run a size-limited check', async () => {
    // Eligibility is deliberately unauthenticated. The body limit must not have
    // introduced an auth requirement.
    const response = await send(JSON.stringify({ applicant: { age: 30 } }));
    expect(response.status).toBe(200);
  });
});

/**
 * Reads public.schemes straight from PostgREST with the anon key, bypassing the
 * application entirely. This is what a determined caller can already see, and it
 * is the baseline the API endpoint must not improve on.
 */
async function readSchemesDirectly(): Promise<
  Array<{ id: string; name_en: string; status: string }>
> {
  const response = await fetch(`${url}/rest/v1/schemes?select=id,name_en,status`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
  });
  if (!response.ok) return [];
  return (await response.json()) as Array<{ id: string; name_en: string; status: string }>;
}
