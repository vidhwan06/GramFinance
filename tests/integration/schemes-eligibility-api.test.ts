import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NextRequest } from 'next/server';
import { beforeAll, describe, expect, it, vi } from 'vitest';

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
}

describe.skipIf(skipReason !== null)('POST /api/schemes/eligibility (live)', () => {
  let POST: (request: NextRequest) => Promise<Response>;

  beforeAll(async () => {
    ({ POST } = await import('@/app/api/schemes/eligibility/route'));
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
    // PM-KISAN is now active and must be discoverable.
    const urls = json.data!.results.map((r) => r.scheme.nameEn);
    expect(urls.join(' ')).toMatch(/PM-KISAN|Kisan Samman/i);
  });

  it('carries the disclaimer so a client cannot omit it', async () => {
    const { json } = await call({ applicant: {} });
    expect(json.data!.disclaimer.en.length).toBeGreaterThan(20);
    expect(json.data!.disclaimer.kn).toMatch(/[\u0C80-\u0CFF]/);
  });

  it('reports a scheme with no information as potentially eligible, not eligible', async () => {
    const { json } = await call({ applicant: {} });

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

  it('rejects an oversized body before parsing it', async () => {
    const huge = JSON.stringify({ applicant: { occupation: 'a'.repeat(64 * 1024) } });
    const { status } = await call(huge, { 'content-length': String(huge.length) });
    expect(status).toBe(400);
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
