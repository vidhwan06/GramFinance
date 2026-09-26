import { z } from 'zod';
import {
  SCHEME_FIELD_REGISTRY,
  type SchemeApplicant,
  type SchemeFieldDefinition,
} from './field-registry';

/**
 * Request validation for the eligibility API.
 *
 * ── Why the schema is built FROM the registry ───────────────────────────────
 * The field registry is the single source of truth for what a rule may
 * reference. If this schema were hand-written it would be a second list that
 * drifts, and a field could become valid in the engine but rejected (or worse,
 * accepted) at the boundary. Deriving it means adding a field to the registry is
 * the only edit required. A test asserts the key sets stay identical.
 *
 * ── `.strict()` is the security control, not a style choice ─────────────────
 * Both objects reject unknown keys outright. That means a client cannot smuggle
 * in `__proto__`, `is_admin`, or — the important one — a pre-computed verdict
 * such as `{ "eligible": true }`. There is nowhere in this request shape to put
 * a result, so eligibility can only ever be produced by the server.
 */

/** Age bounds. 120 is deliberately generous; nothing is rejected as "too old". */
export const AGE_MIN = 0;
export const AGE_MAX = 120;

/** Requested loan amount cap: Rs 10 crore. */
export const MAX_REQUESTED_LOAN_RUPEES = 100_000_000;

/** Annual income cap: Rs 10,000 crore. Well beyond any real applicant. */
export const MAX_ANNUAL_INCOME_RUPEES = 10_000_000_000;

/** Free-text field cap. Long enough for a district or occupation string. */
export const MAX_TEXT_LENGTH = 200;

function numberValidatorFor(field: SchemeFieldDefinition): z.ZodNumber {
  switch (field.name) {
    case 'age':
      return z.number().int().min(AGE_MIN).max(AGE_MAX);
    case 'requestedLoanAmount':
      return z.number().min(0).max(MAX_REQUESTED_LOAN_RUPEES);
    case 'annualIncome':
      return z.number().min(0).max(MAX_ANNUAL_INCOME_RUPEES);
    default:
      return z.number().min(0);
  }
}

function validatorFor(field: SchemeFieldDefinition): z.ZodType {
  switch (field.type) {
    case 'number':
      return numberValidatorFor(field);
    case 'string':
      // govtEmployeeCategory has a closed set of valid values.
      if (field.name === 'govtEmployeeCategory') {
        return z.enum(['none', 'mts_class4_groupd', 'other_govt']);
      }
      return z.string().trim().min(1).max(MAX_TEXT_LENGTH);
    case 'boolean':
      return z.boolean();
    default:
      // Exhaustiveness guard: a new field type must be handled explicitly
      // rather than silently accepted as anything.
      return z.never();
  }
}

const APPLICANT_SHAPE = Object.fromEntries(
  SCHEME_FIELD_REGISTRY.map((field) => [field.name, validatorFor(field).optional()])
) as Record<string, z.ZodOptional<z.ZodType>>;

/**
 * The applicant profile as it may arrive over the wire.
 *
 * Every field is optional, because "we do not know yet" is a first-class answer
 * in this domain and must survive the boundary rather than being rejected.
 */
export const applicantSchema = z.strictObject(APPLICANT_SHAPE);

/** UUID form check used for a targeted single-scheme request. */
const schemeIdSchema = z.uuid();

/**
 * `POST /api/schemes/eligibility` request body.
 *
 * `schemeId` omitted means "evaluate every active scheme", which is what drives
 * the dynamic eligibility form: the response says which fields each scheme
 * still needs.
 */
export const eligibilityRequestSchema = z.strictObject({
  schemeId: schemeIdSchema.optional(),
  applicant: applicantSchema,
});

export type EligibilityRequest = z.infer<typeof eligibilityRequestSchema>;

/** Parsed applicant, safe to hand to the engine. */
export type ParsedApplicant = SchemeApplicant;

export interface FieldIssue {
  path: string;
  message: string;
}

/**
 * Turns Zod issues into a client-safe shape.
 *
 * Only the field path and the validation message are returned. Values are never
 * echoed back, so a rejected request cannot be used to read back what the
 * caller sent, and no applicant data lands in an error response.
 */
export function formatValidationIssues(error: z.ZodError): FieldIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.map(String).join('.') || '(root)',
    message: issue.message,
  }));
}
