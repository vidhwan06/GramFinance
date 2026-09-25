import {
  getSchemeFieldDefinition,
  isKnownSchemeField,
  readApplicantField,
  type SchemeApplicant,
  type SchemeFieldDefinition,
} from './field-registry';
import {
  ALL_RULE_OPERATORS,
  ARRAY_OPERATORS,
  type InvalidRuleReport,
  type RuleEvaluation,
  type RuleOperator,
  type SchemeRule,
} from '../types';

/**
 * Single-rule evaluation. Pure: no Supabase, no React, no Next.js, no I/O.
 *
 * Reads applicant data ONLY through `readApplicantField`, which enforces the
 * closed field registry. Nothing here performs property access on a name that
 * has not already been validated against the registry.
 *
 * ── Monetary values ─────────────────────────────────────────────────────────
 * Scheme amounts are INR RUPEES. The loan engine uses integer paise; that
 * convention does not apply here and there is deliberately no `* 100` / `/ 100`
 * anywhere in this file. `500000` means ₹5,00,000.
 */

const SCALAR_OPERATORS: readonly RuleOperator[] = ['=', '!=', '>', '>=', '<', '<='];

export function isKnownRuleOperator(value: unknown): value is RuleOperator {
  // Validated against the explicit operator list, NOT derived from shape
  // requirements. Deriving it previously made CONTAINS "unknown" the moment it
  // stopped requiring an array value.
  return typeof value === 'string' && (ALL_RULE_OPERATORS as readonly string[]).includes(value);
}

/**
 * Whether a rule's value shape suits its operator. Mirrors
 * `scheme_rules_value_shape_check` (migration 012).
 */
function checkValueShape(operator: RuleOperator, value: unknown): string | null {
  if (ARRAY_OPERATORS.includes(operator)) {
    return Array.isArray(value) ? null : `operator ${operator} requires an array value`;
  }
  if (operator === 'CONTAINS') {
    // Deliberately shape-agnostic: array means list membership, scalar means
    // substring / equality.
    return null;
  }
  if (SCALAR_OPERATORS.includes(operator)) {
    return Array.isArray(value) ? `operator ${operator} does not accept an array value` : null;
  }
  return `operator ${operator} is not supported`;
}

/** Outcome of trying to evaluate one rule. Invalid rules never "fail" silently. */
export type RuleEvaluationResult =
  | { kind: 'evaluated'; evaluation: RuleEvaluation }
  | { kind: 'invalid'; report: InvalidRuleReport };

/** True only for a real, finite number. Rejects NaN and Infinity. */
function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/** Strict, type-aware equality. Never coerces across types. */
function valuesEqual(a: unknown, b: unknown): boolean {
  if (isFiniteNumber(a) && isFiniteNumber(b)) return a === b;
  if (isString(a) && isString(b)) return a === b;
  if (isBoolean(a) && isBoolean(b)) return a === b;
  return false;
}

/** Renders a rule value for display. Arrays are joined, never stringified as "[object]". */
export function formatRuleValue(value: unknown): string {
  if (Array.isArray(value)) return value.map((v) => String(v)).join(', ');
  if (value === null) return 'null';
  if (value === undefined) return '';
  return String(value);
}

/** Renders an applicant value for display, or null when absent. */
function formatApplicantValue(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (Array.isArray(value)) return value.map((v) => String(v)).join(', ');
  return String(value);
}

/**
 * Whether a supplied value is usable for the registry's declared type.
 *
 * This is what makes a type mismatch UNKNOWN rather than FAIL. Boundary
 * validation (Phase 4C) should stop these arriving at all; the engine refuses to
 * guess when they do.
 */
function matchesFieldType(definition: SchemeFieldDefinition, value: unknown): boolean {
  if (value === null || value === undefined) return false;
  switch (definition.type) {
    case 'number':
      return isFiniteNumber(value);
    case 'string':
      return isString(value);
    case 'boolean':
      return isBoolean(value);
    default:
      return false;
  }
}

/**
 * Applies an operator. Returns `null` when the pair cannot be compared at all,
 * which the caller turns into UNKNOWN.
 */
