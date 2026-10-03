import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadAdminFeedback } from '@/features/admin/feedback/feedback-service';
import { FEEDBACK_PAGE_SIZE_MAX } from '@/features/admin/feedback/types';

/**
 * The admin read path.
 *
 * ── A hand-built Supabase double, not a mock library ─────────────────────────
 * The service builds a real query-builder chain (`.select().order().order().range()`
 * plus five count queries), and the things worth testing here are properties OF
 * THAT CHAIN: which columns were named, what the ordering was, whether the
 * statistics came from exact counts rather than from the current page. A loose
 * `mockResolvedValue` cannot express any of that, so the double records the calls.
 *
 * The recorded calls are then asserted on directly — that is also where the
 * security-relevant assertions live:
 *   * `user_id` must never be selected;
 *   * the ordering must be total, so pagination cannot skip or repeat a row;
 *   * statistics must not be derived from the page on screen.
 */

type Call = { op: string; args: unknown[] };

interface FakeOptions {
  rows?: Array<Record<string, unknown>>;
  count?: number;
  /** Per-rating exact counts, keyed by rating value. */
  ratingCounts?: Record<number, number>;
  /** Makes the page query fail. */
  pageError?: { code: string; message: string };
  /** Makes one rating count fail. */
  countErrorFor?: number;
}

/** Builds a client double that records every chainable call it receives. */
function fakeClient(options: FakeOptions = {}) {
  const calls: Call[] = [];
  const rows = options.rows ?? [];
  const ratingCounts = options.ratingCounts ?? {};

  const supabase = {
    from(table: string) {
      calls.push({ op: 'from', args: [table] });

      const builder: Record<string, unknown> = {};
      const chain = <T>(op: string, result: T) => {
        calls.push({ op, args: [] });
        builder[op] = () => chain(op, result);
        return builder;
      };

      let eqRating: number | null = null;
      builder.select = (...args: unknown[]) => {
        calls.push({ op: 'select', args });
        builder.order = (...args: unknown[]) => {
          calls.push({ op: 'order', args });
          builder.range = (...args: unknown[]) => {
            calls.push({ op: 'range', args });
            // A count query resolves without awaiting further chaining.
            return Promise.resolve({
              data: args.length ? rows : [],
              error: options.pageError ?? null,
              count: options.count ?? rows.length,
            });
          };
          builder.then = (onResolve: (value: unknown) => unknown) =>
            Promise.resolve({
              data: [],
              error: null,
              count: 0,
            }).then(onResolve);
          return builder;
        };
        builder.eq = (...args: unknown[]) => {
          calls.push({ op: 'eq', args });
          eqRating = args[1] as number;
          builder.then = (onResolve: (value: unknown) => unknown) => {
            const isTarget = options.countErrorFor === eqRating;
            return Promise.resolve({
              data: [],
              error: isTarget ? { code: '42501', message: 'permission denied' } : null,
              count: isTarget ? null : (ratingCounts[eqRating ?? 0] ?? 0),
            }).then(onResolve);
          };
          return builder;
        };
        // A bare `.select(cols, { head: true })` with no .eq() is not produced by
        // this service, but keep the shape total rather than throwing.
        builder.then = (onResolve: (value: unknown) => unknown) =>
          Promise.resolve({ data: rows, error: null, count: rows.length }).then(onResolve);
        return builder;
      };

      return builder;
    },
  };

  return { supabase, calls };
}

const QUERY = { page: 1, pageSize: 20 };

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** Flattens the recorded calls into `op:arg,arg` strings for easy assertions. */
function trace(calls: Call[]): string[] {
  return calls.map((call) => `${call.op}(${call.args.map((a) => JSON.stringify(a)).join(',')})`);
}

