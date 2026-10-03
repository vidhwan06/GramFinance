import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { _resetBuckets } from '@/lib/ai/rate-limiter';

/**
 * Final security audit, learning module. P1-2, P1-3 and P1-4.
 *
 * ── Why this is separate from route-limits.test.ts ───────────────────────────
 * That file proves the limiter works, with a Supabase mock that always succeeds.
 * This file needs the opposite two things: a session that can be present or
 * absent per test, and a database that can FAIL with a realistic PostgREST
 * error. `vi.mock` is module-scoped per file, so sharing one mock across both
 * would mean either a failure switch leaking into the rate-limit proofs or
 * losing the ability to assert each independently.
 *
 * ── What is actually being pinned ───────────────────────────────────────────
 *   P1-2  the body limit survives a lying or absent Content-Length
 *   P1-3  authentication precedes validation, and validation uses the shared
 *         formatter rather than raw `parsed.error.format()`
 *   P1-4  a PostgREST failure reaches the client as a fixed message, with the
 *         raw database text nowhere in the response
 */

let currentUser: { id: string } | null = null;

/** Set by a test to make the `lessons` read fail the way PostgREST does. */
let lessonsError: PostgrestError | null = null;

/**
 * The shape a PostgREST failure actually has.
 *
 * `details` is genuinely nullable in the SDK's type - the real error carries
 * `details: null` - so it is typed as such rather than as an optional string.
 * Typing it loosely here would have hidden the very mismatch this file exists
 * to exercise.
 */
interface PostgrestError {
  code: string;
  message: string;
  details?: string | null;
  hint?: string | null;
}

const LESSON_ROW = {
  id: '10000000-0000-4000-8000-000000000001',
  category: 'banking',
  difficulty: 'beginner',
  status: 'active',
  title_en: 'Bank accounts',
  title_kn: 'ಬ್ಯಾಂಕ್ ಖಾತೆಗಳು',
  content_en: {
    concept: 'Accounts',
    explanation: 'How accounts work.',
    example: 'Savings account',
    visual: 'Diagram',
    commonMistakes: 'None',
    practicalTakeaway: 'Keep records',
  },
  content_kn: null,
  sort_order: 1,
  updated_at: '2026-01-01T00:00:00.000Z',
};

const QUIZ_ROW = {
  id: '30000000-0000-4000-8000-000000000001',
  lesson_id: '10000000-0000-4000-8000-000000000001',
  questions_en: [
    {
      id: 'q-1',
      question: 'What is an EMI?',
      options: ['A fixed monthly payment', 'A one-off fee'],
      correctAnswerIndex: 0,
      explanation: 'An EMI is the fixed monthly payment.',
    },
  ],
  questions_kn: [],
};

function table(rows: unknown[], error: unknown = null) {
  const builder: Record<string, unknown> = {
    select: () => builder,
    eq: () => builder,
    order: () => builder,
    single: async () => ({ data: rows[0] ?? null, error: null }),
    maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
    then: (resolve: (v: unknown) => void) => resolve({ data: error ? null : rows, error }),
  };
  return builder;
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: currentUser }, error: null }),
    },
    from: (tableName: string) => {
      if (tableName === 'lessons') return table([LESSON_ROW], lessonsError);
      if (tableName === 'quizzes') return table([QUIZ_ROW]);
      return table([]);
    },
  }),
}));

vi.mock('@/lib/supabase/env', () => ({
  getSupabasePublicEnv: () => ({ url: 'https://example.supabase.co', anonKey: 'anon' }),
  getMissingSupabaseEnvVars: () => [],
}));

vi.mock('next/headers', () => ({
  cookies: async () => ({ getAll: () => [], setAll: () => undefined, set: () => undefined }),
}));

const LESSON_UUID = '10000000-0000-4000-8000-000000000001';
const QUIZ_UUID = '30000000-0000-4000-8000-000000000001';

const VALID_BODY = {
  lessonId: LESSON_UUID,
  quizId: QUIZ_UUID,
  lang: 'en',
  answers: [{ questionId: 'q-1', selectedIndex: 0 }],
};

async function post(body: BodyInit, headers: Record<string, string> = {}) {
  const { POST } = await import('@/app/api/learning/quiz/submit/route');
  return POST(
    new NextRequest('http://localhost:3000/api/learning/quiz/submit', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '198.51.100.10', ...headers },
      body,
    })
  );
}

async function lessonsGet() {
  const { GET } = await import('@/app/api/learning/lessons/route');
  return GET(
    new NextRequest('http://localhost:3000/api/learning/lessons', {
      headers: { 'x-forwarded-for': '198.51.100.10' },
    })
  );
}

