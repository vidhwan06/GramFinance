import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { ApiResponse } from '@/types/api';
import type { LessonSummary, ModuleInfo } from '@/features/learning/types';

/** Shape returned by GET /api/learning/lessons: `successResponse({ lessons, modules })`. */
type LessonsListPayload = {
  lessons: LessonSummary[];
  modules: ModuleInfo[];
};

vi.mock('next/headers', () => ({
  cookies: async () => ({
    getAll: () => [],
    setAll: () => undefined,
  }),
}));

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

describe.skipIf(skipReason !== null)('Financial Learning API Routes Integration (live)', () => {
  /**
   * Every handler is invoked with a real `NextRequest`, exactly as the App Router
   * invokes it.
   *
   * `lessonsGet` used to be called with no argument, which was correct only while
   * the route took no request at all. It now reads headers for its rate-limit
   * bucket, so it needs the request the framework always supplies — calling it
   * with `undefined` throws inside `resolveClientIp` and surfaces as a 500.
   */
  let lessonsGet: (req: NextRequest) => Promise<Response>;
  let lessonDetailGet: (
    req: NextRequest,
    context: { params: Promise<{ lessonId: string }> }
  ) => Promise<Response>;
  let quizSubmitPost: (req: NextRequest) => Promise<Response>;

  /** A request carrying a proxy IP, so the route's bucket is IP-keyed as in production. */
  const get = (path: string) =>
    new NextRequest(`http://localhost:3000${path}`, {
      headers: { 'x-forwarded-for': '198.51.100.10' },
    });

  beforeAll(async () => {
    const lessonsModule = await import('@/app/api/learning/lessons/route');
    lessonsGet = lessonsModule.GET;

    const lessonDetailModule = await import('@/app/api/learning/lessons/[lessonId]/route');
    lessonDetailGet = lessonDetailModule.GET;

    const quizSubmitModule = await import('@/app/api/learning/quiz/submit/route');
    quizSubmitPost = quizSubmitModule.POST;
  });

  describe('GET /api/learning/lessons', () => {
    it('returns a successful API response envelope', async () => {
      const response = await lessonsGet(get('/api/learning/lessons'));
      expect(response.status).toBe(200);

      const json = (await response.json()) as ApiResponse<LessonsListPayload>;

      expect(json.success).toBe(true);
      expect(json.data).toBeDefined();
      expect(Array.isArray(json.data?.lessons)).toBe(true);
      expect(Array.isArray(json.data?.modules)).toBe(true);
      expect(json.meta?.timestamp).toBeDefined();
    });
  });

  describe('GET /api/learning/lessons/[lessonId]', () => {
    it('returns 400 Bad Request when lessonId is not a valid UUID', async () => {
      const req = get('/api/learning/lessons/invalid-uuid');
      const response = await lessonDetailGet(req, {
        params: Promise.resolve({ lessonId: 'not-a-uuid' }),
      });

      expect(response.status).toBe(400);
      const json = (await response.json()) as { success: boolean; error: { code: string } };
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('BAD_REQUEST');
    });

    it('returns 404 Not Found for a non-existent UUID', async () => {
      const req = get('/api/learning/lessons/00000000-0000-4000-8000-000000000000');
      const response = await lessonDetailGet(req, {
        params: Promise.resolve({ lessonId: '00000000-0000-4000-8000-000000000000' }),
      });

      expect(response.status).toBe(404);
      const json = (await response.json()) as { success: boolean; error: { code: string } };
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('NOT_FOUND');
    });
  });

  describe('POST /api/learning/quiz/submit', () => {
    it('returns 401, not a validation report, for an unauthenticated invalid body', async () => {
      // This route now authenticates BEFORE validating. The previous order sent
      // a fully populated Zod error report to anonymous callers, which disclosed
      // the entire request schema. A schema-invalid body from a caller with no
      // session must therefore be refused as unauthenticated, with no detail.
      const req = new NextRequest('http://localhost:3000/api/learning/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '198.51.100.10' },
        body: JSON.stringify({ incomplete: true }),
      });

      const response = await quizSubmitPost(req);
      expect(response.status).toBe(401);

      const json = (await response.json()) as {
        success: boolean;
        error: { code: string; details?: unknown };
      };
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('UNAUTHORIZED');
      // No schema disclosure to an anonymous caller.
      expect(json.error.details).toBeUndefined();
    });

    it('returns 401 Unauthorized for unauthenticated quiz submit caller', async () => {
      const req = new NextRequest('http://localhost:3000/api/learning/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '198.51.100.10' },
        body: JSON.stringify({
          lessonId: '10000000-0000-4000-8000-000000000001',
          quizId: '20000000-0000-4000-8000-000000000001',
          lang: 'en',
          answers: [{ questionId: 'q-bank-1', selectedIndex: 0 }],
        }),
      });

      const response = await quizSubmitPost(req);
      expect(response.status).toBe(401);

      const json = (await response.json()) as { success: boolean; error: { code: string } };
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('UNAUTHORIZED');
    });
  });
});
