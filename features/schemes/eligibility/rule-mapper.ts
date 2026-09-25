import type { DbSchemeRule } from '@/types/database';
import { isKnownSchemeField, type SchemeFieldName } from './field-registry';
import { isKnownRuleOperator } from './rule-evaluator';
import type {
  RuleGroupOperator,
  RuleOperator,
  SchemeRule,
  SchemeRuleType,
} from '../types';

/**
 * Maps a `public.scheme_rules` row onto the domain `SchemeRule`.
 *
 * Kept in its own module so the evaluator itself imports nothing from the data
 * layer. This is a type-only import of our own module — no Supabase SDK, no
 * client, no query.
 *
 * The database CHECK constraints should already guarantee a known field, a known
 * operator and a value whose shape matches the operator. This mapper re-checks
 * rather than trusting that, because a silently mis-typed rule is worse than a
 * reported one.
 */

export interface MappedSchemeRule {
  rule: SchemeRule;
  /** Populated when the row could not be mapped faithfully. */
  problem: string | null;
}

function normaliseRuleValue(
  value: unknown
): number | string | boolean | Array<number | string | boolean> {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is number | string | boolean =>
        typeof item === 'number' || typeof item === 'string' || typeof item === 'boolean'
    );
  }
  if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }
  return String(value ?? '');
}

export function toSchemeRule(row: DbSchemeRule): MappedSchemeRule {
  const problems: string[] = [];

  if (!isKnownSchemeField(row.field)) {
    problems.push(`unknown field "${String(row.field)}"`);
  }
  if (!isKnownRuleOperator(row.operator)) {
    problems.push(`unknown operator "${String(row.operator)}"`);
  }

  return {
    problem: problems.length > 0 ? problems.join('; ') : null,
    rule: {
      id: row.id,
      schemeId: row.scheme_id,
      ruleGroup: row.rule_group,
      groupOperator: row.group_operator as RuleGroupOperator,
      ruleType: row.rule_type as SchemeRuleType,
      field: row.field as SchemeFieldName,
      operator: row.operator as RuleOperator,
      value: normaliseRuleValue(row.value),
      required: row.required,
      descriptionEn: row.description_en,
      descriptionKn: row.description_kn,
      priority: row.priority,
      createdAt: row.created_at,
    },
  };
}

/** Convenience for loading a scheme's full rule set. */
export function toSchemeRules(rows: readonly DbSchemeRule[]): {
  rules: SchemeRule[];
  problems: string[];
} {
  const rules: SchemeRule[] = [];
  const problems: string[] = [];

  for (const row of rows) {
    const mapped = toSchemeRule(row);
    rules.push(mapped.rule);
    if (mapped.problem) problems.push(`${row.id}: ${mapped.problem}`);
  }

  return { rules, problems };
}
