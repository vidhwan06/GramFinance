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
    const { status, json } = await call({ module: 'loan', rating: 4 });

    expect(status).toBe(401);
    expect(json.success).toBe(false);
    expect(json.error!.code).toBe('UNAUTHORIZED');
  });

  it('returns 400 for an invalid rating', async () => {
    const { status, json } = await call({ module: 'loan', rating: 6 });

    expect(status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error!.code).toBe('BAD_REQUEST');
  });

  it('returns 400 for a missing module', async () => {
    const { status, json } = await call({ rating: 4 });

    expect(status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error!.code).toBe('BAD_REQUEST');
  });

  it('returns 400 for unknown fields', async () => {
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
