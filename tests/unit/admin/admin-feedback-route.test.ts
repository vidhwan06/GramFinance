import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// cookies() only resolves inside a request scope; the route awaits it.
vi.mock('next/headers', () => ({
  cookies: async () => ({ getAll: () => [], setAll: () => undefined }),
}));

/**
 * Controllable authorization outcome.
 *
 * The three states the route must distinguish are driven from here: no session
 * (401), a session without the admin role (403), and an administrator (200).
 * `rpcError` covers the fourth case that is easy to forget — the role lookup
 * itself failing, which must be a 500 and never a 403, because answering "you
 * are not an administrator" when the database simply could not be asked would
 * lock a real administrator out with a wrong reason.
 */
let currentUser: { id: string } | null = null;
let isAdmin: boolean | null = null;
let rpcError: { code: string; message: string } | null = null;
let queryError: { code: string; message: string } | null = null;
let pageRows: Array<Record<string, unknown>> = [
  {
    id: 'fb-1',
    user_id: 'user-uuid-that-must-not-leak',
    module: 'loan',
    rating: 4,
    comment: 'The EMI breakdown helped.',
    created_at: '2026-03-01T09:00:00.000Z',
  },
];
let pageCount = 1;

const SELECTED_COLUMNS: string[] = [];
const ORDER_CALLS: unknown[][] = [];
const RANGE_CALLS: unknown[][] = [];
let ratingCounts: Record<number, number> = {};

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: currentUser }, error: null }),
    },
    rpc: async () => ({ data: isAdmin, error: rpcError }),
    from: () => {
      let eqRating: number | null = null;

      const builder: Record<string, unknown> = {};

      builder.select = (...args: unknown[]) => {
        SELECTED_COLUMNS.push(String(args[0]));
        builder.order = (...args: unknown[]) => {
          ORDER_CALLS.push(args);
          builder.range = (...args: unknown[]) => {
            RANGE_CALLS.push(args);
            return Promise.resolve({
              data: pageRows,
              error: queryError,
              count: pageCount,
            });
          };
          return builder;
        };
        builder.eq = (...args: unknown[]) => {
          eqRating = args[1] as number;
          builder.then = (onResolve: (value: unknown) => unknown) =>
            Promise.resolve({
              data: [],
              error: null,
              count: ratingCounts[eqRating ?? 0] ?? 0,
            }).then(onResolve);
          return builder;
        };
        builder.then = (onResolve: (value: unknown) => unknown) =>
          Promise.resolve({ data: [], error: null, count: 0 }).then(onResolve);
        return builder;
      };

      return builder;
    },
  }),
}));

/** The project's own rate limiter, reset so one test cannot starve the next. */
async function resetBuckets() {
  const { _resetBuckets } = await import('@/lib/ai/rate-limiter');
  _resetBuckets();
}

interface ApiBody<T = unknown> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: unknown };
  meta?: { timestamp: string };
}

interface FeedbackItem {
  id: string;
  module: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

interface FeedbackPayload {
  items: FeedbackItem[];
  stats: { total: number; averageRating: number | null; distribution: Record<string, number> };
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasPrevious: boolean;
    hasNext: boolean;
  };
}

let GET: (request: NextRequest) => Promise<Response>;

async function call(query = ''): Promise<{ status: number; json: ApiBody<FeedbackPayload>; headers: Headers }> {
  const request = new NextRequest(`http://localhost:3000/api/admin/feedback${query}`);
  const response = await GET(request);
  return { status: response.status, json: (await response.json()) as ApiBody<FeedbackPayload>, headers: response.headers };
}

