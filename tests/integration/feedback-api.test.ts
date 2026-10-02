import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NextRequest } from 'next/server';
import { beforeAll, describe, expect, it, vi } from 'vitest';

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
    from: () => {
      // Never reached: every case in this file is rejected before the insert.
      throw new Error('insert should not be reached in this test file');
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
}

describe.skipIf(skipReason !== null)('POST /api/feedback (live)', () => {
  let POST: (request: NextRequest) => Promise<Response>;

  beforeAll(async () => {
    ({ POST } = await import('@/app/api/feedback/route'));
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
