/**
 * Domain types for the Schemes module.
 *
 * ── `Scheme` history ────────────────────────────────────────────────────────
 * The interface below previously declared single-valued `name` / `description`
 * and had no `status`, which contradicted the bilingual `name_en` / `name_kn`
 * columns that have always existed. It was never imported anywhere, so aligning
 * it is not a breaking change for any consumer. It is extended in place rather
 * than replaced, and no second `Scheme` type exists in the codebase.
 */

import type { SchemeFieldName } from './eligibility/field-registry';

/** Lifecycle state. Mirrors the `schemes_status_check` CHECK constraint. */
export type SchemeStatus = 'draft' | 'active' | 'inactive' | 'expired';

/** Mirrors `scheme_rules_rule_type_check`. */
export type SchemeRuleType = 'eligibility' | 'loan_terms';

/** Mirrors `scheme_rules_group_operator_check`. */
export type RuleGroupOperator = 'AND' | 'OR';

/** The complete V1 operator set. Mirrors `scheme_rules_operator_check`. */
export type RuleOperator = '=' | '!=' | '>' | '>=' | '<' | '<=' | 'IN' | 'NOT_IN' | 'CONTAINS';

/**
 * The complete V1 operator set, mirroring `scheme_rules_operator_check`.
 * Single source of truth: the engine validates against this and a test asserts
 * it matches the SQL CHECK constraint.
 */
export const ALL_RULE_OPERATORS: readonly RuleOperator[] = [
  '=',
  '!=',
  '>',
  '>=',
  '<',
  '<=',
  'IN',
  'NOT_IN',
  'CONTAINS',
];

/**
 * Operators whose rule value MUST be a JSON array.
 *
 * CONTAINS is deliberately NOT here: migration 012 widened the database CHECK so
 * CONTAINS accepts either an array (list membership) or a scalar (substring).
 * Under migration 011 alone, CONTAINS was unimplementable because no registry
 * field is an array type.
 */
export const ARRAY_OPERATORS: readonly RuleOperator[] = ['IN', 'NOT_IN'];

/** A rule as stored in public.scheme_rules. */
export interface SchemeRule {
  id: string;
  schemeId: string;
  ruleGroup: number;
  groupOperator: RuleGroupOperator;
  ruleType: SchemeRuleType;
  /** Always a member of the closed registry — never an arbitrary string. */
  field: SchemeFieldName;
  operator: RuleOperator;
  /** Scalar for `=`/`!=`/`>`/`>=`/`<`/`<=`; array for IN/NOT_IN/CONTAINS. */
  value: number | string | boolean | Array<number | string | boolean>;
  required: boolean;
  descriptionEn: string | null;
  descriptionKn: string | null;
  priority: number;
  createdAt: string;
}

/**
 * A scheme as shown in the catalogue.
 *
 * `nameEn` / `nameKn` and `descriptionEn` / `descriptionKn` are both required:
 * the product is bilingual and the database enforces it with NOT NULL. `name`
 * is a convenience accessor for "the name in the active language" and should be
 * chosen at the render site, not baked into the data.
 */
export interface Scheme {
  id: string;
  nameEn: string;
  nameKn: string;
  descriptionEn: string;
  descriptionKn: string;
  /**
   * Coarse browse/filter metadata ONLY.
   *
   * This MUST NOT take part in eligibility evaluation. The eligibility source
   * of truth is `scheme_rules`. Treating target_groups as a second eligibility
   * system is the specific failure this comment exists to prevent.
   */
  targetGroups: string[];
  states: string[];
  requiredDocuments: string[];
  officialUrl: string;
  /** Display this to users. It is a trust signal, not a cosmetic date. */
  lastVerified: string;
  status: SchemeStatus;
}

/** Coarse catalogue filters. Never used for eligibility. */
export interface SchemeFilter {
  state?: string;
  district?: string;
  occupation?: string;
  ageGroup?: string;
  status?: SchemeStatus;
}

// ─────────────────────────────────────────────────────────────────────────────
// Eligibility result model
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Per-rule outcome.
 *
 * UNKNOWN is a first-class result, not an error: the applicant simply has not
 * supplied the field. It is what separates ELIGIBLE from
 * POTENTIALLY_ELIGIBLE, and suppressing it is how an eligibility tool ends up
 * confidently wrong.
 */
export type RuleOutcome = 'pass' | 'fail' | 'unknown';