beforeEach(async () => {
  currentUser = { id: '11111111-1111-4111-8111-111111111111' };
  isAdmin = true;
  rpcError = null;
  queryError = null;
  ratingCounts = { 4: 1 };
  pageRows = [
    {
      id: 'fb-1',
      user_id: 'user-uuid-that-must-not-leak',
      module: 'loan',
      rating: 4,
      comment: 'The EMI breakdown helped.',
      created_at: '2026-03-01T09:00:00.000Z',
    },
  ];
  pageCount = 1;
  SELECTED_COLUMNS.length = 0;
  ORDER_CALLS.length = 0;
  RANGE_CALLS.length = 0;
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  await resetBuckets();
  ({ GET } = await import('@/app/api/admin/feedback/route'));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('authorization', () => {
  it('rejects an unauthenticated request with 401', async () => {
    currentUser = null;
    const { status, json } = await call();

    expect(status).toBe(401);
    expect(json.success).toBe(false);
    expect(json.error!.code).toBe('UNAUTHORIZED');
  });

  it('rejects an authenticated non-admin with 403', async () => {
    currentUser = { id: '22222222-2222-4222-8222-222222222222' };
    isAdmin = false;

    const { status, json } = await call();

    expect(status).toBe(403);
    expect(json.success).toBe(false);
    expect(json.error!.code).toBe('FORBIDDEN');
  });

  it('allows an administrator', async () => {
    const { status, json } = await call();

    expect(status).toBe(200);
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data!.items)).toBe(true);
  });

  it('distinguishes 401 from 403 rather than collapsing them', async () => {
    // A signed-in non-admin and a signed-out visitor are different situations
    // and a generic error would hide which one occurred.
    currentUser = null;
    const anonymous = await call();
    currentUser = { id: '22222222-2222-4222-8222-222222222222' };
    isAdmin = false;
    const nonAdmin = await call();

    expect(anonymous.status).toBe(401);
    expect(nonAdmin.status).toBe(403);
  });

  it('never returns rows to a non-admin', async () => {
    isAdmin = false;
    const { json } = await call();

    expect(json.data).toBeUndefined();
    expect(JSON.stringify(json)).not.toContain('The EMI breakdown helped');
  });

  it('never queries the feedback table for a non-admin', async () => {
    // The refusal must happen before the database is touched at all.
    isAdmin = false;
    await call();

    expect(SELECTED_COLUMNS).toHaveLength(0);
    expect(RANGE_CALLS).toHaveLength(0);
  });

  it('refuses a signed-out caller before validating query parameters', async () => {
    // Otherwise the endpoint becomes a schema oracle for anonymous visitors:
    // they could enumerate which parameters exist by watching which ones change
    // the status code from 401 to 400.
    currentUser = null;
    const { status, json } = await call('?not_a_real_parameter=1');

    expect(status).toBe(401);
    expect(json.error!.code).toBe('UNAUTHORIZED');
    // No per-parameter detail, no mention of the parameter that was sent, and no
    // validation vocabulary.
    expect(json.error!.details).toBeUndefined();
    expect(JSON.stringify(json)).not.toContain('not_a_real_parameter');
    // The refusal message legitimately says "you must be signed in to view this
// page", so only the parameter-surface vocabulary is checked for.
expect(JSON.stringify(json)).not.toMatch(/pageSize|Unsupported query parameter|Invalid pagination/i);
  });

  it('answers 500 when the role lookup itself fails', async () => {
    // NOT 403: telling an administrator they are not an administrator because the
    // database could not be asked would be a wrong answer, and would hide a real
    // outage.
    rpcError = { code: '42883', message: 'function public.is_admin() does not exist' };

    const { status, json } = await call();

    expect(status).toBe(500);
    expect(json.error!.code).toBe('INTERNAL_ERROR');
    expect(json.error!.message).not.toContain('is_admin');
    expect(JSON.stringify(json)).not.toContain('42883');
  });

  it('does not leak the role error to the client but logs it server-side', async () => {
    rpcError = { code: '42501', message: 'permission denied for function is_admin' };
    await call();

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('role lookup failed'),
      { code: '42501' }
    );
  });

  it('exports only a GET handler', async () => {
    // No POST/PUT/DELETE: this feature is read-only. An added write handler would
    // be a new surface with no test behind it.
    const module = await import('@/app/api/admin/feedback/route');
    const handlers = Object.keys(module).filter((key) =>
      /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/.test(key)
    );
    expect(handlers).toEqual(['GET']);
  });
});

describe('response shape', () => {
  it('returns items, stats and pagination', async () => {
    const { json } = await call();

    expect(json.data).toMatchObject({
      items: expect.any(Array),
      stats: { total: expect.any(Number), averageRating: expect.anything(), distribution: expect.any(Object) },
      pagination: {
        page: 1,
        pageSize: 20,
        totalItems: expect.any(Number),
        totalPages: expect.any(Number),
        hasPrevious: expect.any(Boolean),
        hasNext: expect.any(Boolean),
      },
    });
  });

  it('preserves the standard envelope', async () => {
    const { json } = await call();

    expect(json.success).toBe(true);
    expect(typeof json.meta!.timestamp).toBe('string');
  });

  it('exposes exactly the five distribution keys', async () => {
    const { json } = await call();
    expect(Object.keys(json.data!.stats.distribution).sort()).toEqual(['1', '2', '3', '4', '5']);
  });

  it('marks the response uncacheable', async () => {
    // Private, user-submitted content must never be retained by a shared cache.
    const { headers } = await call();
    expect(headers.get('cache-control')).toBe('no-store');
  });
});