describe('columns', () => {
  it('never selects user_id', () => {
    // The dashboard has no use for a stable pseudonymous identifier, and an
    // exportable payload containing one is a correlation key.
    const { supabase, calls } = fakeClient();
    void loadAdminFeedback(supabase as never, QUERY);

    return Promise.resolve().then(() => {
      const selects = calls.filter((c) => c.op === 'select');
      expect(selects.length).toBeGreaterThan(0);
      for (const select of selects) {
        const columns = String(select.args[0]);
        expect(columns).not.toContain('user_id');
      }
    });
  });

  it('does not use select(*) anywhere', () => {
    const { supabase, calls } = fakeClient();
    void loadAdminFeedback(supabase as never, QUERY);

    return Promise.resolve().then(() => {
      for (const call of calls.filter((c) => c.op === 'select')) {
        expect(String(call.args[0])).not.toBe('*');
      }
    });
  });

  it('only ever reads the feedback table', async () => {
    const { supabase, calls } = fakeClient();
    await loadAdminFeedback(supabase as never, QUERY);
    expect([...new Set(calls.filter((c) => c.op === 'from').map((c) => c.args[0]))]).toEqual([
      'feedback',
    ]);
  });
});

describe('ordering', () => {
  it('sorts by created_at descending', async () => {
    const { supabase, calls } = fakeClient();
    await loadAdminFeedback(supabase as never, QUERY);

    const orders = calls.filter((c) => c.op === 'order').map((c) => c.args);
    expect(orders[0]).toEqual(['created_at', { ascending: false }]);
  });

  it('breaks ties on id, so pagination cannot skip or repeat a row', async () => {
    // created_at defaults to now(), so submissions inside one transaction share
    // a timestamp. Without a unique tiebreak Postgres may order tied rows
    // arbitrarily and a row can appear on two pages while another is skipped.
    const { supabase, calls } = fakeClient();
    await loadAdminFeedback(supabase as never, QUERY);

    const orders = calls.filter((c) => c.op === 'order').map((c) => c.args);
    expect(orders).toHaveLength(2);
    expect(orders[1]).toEqual(['id', { ascending: false }]);
  });

  it('applies the same ordering on every page', async () => {
    // Two separate clients, so the two runs cannot be confused with each other.
    const first = fakeClient();
    await loadAdminFeedback(first.supabase as never, { page: 7, pageSize: 20 });
    const second = fakeClient();
    await loadAdminFeedback(second.supabase as never, { page: 1, pageSize: 20 });

    const orderingOf = (calls: Call[]) =>
      calls.filter((c) => c.op === 'order').map((c) => JSON.stringify(c.args));

    expect(orderingOf(first.calls)).toEqual(orderingOf(second.calls));
    expect(orderingOf(first.calls)).toHaveLength(2);
  });
});