/**
 * Why a rule produced its outcome. Kept as a code so it is testable and so the
 * UI can map it to bilingual copy later; the engine itself has no language.
 */
export type EvaluationReason =
  /** The comparison held. */
  | 'satisfied'
  /** The comparison definitively did not hold. */
  | 'not_satisfied'
  /** The applicant did not supply the field, so nothing can be decided. */
  | 'missing_value'
  /**
   * A value was supplied but cannot be compared with the rule (e.g. a string
   * where the registry declares a number). Treated as UNKNOWN, not FAIL: a
   * false NOT_ELIGIBLE is worse than asking the user to re-enter a value.
   */
  | 'type_mismatch';

export interface RuleEvaluation {
  ruleId: string;
  field: SchemeFieldName;
  operator: RuleOperator;
  /** The value actually compared, already normalised to a string for display. */
  expected: string;
  /** The applicant's value, or null when it was not supplied. */
  actual: string | null;
  outcome: RuleOutcome;
  required: boolean;
  descriptionEn: string | null;
  descriptionKn: string | null;
  reason: EvaluationReason;
}

/**
 * Outcome of one rule group.
 *
 * A group is the unit of authorial intent: rules inside it combine with the
 * group's `groupOperator`, and groups are alternatives to one another.
 */
export interface GroupEvaluation {
  ruleGroup: number;
  groupOperator: RuleGroupOperator;
  outcome: RuleOutcome;
  /** Ids of the rules that contributed, in evaluation order. */
  ruleIds: string[];
}

/**
 * A rule that could not be evaluated at all because it is structurally invalid
 * (unknown field, unknown operator, value/operator shape mismatch).
 *
 * The database CHECK constraints should make these impossible, so a non-empty
 * list means either authoring drift or application code bypassing the database.
 * It is reported rather than silently dropped: a rule that quietly vanishes
 * from an eligibility decision is how these systems start lying.
 */
export interface InvalidRuleReport {
  ruleId: string;
  field: string;
  operator: string;
  reason: 'unknown_field' | 'unknown_operator' | 'value_shape_mismatch';
  detail: string;
}

/**
 * Overall verdict.
 *
 *   eligible             - every required rule passed
 *   potentially_eligible - no required rule failed, but something is unknown
 *   not_eligible         - at least one required rule failed
 */
export type EligibilityStatus = 'eligible' | 'potentially_eligible' | 'not_eligible';

export interface SchemeEligibilityResult {
  schemeId: string;
  status: EligibilityStatus;
  passedRules: RuleEvaluation[];
  failedRules: RuleEvaluation[];
  /** Rules that could not be decided, because the field was not supplied. */
  unknownRules: RuleEvaluation[];
  /**
   * Registry field names still needed, e.g. `['annualIncome']`.
   *
   * These are MACHINE names, not display strings. The engine is pure and has no
   * language; the UI resolves them to a label via SCHEME_FIELD_REGISTRY. Only
   * rules marked `required` appear here, because only a mandatory unknown
   * blocks a firm answer.
   */
  missingInformation: string[];
  /** Per-group outcomes, so the UI can explain which alternative was satisfied. */
  groupResults: GroupEvaluation[];
  /** Structurally invalid rules that could not be evaluated at all. */
  invalidRules: InvalidRuleReport[];
}

/**
 * Hard boundary on what this module may claim.
 *
 * This is an eligibility MATCHING assistant. It never guarantees approval, never
 * asserts a legal entitlement, and never speaks for a government authority.
 * Copy shown to users must respect that.
 */
export const ELIGIBILITY_DISCLAIMER_EN =
  'This is a preliminary assessment based on the information you provided. It is not an approval or a guarantee. Final eligibility is decided by the lending institution.';

export const ELIGIBILITY_DISCLAIMER_KN =
  'ನೀವು ನಮೂದಿಸಿದ ಮಾಹಿತಿಯ ಆಧಾರದ ಮೇಲೆ ಇದು ಪ್ರಾಥಮಿಕ ಮೌಲ್ಯಮಾಪನೆ ಮಾತ್ರ. ಇದು ಅನುಮೋದನೆ ಅಲ್ಲ. ಅಂತಿಮ ಅರ್ಹತೆಯನ್ನು ಸಾಲ ನೀಡುವ ಸಂಸ್ಥೆ ನಿರ್ಧರಿಸುತ್ತದೆ.';