describe('sensitive fields', () => {
  it('never returns user_id', async () => {
    const { json } = await call();

    expect(json.data!.items[0]).not.toHaveProperty('user_id');
    expect(JSON.stringify(json)).not.toContain('user-uuid-that-must-not-leak');
  });

  it('never returns the database column names, only the wire names', async () => {
    const { json } = await call();
    expect(JSON.stringify(json)).not.toContain('created_at');
  });

  it('selects only the named columns, never *', async () => {
    await call();

    expect(SELECTED_COLUMNS.length).toBeGreaterThan(0);
    for (const columns of SELECTED_COLUMNS) {
      expect(columns).not.toBe('*');
      expect(columns).not.toContain('user_id');
    }
  });

  it('orders deterministically', async () => {
    await call();

    expect(ORDER_CALLS).toEqual([
      ['created_at', { ascending: false }],
      ['id', { ascending: false }],
    ]);
  });
});

describe('pagination parameters', () => {
  it('applies valid pagination', async () => {
    const { status, json } = await call('?page=2&pageSize=5');

    expect(status).toBe(200);
    expect(json.data!.pagination).toMatchObject({ page: 2, pageSize: 5 });
    expect(RANGE_CALLS).toEqual([[5, 9]]);
  });

  it('defaults to page 1 with the documented page size', async () => {
    const { json } = await call();

    expect(json.data!.pagination).toMatchObject({ page: 1, pageSize: 20 });
    expect(RANGE_CALLS).toEqual([[0, 19]]);
  });

  it.each([
    '?page=0',
    '?page=-3',
    '?page=abc',
    '?page=2.5',
    '?page=1e3',
    '?page=',
    '?pageSize=0',
    '?pageSize=101',
    '?pageSize=abc',
  ])('rejects malformed pagination %s with 400', async (query) => {
    const { status, json } = await call(query);

    expect(status).toBe(400);
    expect(json.error!.code).toBe('BAD_REQUEST');
  });

  it('rejects an unknown parameter with 400', async () => {
    const { status, json } = await call('?order=rating');

    expect(status).toBe(400);
    expect(json.error!.message).toContain('order');
  });

  it('never runs a query for rejected parameters', async () => {
    await call('?page=abc');

    expect(RANGE_CALLS).toHaveLength(0);
  });
});

describe('empty results', () => {
  it('returns an empty list rather than an error', async () => {
    ratingCounts = {};
    pageRows = [];
    pageCount = 0;

    const { status, json } = await call();

    expect(status).toBe(200);
    expect(json.data!.items).toEqual([]);
    expect(json.data!.pagination.totalPages).toBe(0);
    expect(json.data!.pagination.totalItems).toBe(0);
    expect(json.data!.stats.total).toBe(0);
    expect(json.data!.stats.averageRating).toBeNull();
  });

  it('still returns all five distribution keys when empty', async () => {
    ratingCounts = {};
    pageRows = [];
    pageCount = 0;

    const { json } = await call();

    expect(json.data!.stats.distribution).toEqual({ '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 });
  });
});

describe('database failure is handled safely', () => {
  it('returns 500 without leaking the database message', async () => {
    queryError = {
      code: '42P01',
      message: 'relation "public.feedback_internal" does not exist',
    };

    const { status, json } = await call();

    expect(status).toBe(500);
    expect(json.error!.message).not.toContain('feedback_internal');
    expect(json.error!.message).not.toContain('42P01');
    expect(JSON.stringify(json)).not.toMatch(/public\.|relation|column/i);
  });
});

describe('the existing submission flow is untouched', () => {
  it('this route does not expose any write handler', async () => {
    const module = await import('@/app/api/admin/feedback/route');
    expect(module).not.toHaveProperty('POST');
    expect(module).not.toHaveProperty('DELETE');
  });

  it('the feedback submission route still exports only POST', async () => {
    const module = await import('@/app/api/feedback/route');
    const handlers = Object.keys(module).filter((key) =>
      /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/.test(key)
    );
    expect(handlers).toEqual(['POST']);
  });
});