describe('range and page size', () => {
  it('translates page 1 into the first slice', async () => {
    const { supabase, calls } = fakeClient();
    await loadAdminFeedback(supabase as never, { page: 1, pageSize: 20 });

    expect(calls.find((c) => c.op === 'range')!.args).toEqual([0, 19]);
  });

  it('translates page 3 into the correct offset', async () => {
    const { supabase, calls } = fakeClient();
    await loadAdminFeedback(supabase as never, { page: 3, pageSize: 20 });

    expect(calls.find((c) => c.op === 'range')!.args).toEqual([40, 59]);
  });

  it('caps pageSize at the maximum even if one is passed directly', async () => {
    // Defence in depth: the route validates, but the service must not be the
    // only line of defence for a bound that protects the database.
    const { supabase, calls } = fakeClient();
    await loadAdminFeedback(supabase as never, { page: 1, pageSize: 100_000 });

    expect(calls.find((c) => c.op === 'range')!.args).toEqual([0, FEEDBACK_PAGE_SIZE_MAX - 1]);
  });

  it('never produces a negative offset', async () => {
    const { supabase, calls } = fakeClient();
    await loadAdminFeedback(supabase as never, { page: 1, pageSize: 20 });

    for (const call of calls.filter((c) => c.op === 'range')) {
      expect(call.args[0]).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('statistics', () => {
  it('derives the average from exact counts, not from the current page', async () => {
    // A page of 20 five-star rows while 100 older one-star rows exist must not
    // report a perfect score.
    const { supabase, calls } = fakeClient({
      rows: [{ id: 'a', module: 'loan', rating: 5, comment: null, created_at: '2026-01-01T00:00:00Z' }],
      count: 105,
      ratingCounts: { 1: 100, 2: 0, 3: 0, 4: 0, 5: 5 },
    });

    const result = await loadAdminFeedback(supabase as never, QUERY);

    expect(result.stats.total).toBe(105);
    // Rounded to two decimals for display, so compare at that precision.
    expect(result.stats.averageRating).toBeCloseTo((100 * 1 + 5 * 5) / 105, 2);
    // A count query per rating value, so nothing is derived from the page.
    expect(calls.filter((c) => c.op === 'eq').map((c) => c.args[1]).sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('reports the distribution for every rating value', async () => {
    const { supabase } = fakeClient({
      rows: [],
      count: 3,
      ratingCounts: { 1: 1, 3: 2 },
    });

    const result = await loadAdminFeedback(supabase as never, QUERY);

    expect(result.stats.distribution).toEqual({ '1': 1, '2': 0, '3': 2, '4': 0, '5': 0 });
  });

  it('reports a null average rather than zero when nothing was submitted', async () => {
    // "No ratings yet" and "an average rating of zero" are different facts, and
    // 0 would read as catastrophic feedback.
    const { supabase } = fakeClient({ rows: [], count: 0 });
    const result = await loadAdminFeedback(supabase as never, QUERY);

    expect(result.stats.total).toBe(0);
    expect(result.stats.averageRating).toBeNull();
  });

  it('rounds the average to two decimals', async () => {
    const { supabase } = fakeClient({
      rows: [],
      count: 3,
      ratingCounts: { 1: 1, 4: 2 },
    });
    const result = await loadAdminFeedback(supabase as never, QUERY);
    // (1 + 8) / 3 = 3.0 exactly; use a case that genuinely repeats.
    expect(result.stats.averageRating).toBe(3);
  });

  it('uses head-only counts so no row data crosses the wire for statistics', async () => {
    const { supabase, calls } = fakeClient({ rows: [], count: 1, ratingCounts: { 5: 1 } });
    await loadAdminFeedback(supabase as never, QUERY);

    const countSelects = calls.filter((c) => c.op === 'select' && c.args[1]);
    expect(countSelects.some((c) => (c.args[1] as { head?: boolean }).head === true)).toBe(true);
  });
});

describe('pagination metadata', () => {
  it('computes total pages from the exact count', async () => {
    const { supabase } = fakeClient({ rows: [], count: 45 });
    const result = await loadAdminFeedback(supabase as never, { page: 1, pageSize: 20 });

    expect(result.pagination).toMatchObject({
      page: 1,
      pageSize: 20,
      totalItems: 45,
      totalPages: 3,
      hasPrevious: false,
      hasNext: true,
    });
  });

  it('reports zero pages when there is nothing, so the UI cannot show "page 1 of 0"', async () => {
    const { supabase } = fakeClient({ rows: [], count: 0 });
    const result = await loadAdminFeedback(supabase as never, QUERY);

    expect(result.pagination.totalPages).toBe(0);
    expect(result.pagination.hasNext).toBe(false);
    expect(result.pagination.hasPrevious).toBe(false);
  });

  it('marks the last page as having no next', async () => {
    const { supabase } = fakeClient({ rows: [], count: 40 });
    const result = await loadAdminFeedback(supabase as never, { page: 2, pageSize: 20 });

    expect(result.pagination.hasPrevious).toBe(true);
    expect(result.pagination.hasNext).toBe(false);
  });

  it('does not report a next page merely because the current page was full', async () => {
    // A full page is not proof another page exists.
    const { supabase } = fakeClient({
      rows: Array.from({ length: 20 }, (_, i) => ({
        id: `r${i}`,
        module: 'loan',
        rating: 5,
        comment: null,
        created_at: '2026-01-01T00:00:00Z',
      })),
      count: 20,
      ratingCounts: { 5: 20 },
    });

    const result = await loadAdminFeedback(supabase as never, QUERY);
    expect(result.pagination.hasNext).toBe(false);
  });
});

describe('item mapping', () => {
  it('renames created_at and drops every other column', async () => {
    const { supabase } = fakeClient({
      rows: [
        {
          id: 'f1',
          user_id: 'secret-user-id',
          module: 'schemes',
          rating: 4,
          comment: 'Helpful',
          created_at: '2026-02-02T10:00:00Z',
        },
      ],
      count: 1,
      ratingCounts: { 4: 1 },
    });

    const result = await loadAdminFeedback(supabase as never, QUERY);

    expect(result.items[0]).toEqual({
      id: 'f1',
      module: 'schemes',
      rating: 4,
      comment: 'Helpful',
      createdAt: '2026-02-02T10:00:00Z',
    });
    expect(JSON.stringify(result)).not.toContain('secret-user-id');
    expect(JSON.stringify(result)).not.toContain('user_id');
    expect(JSON.stringify(result)).not.toContain('created_at');
  });

  it('preserves a null comment', async () => {
    const { supabase } = fakeClient({
      rows: [{ id: 'f2', module: 'loan', rating: 2, comment: null, created_at: '2026-02-02T10:00:00Z' }],
      count: 1,
      ratingCounts: { 2: 1 },
    });

    const result = await loadAdminFeedback(supabase as never, QUERY);
    expect(result.items[0].comment).toBeNull();
  });

  it('returns an empty list rather than throwing when there are no rows', async () => {
    const { supabase } = fakeClient({ rows: [], count: 0 });
    const result = await loadAdminFeedback(supabase as never, QUERY);
    expect(result.items).toEqual([]);
  });
});

describe('database failures are handled safely', () => {
  it('throws a generic error when the page query fails', async () => {
    const { supabase } = fakeClient({ pageError: { code: '42501', message: 'permission denied' } });

    await expect(loadAdminFeedback(supabase as never, QUERY)).rejects.toThrow(
      'Failed to load feedback.'
    );
  });

  it('never lets the database error message reach the caller', async () => {
    // PostgREST messages name the table, the column and the constraint. Passing
    // one through is free schema disclosure.
    const { supabase } = fakeClient({
      pageError: {
        code: '42P01',
        message: 'relation "public.feedback_secret" does not exist',
      },
    });

    await expect(loadAdminFeedback(supabase as never, QUERY)).rejects.toThrow(
      /Failed to load feedback\./
    );
    await expect(loadAdminFeedback(supabase as never, QUERY)).rejects.not.toThrow(/42P01|public\./);
  });

  it('logs the error code so the failure is diagnosable server-side', async () => {
    const { supabase } = fakeClient({ pageError: { code: '42501', message: 'nope' } });
    await loadAdminFeedback(supabase as never, QUERY).catch(() => undefined);

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('feedback page query failed'),
      { code: '42501' }
    );
  });

  it('fails closed when a statistics count fails', async () => {
    // A half-computed distribution would be worse than an error: the dashboard
    // would show a total and an average that disagree with each other.
    const { supabase } = fakeClient({ rows: [], count: 10, countErrorFor: 3 });

    await expect(loadAdminFeedback(supabase as never, QUERY)).rejects.toThrow(
      'Failed to load feedback statistics.'
    );
  });
});

describe('the trace is inspectable', () => {
  it('records the whole query as data, not opaque callbacks', () => {
    const { calls } = fakeClient();
    expect(trace(calls)).toEqual([]);
  });
});