import { z } from 'zod';
import { ErrorFactories } from '@/lib/api/errors';
import { formatValidationIssues } from '@/features/feedback/validation';
import {
  FEEDBACK_PAGE_SIZE_DEFAULT,
  FEEDBACK_PAGE_SIZE_MAX,
  FEEDBACK_QUERY_KEYS,
} from './types';

/**
 * Query-string validation for GET /api/admin/feedback.
 *
 * ── Why a strict schema rather than ad-hoc parsing ───────────────────────────
 * The endpoint must not accept arbitrary query parameters. Two separate things
 * are being prevented:
 *
 *   1. **Parameter smuggling.** Anything not on the allow-list is rejected
 *      outright rather than ignored. A silently-ignored `?order=rating` or
 *      `?user_id=<uuid>` would look like it worked, which is worse than refusing
 *      it: it invites callers to believe an unvalidated knob is honoured. The
 *      unknown-key check below runs BEFORE the schema precisely so the error can
 *      name the offending parameter.
 *   2. **Type confusion reaching the query builder.** `page` and `pageSize` are
 *      coerced from strings to integers here, once, so the value that reaches
 *      Supabase is provably an integer inside a known range. Nothing downstream
 *      has to re-check it, and no string can reach `.range()`.
 *
 * Values arrive as strings, so the schema requires an integer shape: `"2.5"`,
 * `"1e3"`, `" 2 "` and `"2abc"` are all rejected instead of being silently
 * truncated to something the caller did not ask for.
 */

/**
 * A whole number arriving as a query-string value.
 *
 * `z.coerce.number()` alone would accept `"2.5"`, `"1e3"` and `""`. Anchoring the
 * pattern first means only a literal run of digits is accepted, and only then is
 * it converted. The range checks are applied to the NUMBER after that, which is
 * why this is a `.pipe()` into `z.number()` rather than a chain of methods on the
 * string schema: in Zod 4 a transformed schema is already a pipe and takes no
 * further validators.
 */
const wholeNumberString = z
  .string()
  .regex(/^\d+$/, 'Must be a whole number.')
  .transform((value) => Number.parseInt(value, 10));

export const adminFeedbackQuerySchema = z.strictObject({
  page: wholeNumberString
    .pipe(
      z
        .number()
        .int('Must be a whole number.')
        .min(1, 'Page starts at 1.')
        // Upper-bounded so a huge page number cannot become an enormous OFFSET and
        // a slow scan. Far beyond any reachable page of feedback.
        .max(10_000, 'Page is out of range.')
    )
    .optional(),
  pageSize: wholeNumberString
    .pipe(
      z
        .number()
        .int('Must be a whole number.')
        .min(1, 'Page size must be at least 1.')
        .max(FEEDBACK_PAGE_SIZE_MAX, `Page size must be ${FEEDBACK_PAGE_SIZE_MAX} or fewer.`)
    )
    .optional(),
});

export interface AdminFeedbackQuery {
  page: number;
  pageSize: number;
}

/** The keys the endpoint reads. Exported so a test can assert they stay in step. */
export const KNOWN_QUERY_KEYS: readonly string[] = FEEDBACK_QUERY_KEYS;

/**
 * Parses and bounds a URLSearchParams into a safe query.
 *
 * Rejects an unknown key before schema validation, so the error names the
 * offending parameter rather than reporting a generic failure. Repeating a key
 * (`?page=1&page=2`) is also rejected: silently taking the first or last one
 * would make the effective value depend on parsing details.
 *
 * @throws {ApiError} 400 with per-parameter detail on anything malformed.
 */
export function parseAdminFeedbackQuery(params: URLSearchParams): AdminFeedbackQuery {
  const unknown = [...params.keys()].filter((key) => !KNOWN_QUERY_KEYS.includes(key));
  if (unknown.length > 0) {
    throw ErrorFactories.badRequest(
      `Unsupported query parameter: ${unknown.join(', ')}.`,
      [{ path: unknown.join(','), message: 'Allowed: page, pageSize.' }]
    );
  }

  for (const key of KNOWN_QUERY_KEYS) {
    if (params.getAll(key).length > 1) {
      throw ErrorFactories.badRequest(`The "${key}" parameter may only be given once.`, [
        { path: key, message: 'Repeated parameter.' },
      ]);
    }
  }

  const raw: Record<string, string> = {};
  for (const key of KNOWN_QUERY_KEYS) {
    const value = params.get(key);
    if (value !== null) raw[key] = value;
  }

  const parsed = adminFeedbackQuerySchema.safeParse(raw);
  if (!parsed.success) {
    throw ErrorFactories.badRequest(
      'Invalid pagination parameters.',
      formatValidationIssues(parsed.error)
    );
  }

  return {
    page: parsed.data.page ?? 1,
    pageSize: parsed.data.pageSize ?? FEEDBACK_PAGE_SIZE_DEFAULT,
  };
}