type ErrorBody = { success: boolean; error: { code: string; message: string; details?: unknown } };

beforeEach(() => {
  _resetBuckets();
  currentUser = { id: 'aaaaaaaa-1111-4111-8111-111111111111' };
  lessonsError = null;
});

// ============================================================================
// P1-2 - the request body is genuinely bounded
// ============================================================================

describe('P1-2 quiz submit body is bounded', () => {
  it('returns 413 when Content-Length is honest and the body is oversized', async () => {
    const huge = JSON.stringify({ ...VALID_BODY, padding: 'A'.repeat(20 * 1024) });
    const response = await post(huge);
    expect(response.status).toBe(413);
    expect(((await response.json()) as ErrorBody).error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('returns 413 when Content-Length UNDERSTATES the real body size', async () => {
    // The original bug: the guard trusted `content-length`, so declaring "10"
    // while sending 20 KB skipped the check entirely and `request.json()`
    // buffered all of it. `readJsonBody` counts bytes as it reads.
    const huge = JSON.stringify({ ...VALID_BODY, padding: 'A'.repeat(20 * 1024) });
    const response = await post(huge, { 'content-length': '10' });
    expect(response.status).toBe(413);
  });

  it('returns 413 when Content-Length is absent entirely (chunked upload)', async () => {
    // A ReadableStream body cannot carry a Content-Length, which is exactly how
    // a chunked request reaches the server. Nothing about the header is
    // trustworthy, so the limit has to come from the counted read.
    const payload = JSON.stringify({ ...VALID_BODY, padding: 'A'.repeat(20 * 1024) });
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(payload));
        controller.close();
      },
    });
    const response = await post(stream);
    expect(response.status).toBe(413);
  });

  it('still accepts a normal-sized submission', async () => {
    const response = await post(JSON.stringify(VALID_BODY));
    expect(response.status).toBe(200);
  });

  it('keeps the 400 for malformed JSON, not a 413 or 500', async () => {
    const response = await post('{ not json');
    expect(response.status).toBe(400);
    const json = (await response.json()) as ErrorBody;
    expect(json.error.code).toBe('BAD_REQUEST');
    expect(json.error.message).toBe('Request body must be valid JSON.');
  });

  it('does not echo the submitted content back in the error', async () => {
    const response = await post(JSON.stringify({ ...VALID_BODY, lessonId: 'CANARY-VALUE' }));
    const text = await response.text();
    expect(text).not.toContain('CANARY-VALUE');
  });

  it('answers 401, not 413, for an oversized body without a session', async () => {
    // Auth precedes the body read, so the size limit cannot be probed anonymously.
    currentUser = null;
    const huge = JSON.stringify({ ...VALID_BODY, padding: 'A'.repeat(20 * 1024) });
    const response = await post(huge, { 'content-length': '10' });
    expect(response.status).toBe(401);
  });
});

// ============================================================================
// P1-3 - authentication precedes validation
// ============================================================================

