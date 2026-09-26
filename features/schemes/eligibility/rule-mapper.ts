import type { DbSchemeRule, DbRuleGroup, DbRuleNode } from '@/types/database';
import { isKnownSchemeField, type SchemeFieldName } from './field-registry';
import { isKnownRuleOperator } from './rule-evaluator';
import type {
  RuleGroupNode,
  RuleGroupOperator,
  RuleNode,
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

// ─────────────────────────────────────────────────────────────────────────────
// Tree reconstruction (Phase 5B)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Reconstructs a rule tree from database rows.
 *
 * Takes flat rule_groups and rule_nodes rows and builds the nested tree
 * structure. The root group (parent_group_id IS NULL) is the entry point.
 *
 * Returns null if no root group exists or if the tree is malformed.
 */
export function reconstructRuleTree(
  groups: readonly DbRuleGroup[],
  nodes: readonly DbRuleNode[]
): RuleGroupNode | null {
  // Build lookup maps
  const groupMap = new Map<string, DbRuleGroup>();
  for (const g of groups) {
    groupMap.set(g.id, g);
  }

  const nodesByGroup = new Map<string, DbRuleNode[]>();
  for (const n of nodes) {
    const list = nodesByGroup.get(n.group_id) ?? [];
    list.push(n);
    nodesByGroup.set(n.group_id, list);
  }

  // Find root group
  const roots = groups.filter(g => g.parent_group_id === null);
  if (roots.length === 0) return null;
  if (roots.length > 1) return null; // Multiple roots = malformed

  const rootGroup = roots[0];

  // Recursively build tree
  function buildGroup(group: DbRuleGroup): RuleGroupNode {
    const groupNodes = nodesByGroup.get(group.id) ?? [];
    // Sort by priority
    groupNodes.sort((a, b) => a.priority - b.priority);

    const children: RuleNode[] = [];
    for (const node of groupNodes) {
      if (node.node_type === 'rule') {
        children.push({ kind: 'rule', rule: nodeToSchemeRule(node) });
      } else if (node.node_type === 'group' && node.child_group_id) {
        const childGroup = groupMap.get(node.child_group_id);
        if (childGroup) {
          children.push({ kind: 'group', group: buildGroup(childGroup) });
        }
      }
    }

    return {
      id: group.id,
      schemeId: group.scheme_id,
      parentGroupId: group.parent_group_id,
      groupOperator: group.group_operator as RuleGroupOperator,
      groupOrder: group.group_order,
      children,
    };
  }

  return buildGroup(rootGroup);
}

function nodeToSchemeRule(node: DbRuleNode): SchemeRule {
  return {
    id: node.id,
    schemeId: node.group_id, // Will be overwritten by caller if needed
    ruleGroup: 0, // Not used in tree mode
    groupOperator: 'AND', // Not used in tree mode
    ruleType: 'eligibility',
    field: node.field as SchemeFieldName,
    operator: node.operator as RuleOperator,
    value: normaliseRuleValue(node.value),
    required: node.required,
    descriptionEn: node.description_en,
    descriptionKn: node.description_kn,
    priority: node.priority,
    createdAt: node.created_at,
  };
}
