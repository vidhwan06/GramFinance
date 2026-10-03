import { describe, it, expect } from 'vitest';
import { parseAdminFeedbackQuery, KNOWN_QUERY_KEYS } from '@/features/admin/feedback/query';
import { ApiError } from '@/lib/api/errors';
import { FEEDBACK_PAGE_SIZE_DEFAULT, FEEDBACK_PAGE_SIZE_MAX } from '@/features/admin/feedback/types';

/**
 * Query-string validation for GET /api/admin/feedback.
 *
 * The endpoint is admin-only, so this is not the primary security boundary — RLS
 * is. It is still worth hardening carefully, because an admin console is exactly
 * the kind of surface where a permissive parameter turns into "here is a way to
 * dump the table", and the failure mode of getting it wrong is a large amount of
 * user-submitted text leaving in one request.
 *
 * The two things being enforced:
 *   1. Only `page` and `pageSize` exist. Anything else is REFUSED, not ignored,
 *      because a silently-ignored knob teaches the caller it works.
 *   2. Both arrive as integers inside a known range, so no string can reach the
 *      query builder's `.range()`.
 */

function parse(query: string) {
  return parseAdminFeedbackQuery(new URLSearchParams(query));
}

/** Runs the parser and returns the thrown ApiError, failing if none was thrown. */
function expectRejection(query: string): ApiError {
  try {
    parse(query);
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    return error as ApiError;
  }
  throw new Error(`expected "${query}" to be rejected`);
}

describe('defaults', () => {
  it('uses page 1 and the default page size with no parameters', () => {
    expect(parse('')).toEqual({ page: 1, pageSize: FEEDBACK_PAGE_SIZE_DEFAULT });
  });

  it('defaults pageSize to the documented value', () => {
    expect(parse('?page=3')).toEqual({ page: 3, pageSize: FEEDBACK_PAGE_SIZE_DEFAULT });
  });
});

describe('valid pagination', () => {
  it('accepts explicit page and pageSize', () => {
    expect(parse('?page=2&pageSize=50')).toEqual({ page: 2, pageSize: 50 });
  });

  it('accepts the boundaries', () => {
    expect(parse('?page=1&pageSize=1')).toEqual({ page: 1, pageSize: 1 });
    expect(parse(`?page=10000&pageSize=${FEEDBACK_PAGE_SIZE_MAX}`)).toEqual({
      page: 10000,
      pageSize: FEEDBACK_PAGE_SIZE_MAX,
    });
  });

  it('coerces the numeric strings to real numbers', () => {
    const result = parse('?page=4&pageSize=25');
    expect(typeof result.page).toBe('number');
    expect(typeof result.pageSize).toBe('number');
  });
});

describe('unsupported parameters are refused, not ignored', () => {
  it('rejects an unknown parameter', () => {
    const error = expectRejection('?order=rating');
    expect(error.statusCode).toBe(400);
    expect(error.message).toContain('order');
  });

  it('rejects an attempt to filter by user_id', () => {
    // The single most important rejection here: it would be a way to enumerate
    // who submitted what.
    expect(expectRejection('?user_id=11111111-1111-4111-8111-111111111111').statusCode).toBe(400);
  });

  it('rejects an attempt to choose the sort order', () => {
    expect(expectRejection('?sort=asc').statusCode).toBe(400);
  });

  it('rejects an attempt to choose the columns', () => {
    expect(expectRejection('?columns=user_id,email').statusCode).toBe(400);
  });

  it('rejects an unknown parameter even alongside valid ones', () => {
    expect(expectRejection('?page=2&order=rating').statusCode).toBe(400);
  });

  it('names the offending parameter in the error', () => {
    // A caller should learn which parameter was wrong, not just that something
    // was.
    expect(expectRejection('?bogus=1').message).toContain('bogus');
  });

  it('accepts exactly the documented keys and nothing else', () => {
    expect([...KNOWN_QUERY_KEYS].sort()).toEqual(['page', 'pageSize']);
  });
});

describe('repeated parameters are refused', () => {
  it('rejects ?page=1&page=2 rather than picking one', () => {
    // Silently taking the first or last would make the effective value depend on
    // parsing details rather than on what the caller asked for.
    expect(expectRejection('?page=1&page=2').statusCode).toBe(400);
  });

  it('rejects a repeated pageSize', () => {
    expect(expectRejection('?pageSize=10&pageSize=20').statusCode).toBe(400);
  });
});

describe('malformed values are refused', () => {
  it.each([
    ['?page=0', 'page below 1'],
    ['?page=-1', 'negative page'],
    ['?pageSize=0', 'page size below 1'],
    [`?pageSize=${FEEDBACK_PAGE_SIZE_MAX + 1}`, 'page size above the cap'],
    ['?pageSize=101', 'a plainly oversized page size'],
    ['?page=10001', 'page beyond the cap'],
    ['?page=abc', 'a non-numeric page'],
    ['?page=2.5', 'a fractional page'],
    ['?page=1e3', 'scientific notation'],
    ['?page=', 'an empty value'],
    ['?pageSize=', 'an empty page size'],
    ['?page=+2', 'a signed value'],
    ['?page= 2', 'a padded value'],
    ['?page=2abc', 'trailing characters'],
    ['?page=1.0', 'a float written as 1.0'],
  ])('rejects %s (%s)', (query) => {
    expect(expectRejection(query).statusCode).toBe(400);
  });

  it('never returns a non-integer, even for exotic input', () => {
    // The property that actually matters: whatever comes in, `.range()` receives
    // a positive integer. A silent truncation here would page the wrong rows
    // without any visible symptom.
    const hostile = ['?page=2.9', '?page=1e309', '?page=+0x10', '?page=00002'];
    for (const query of hostile) {
      try {
        const result = parse(query);
        expect(Number.isSafeInteger(result.page), query).toBe(true);
        expect(result.page, query).toBeGreaterThanOrEqual(1);
      } catch (error) {
        expect(error, query).toBeInstanceOf(ApiError);
      }
    }
  });
});

describe('error shape', () => {
  it('reports BAD_REQUEST with per-parameter detail', () => {
    const error = expectRejection('?page=0');
    expect(error.code).toBe('BAD_REQUEST');
    expect(Array.isArray(error.details)).toBe(true);
  });

  it('never echoes the submitted value back', () => {
    // Consistent with formatValidationIssues: a rejected request must not become
    // a way to read back what the caller sent.
    const error = expectRejection('?page=not-a-number');
    expect(JSON.stringify(error.details)).not.toContain('not-a-number');
  });

  it('never leaks the parse internals', () => {
    const error = expectRejection('?page=abc');
    expect(JSON.stringify(error.details ?? '')).not.toMatch(/ZodError|z\.string|regex/i);
  });
});