describe('P1-3 quiz submit authenticates before validating', () => {
  it('returns 401 for an unauthenticated request with a schema-invalid body', async () => {
    currentUser = null;
    const response = await post(JSON.stringify({ incomplete: true }));
    expect(response.status).toBe(401);

    const json = (await response.json()) as ErrorBody;
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('leaks no validation detail to an unauthenticated caller', async () => {
    // The regression this whole ordering change exists for. Previously the body
    // was parsed and validated BEFORE getUser(), so an anonymous caller received
    // a fully populated Zod report describing the entire request schema.
    currentUser = null;
    const response = await post(JSON.stringify({ incomplete: true, extra: 'x' }));
    const text = await response.text();

    // No issue list at all.
    expect((JSON.parse(text) as ErrorBody).error.details).toBeUndefined();

    // And none of the schema's field names or constraint text.
    for (const leak of [
      'lessonId',
      'quizId',
      'selectedIndex',
      'Invalid lessonId UUID',
      'At least one answer',
      'must be non-negative',
      'strict',
    ]) {
      expect(text, `unauthenticated response leaked "${leak}"`).not.toContain(leak);
    }
  });

  it('returns the normal formatted validation response once authenticated', async () => {
    const response = await post(JSON.stringify({ incomplete: true }));
    expect(response.status).toBe(400);

    const json = (await response.json()) as ErrorBody;
    expect(json.error.code).toBe('BAD_REQUEST');
    expect(json.error.message).toBe('Invalid submission payload.');

    // The SHARED formatter's shape: an array of { path, message }. Not Zod's
    // nested `error.format()` output.
    const details = json.error.details as Array<{ path: string; message: string }>;
    expect(Array.isArray(details)).toBe(true);
    expect(details.length).toBeGreaterThan(0);
    for (const issue of details) {
      expect(typeof issue.path).toBe('string');
      expect(typeof issue.message).toBe('string');
      // No Zod internal keys such as `_errors` or `received`.
      expect(Object.keys(issue).sort()).toEqual(['message', 'path']);
    }

    const paths = details.map((d) => d.path);
    expect(paths).toContain('lessonId');
    expect(paths).toContain('answers');
  });

  it('reports a bad UUID through the shared formatter', async () => {
    const response = await post(JSON.stringify({ ...VALID_BODY, lessonId: 'not-a-uuid' }));
    expect(response.status).toBe(400);
    const json = (await response.json()) as ErrorBody;
    const details = json.error.details as Array<{ path: string; message: string }>;
    expect(details[0].path).toBe('lessonId');
    expect(details[0].message).toBe('Invalid lessonId UUID');
  });

  it('still scores a valid submission', async () => {
    const response = await post(JSON.stringify(VALID_BODY));
    expect(response.status).toBe(200);
    const json = (await response.json()) as { success: boolean; data: { score: number } };
    expect(json.success).toBe(true);
    expect(json.data.score).toBe(1);
  });

  it('runs getUser() before safeParse in the source', async () => {
    // A structural guard, so a future edit cannot quietly restore the old order.
    const { readFileSync } = await import('node:fs');
    const source = readFileSync('app/api/learning/quiz/submit/route.ts', 'utf8');
    expect(source.indexOf('supabase.auth.getUser()')).toBeGreaterThan(-1);
    expect(source.indexOf('supabase.auth.getUser()')).toBeLessThan(
      source.indexOf('quizSubmissionRequestSchema.safeParse')
    );
  });
});

// ============================================================================
// P1-4 - PostgREST errors are not exposed
// ============================================================================

describe('P1-4 database failures are sanitised', () => {
  /** A realistic PostgREST failure whose message enumerates the schema. */
  const POSTGREST_FAILURE = {
    code: '42703',
    message: 'column lessons.sort_order does not exist',
    details: null,
    hint: 'Perhaps you meant the column public.lessons.status',
  };

  it('returns a fixed message with no database text', async () => {
    lessonsError = POSTGREST_FAILURE;
    const response = await lessonsGet();

    expect(response.status).toBe(500);
    const text = await response.text();
    const json = JSON.parse(text) as ErrorBody;

    expect(json.error.code).toBe('INTERNAL_ERROR');
    expect(json.error.message).toBe('Could not load lessons. Please try again later.');
  });

  it('keeps every part of the raw error out of the response body', async () => {
    lessonsError = POSTGREST_FAILURE;
    const response = await lessonsGet();
    const text = await response.text();

    for (const leak of [
      'sort_order',
      'does not exist',
      '42703',
      'column public.lessons.status',
      'Perhaps you meant',
      'postgrest',
      'PostgREST',
    ]) {
      expect(text, `response leaked "${leak}"`).not.toContain(leak);
    }
  });

  it('preserves the standard error envelope shape', async () => {
    lessonsError = POSTGREST_FAILURE;
    const response = await lessonsGet();
    const json = (await response.json()) as {
      success: boolean;
      error: { code: string; message: string };
      meta: { timestamp: string };
    };

    expect(json.success).toBe(false);
    expect(json.error.code).toBe('INTERNAL_ERROR');
    expect(json.meta.timestamp).toBeDefined();
  });

  it('logs the error code server-side so the failure stays diagnosable', async () => {
    const logged: unknown[][] = [];
    const spy = vi
      .spyOn(console, 'error')
      .mockImplementation((...args: unknown[]) => {
        logged.push(args);
      });

    lessonsError = POSTGREST_FAILURE;
    await lessonsGet();

    // The code is retained on the server; only the message is withheld.
    const flat = JSON.stringify(logged);
    expect(flat).toContain('42703');
    expect(flat).toContain('learning');
    spy.mockRestore();
  });

  it('no longer interpolates error.message into any thrown message', async () => {
    const { readFileSync } = await import('node:fs');
    const source = readFileSync('features/learning/learning-service.ts', 'utf8');
    // The single defect the audit found, guarded against returning.
    expect(source).not.toMatch(/ErrorFactories\.[a-zA-Z]+\(`[^`]*\$\{\s*error\.message\s*\}/);
  });
});
