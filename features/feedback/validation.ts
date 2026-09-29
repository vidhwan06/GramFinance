import { z } from 'zod';

/**
 * Request validation for the feedback API.
 *
 * ── Why `.strict()` ─────────────────────────────────────────────────────────
 * Rejects unknown keys outright. A client cannot smuggle in extra fields
 * (e.g. a pre-set `id` or `user_id`) that the server does not expect.
 *
 * ── Field bounds ─────────────────────────────────────────────────────────────
 * module: VARCHAR(50) in the database — validated here to match.
 * rating: INTEGER with CHECK (rating >= 1 AND rating <= 5) in the database.
 * comment: optional free text, capped at 1000 chars.
 */

/** Maximum length of the free-text comment. */
export const COMMENT_MAX_LENGTH = 1000;

/** Allowed module identifiers — must match the values offered by the form. */
export const MODULE_VALUES = ['general', 'loan', 'schemes', 'fraud-check', 'learn'] as const;

export const feedbackInputSchema = z.strictObject({
  module: z.string().trim().pipe(z.enum(MODULE_VALUES)),
  rating: z
    .number()
    .int('Rating must be a whole number.')
    .min(1, 'Rating must be at least 1.')
    .max(5, 'Rating must be at most 5.'),
  comment: z
    .string()
    .trim()
    .max(COMMENT_MAX_LENGTH, `Comment must be ${COMMENT_MAX_LENGTH} characters or fewer.`)
    .optional(),
});

export type FeedbackInput = z.infer<typeof feedbackInputSchema>;

export interface FieldIssue {
  path: string;
  message: string;
}

/**
 * Turns Zod issues into a client-safe shape.
 *
 * Only the field path and the validation message are returned. Values are
 * never echoed back, so a rejected request cannot be used to read back what
 * the caller sent.
 */
export function formatValidationIssues(error: z.ZodError): FieldIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.map(String).join('.') || '(root)',
    message: issue.message,
  }));
}
