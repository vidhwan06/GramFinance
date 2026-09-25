/**
 * The CLOSED field registry for scheme eligibility.
 *
 * ── Why this file exists ────────────────────────────────────────────────────
 * A generic rule evaluator that reads `applicant[rule.field]` is a property
 * access primitive. Without a closed registry, a malicious or careless rule row
 * could read `__proto__`, `constructor`, `prototype`, or any internal flag that
 * happens to be present on the object, and comparison operators would happily
 * act on it. This registry is the allow-list; the same list is enforced a second
 * time by a CHECK constraint on public.scheme_rules.field, so a bad row cannot
 * even reach the database.
 *
 * There are exactly two places to add a field: this array, and the CHECK
 * constraint in supabase/migrations/011. A test asserts the two stay identical.
 *
 * ── Units (decision 13) ─────────────────────────────────────────────────────
 * The loan engine in features/loan/engine works in INTEGER PAISE.
 * This engine works in RUPEES, because that is how government scheme limits are
 * published. The two must never be confused. Every monetary field below is
 * marked `monetary: true` with `unit: 'INR'`, and any conversion between the
 * two systems belongs at the integration boundary — never inside the evaluator.
 *
 * Do NOT add `* 100` or `/ 100` anywhere in the eligibility engine.
 */

/** Every field a V1 rule is permitted to reference. Mirrors the SQL CHECK. */
export const SCHEME_FIELD_NAMES = [
  'age',
  'annualIncome',
  'applicantCategory',
  'district',
  'employmentType',
  'existingLoan',
  'gender',
  'loanPurpose',
  'occupation',
  'requestedLoanAmount',
  'state',
] as const;

export type SchemeFieldName = (typeof SCHEME_FIELD_NAMES)[number];

export type SchemeFieldType = 'number' | 'string' | 'boolean';

/** Money is always INR (rupees) here. Never paise. */
export type SchemeFieldUnit = 'years' | 'INR' | 'none';

export interface SchemeFieldDefinition {
  readonly name: SchemeFieldName;
  readonly type: SchemeFieldType;
  readonly unit: SchemeFieldUnit;
  readonly monetary: boolean;
  readonly labelEn: string;
  readonly labelKn: string;
}

export const SCHEME_FIELD_REGISTRY: readonly SchemeFieldDefinition[] = [
  {
    name: 'age',
    type: 'number',
    unit: 'years',
    monetary: false,
    labelEn: 'Age',
    labelKn: 'ವಯಸ್ಸು',
  },
  {
    name: 'annualIncome',
    type: 'number',
    unit: 'INR',
    monetary: true,
    labelEn: 'Annual income',
    labelKn: 'ವಾರ್ಷಿಕ ಆದಾಯ',
  },
  {
    name: 'applicantCategory',
    type: 'string',
    unit: 'none',
    monetary: false,
    labelEn: 'Applicant category',
    labelKn: 'ಅರ್ಜಿದಾರರ ವರ್ಗ',
  },
  {
    name: 'district',
    type: 'string',
    unit: 'none',
    monetary: false,
    labelEn: 'District',
    labelKn: 'ಜಿಲ್ಲೆ',
  },
  {
    name: 'employmentType',
    type: 'string',
    unit: 'none',
    monetary: false,
    labelEn: 'Employment type',
    labelKn: 'ಉದ್ಯೋಗದ ಸ್ವರೂಪ',
  },
  {
    name: 'existingLoan',
    type: 'boolean',
    unit: 'none',
    monetary: false,
    labelEn: 'Already have an existing loan',
    labelKn: 'ಈಗಾಗಲೇ ಸಾಲ ಇದೆಯೇ',
  },
  {
    name: 'gender',
    type: 'string',
    unit: 'none',
    monetary: false,
    labelEn: 'Gender',
    labelKn: 'ಲಿಂಗ',
  },
  {
    name: 'loanPurpose',
    type: 'string',
    unit: 'none',
    monetary: false,
    labelEn: 'Loan purpose',
    labelKn: 'ಸಾಲದ ಉದ್ದೇಶ',
  },
  {
    name: 'occupation',
    type: 'string',
    unit: 'none',
    monetary: false,
    labelEn: 'Occupation',
    labelKn: 'ವೃತ್ತಿ',
  },
  {
    name: 'requestedLoanAmount',
    type: 'number',
    unit: 'INR',
    monetary: true,
    labelEn: 'Requested loan amount',
    labelKn: 'ಮನವಿ ಮಾಡಿದ ಸಾಲದ ಮೊತ್ತ',
  },
  {
    name: 'state',
    type: 'string',
    unit: 'none',
    monetary: false,
    labelEn: 'State',
    labelKn: 'ರಾಜ್ಯ',
  },
];

/**
 * Names that must never be readable, even though the registry check already
 * excludes them. Kept explicit so the intent is testable and so a future edit
 * that widens the registry cannot quietly admit one.
 */
export const FORBIDDEN_FIELD_NAMES: readonly string[] = [
  '__proto__',
  'constructor',
  'prototype',
  'is_admin',
  'role',
  'toString',
  'valueOf',
];

const DEFINITION_BY_NAME = new Map<string, SchemeFieldDefinition>(
  SCHEME_FIELD_REGISTRY.map((def) => [def.name, def])
);

/**
 * Narrows an arbitrary string to a registry field name.
 *
 * This is the ONLY gate that may be trusted before property access. It uses a
 * Map rather than a plain object literal so inherited keys such as
 * `constructor` and `toString` cannot resolve.
 */
export function isKnownSchemeField(name: unknown): name is SchemeFieldName {
  if (typeof name !== 'string') return false;
  if (FORBIDDEN_FIELD_NAMES.includes(name)) return false;
  return DEFINITION_BY_NAME.has(name);
}

/** The definition for a field, or `undefined` when the field is not allowed. */
export function getSchemeFieldDefinition(name: unknown): SchemeFieldDefinition | undefined {
  return isKnownSchemeField(name) ? DEFINITION_BY_NAME.get(name) : undefined;
}

/** Every registry field whose value is money. Compared in INR, never paise. */
export function getMonetaryFieldNames(): SchemeFieldName[] {
  return SCHEME_FIELD_REGISTRY.filter((d) => d.monetary).map((d) => d.name);
}

/**
 * The applicant profile the evaluator may read from.
 *
 * Every field is optional on purpose: the engine must be able to answer
 * "unknown, we need more information" rather than demanding a complete profile
 * (see the UNKNOWN outcome in the rule result model).
 */
export interface SchemeApplicant {
  age?: number;
  /** INR rupees. Not paise. */
  annualIncome?: number;
  occupation?: string;
  state?: string;
  district?: string;
  gender?: string;
  applicantCategory?: string;
  loanPurpose?: string;
  /** INR rupees. Not paise. */
  requestedLoanAmount?: number;
  employmentType?: string;
  existingLoan?: boolean;
}

/**
 * Reads one field from an applicant, or `undefined` when it is not readable.
 *
 * Three independent guards, because this is the security boundary:
 *   1. the name must be in the closed registry (`isKnownSchemeField`)
 *   2. it must be an own property, so nothing inherited from the prototype
 *      chain is ever returned
 *   3. the name must not be a known-dangerous key
 *
 * Never replace this with `applicant[name]`.
 */
export function readApplicantField(
  applicant: SchemeApplicant,
  name: unknown
): unknown {
  if (!applicant || typeof applicant !== 'object') return undefined;
  if (!isKnownSchemeField(name)) return undefined;
  if (!Object.prototype.hasOwnProperty.call(applicant, name)) return undefined;
  return (applicant as Record<string, unknown>)[name];
}