function applyOperator(
  operator: RuleOperator,
  actual: unknown,
  expected: unknown
): boolean | null {
  switch (operator) {
    case '=':
      return isKnownValue(expected) ? valuesEqual(actual, expected) : null;

    case '!=':
      // NOT_EQUAL is a genuine unknown when the value is missing, not a pass.
      return isKnownValue(expected) ? !valuesEqual(actual, expected) : null;

    case '>':
    case '>=':
    case '<':
    case '<=': {
      // Ordering is numeric only. Comparing strings or booleans with < is a
      // JavaScript coercion trap, so it is refused outright.
      if (!isFiniteNumber(actual) || !isFiniteNumber(expected)) return null;
      if (operator === '>') return actual > expected;
      if (operator === '>=') return actual >= expected;
      if (operator === '<') return actual < expected;
      return actual <= expected;
    }

    case 'IN': {
      if (!Array.isArray(expected)) return null;
      return expected.some((candidate) => valuesEqual(actual, candidate));
    }

    case 'NOT_IN': {
      if (!Array.isArray(expected)) return null;
      return !expected.some((candidate) => valuesEqual(actual, candidate));
    }

    case 'CONTAINS': {
      // Two shapes, per migration 012:
      //   array rule value  -> list membership
      //   scalar rule value -> substring for text, equality for number/boolean
      // The two sides must be the same type. A string needle against a numeric
      // field has no containment relation, so it is undecidable rather than a
      // confident "fail" derived from a meaningless comparison.
      if (Array.isArray(expected)) {
        if (!isKnownValue(actual)) return null;
        return expected.some((candidate) => valuesEqual(actual, candidate));
      }
      if (isString(actual) && isString(expected)) return actual.includes(expected);
      if (isFiniteNumber(actual) && isFiniteNumber(expected)) return actual === expected;
      if (isBoolean(actual) && isBoolean(expected)) return actual === expected;
      return null;
    }

    default:
      return null;
  }
}

function isKnownValue(value: unknown): boolean {
  return isFiniteNumber(value) || isString(value) || isBoolean(value);
}

/**
 * Evaluates one rule against one applicant.
 *
 * Outcome contract:
 *   pass    - the comparison definitively held
 *   fail    - the comparison definitively did not hold
 *   unknown - the field was not supplied, or the value cannot be compared
 *
 * A missing value is NEVER a fail.
 */
export function evaluateRule(
  rule: SchemeRule,
  applicant: SchemeApplicant
): RuleEvaluationResult {
  // ── Structural validation, before any property access ─────────────────────
  if (!isKnownSchemeField(rule.field)) {
    return {
      kind: 'invalid',
      report: {
        ruleId: rule.id,
        field: String(rule.field),
        operator: String(rule.operator),
        reason: 'unknown_field',
        detail: `"${String(rule.field)}" is not in the closed field registry`,
      },
    };
  }

  if (!isKnownRuleOperator(rule.operator)) {
    return {
      kind: 'invalid',
      report: {
        ruleId: rule.id,
        field: rule.field,
        operator: String(rule.operator),
        reason: 'unknown_operator',
        detail: `"${String(rule.operator)}" is not a supported operator`,
      },
    };
  }

  const shapeProblem = checkValueShape(rule.operator, rule.value);
  if (shapeProblem !== null) {
    return {
      kind: 'invalid',
      report: {
        ruleId: rule.id,
        field: rule.field,
        operator: rule.operator,
        reason: 'value_shape_mismatch',
        detail: shapeProblem,
      },
    };
  }

  const definition = getSchemeFieldDefinition(rule.field)!;
  const rawValue = readApplicantField(applicant, rule.field);
  const supplied = rawValue !== undefined && rawValue !== null;

  const build = (
    outcome: RuleEvaluation['outcome'],
    reason: RuleEvaluation['reason'],
    actual: string | null
  ): RuleEvaluation => ({
    ruleId: rule.id,
    field: rule.field,
    operator: rule.operator,
    expected: formatRuleValue(rule.value),
    actual,
    outcome,
    required: rule.required,
    descriptionEn: rule.descriptionEn,
    descriptionKn: rule.descriptionKn,
    reason,
  });

  // ── Missing value: UNKNOWN, never FAIL ────────────────────────────────────
  if (!supplied) {
    return { kind: 'evaluated', evaluation: build('unknown', 'missing_value', null) };
  }

  // ── Supplied but wrong type for the registry: UNKNOWN, not FAIL ──────────
  if (!matchesFieldType(definition, rawValue)) {
    return {
      kind: 'evaluated',
      evaluation: build(
        'unknown',
        'type_mismatch',
        formatApplicantValue(rawValue)
      ),
    };
  }

  const decided = applyOperator(rule.operator, rawValue, rule.value);

  if (decided === null) {
    return {
      kind: 'evaluated',
      evaluation: build(
        'unknown',
        'type_mismatch',
        formatApplicantValue(rawValue)
      ),
    };
  }

  const outcome: RuleEvaluation['outcome'] = decided ? 'pass' : 'fail';
  const reason: RuleEvaluation['reason'] = decided ? 'satisfied' : 'not_satisfied';

  return {
    kind: 'evaluated',
    evaluation: build(outcome, reason, formatApplicantValue(rawValue)),
  };
}
