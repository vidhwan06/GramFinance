import {
  isKnownSchemeField,
  type SchemeApplicant,
  type SchemeFieldName,
} from './field-registry';
import { evaluateRule } from './rule-evaluator';
import { reduceOutcomes } from './tri-state';
import type {
  EligibilityStatus,
  GroupEvaluation,
  InvalidRuleReport,
  NodeEvaluation,
  RuleEvaluation,
  RuleGroupNode,
  RuleGroupOperator,
  RuleNode,
  RuleOutcome,
  SchemeEligibilityResult,
  SchemeRule,
} from '../types';

/**
 * The eligibility engine: rules in, an explainable verdict out.
 *
 * Pure and deterministic. No Supabase, no React, no Next.js, no browser APIs,
 * no clock, no randomness. The same inputs always produce the same result.
 *
 * SEMANTICS (V1)
 * --------------
 * 1. Each rule evaluates to pass / fail / unknown. A field the applicant did not
 *    supply is UNKNOWN, never FAIL.
 *
 * 2. Rules are grouped by `ruleGroup`. Inside a group they combine with the
 *    group's `groupOperator` using three-valued logic:
 *      AND -> any fail makes the group fail; else any unknown makes it unknown
 *      OR  -> any pass settles the group; else any unknown makes it unknown
 *
 * 3. Groups are ALL mandatory and are combined with AND. `groupOperator` is the
 *    operator INSIDE a group; it is not the operator between groups.
 *
 *    This is the one place the Phase 4B specification was ambiguous, so the
 *    reasoning is recorded here.
 *
 *    The specification showed "Group 1 OR Group 2" but also defined NOT_ELIGIBLE
 *    as "at least one required rule fails". Those two cannot both hold for a
 *    multi-group scheme. With OR-combined groups a failing rule is routinely
 *    cancelled by a passing sibling group, so the status rule becomes false and,
 *    worse, a hard constraint can be bypassed:
 *
 *        group 1: (loanPurpose = agriculture) AND (amount <= 250000)
 *        group 2: (existingLoan = false) OR (state IN [Karnataka])
 *
 *    An applicant requesting 250001 passes group 2 and would be told they may be
 *    eligible for a scheme whose ceiling they exceed. For a financial-safety
 *    tool that is a material harm, so groups are AND-combined.
 *
 *    Alternatives remain fully expressible, which is what the specification
 *    actually needed: put them in ONE group with OR. "Farmer OR agricultural
 *    worker" is a single OR group, not two groups.
 *
 * 4. Overall status follows the combined group outcome:
 *      pass    -> eligible
 *      unknown -> potentially_eligible
 *      fail    -> not_eligible
 *
 * KNOWN V1 LIMITATIONS
 * --------------------
 * - `required` is recorded on every evaluation and drives `missingInformation`,
 *   but it does NOT change the arithmetic: every rule in a group participates in
 *   that group's written expression. Making a single rule non-blocking is not
 *   expressible yet and needs a separate mechanism later.
 * - A scheme with no evaluable rules is `potentially_eligible`, never
 *   `eligible`. There is no evidence the applicant qualifies, and a tool that
 *   claims they do without a single satisfied rule is worse than one that says
 *   it cannot confirm.
 *
 * GROUPING
 * --------
 * `ruleGroup` exists so a related set of conditions can be reported and reasoned
 * about together (for example "basic requirements" vs "exemption"). It is NOT a
 * mechanism for expressing "scheme A OR scheme B" across groups, because that
 * reading allows a failed hard limit to be cancelled by an unrelated passing
 * group. Use a single group with `groupOperator = 'OR'` for genuine alternatives.
 */

/** Deterministic ordering: group number, then author priority, then id. */
function orderRules(rules: readonly SchemeRule[]): SchemeRule[] {
  return [...rules].sort(
    (a, b) => a.ruleGroup - b.ruleGroup || a.priority - b.priority || a.id.localeCompare(b.id)
  );
}

interface RuleGroup {
  ruleGroup: number;
  groupOperator: RuleGroupOperator;
  rules: SchemeRule[];
}

function groupRules(rules: readonly SchemeRule[]): RuleGroup[] {
  const groups: RuleGroup[] = [];

  for (const rule of rules) {
    const last = groups[groups.length - 1];
    if (last && last.ruleGroup === rule.ruleGroup) {
      last.rules.push(rule);
    } else {
      groups.push({
        ruleGroup: rule.ruleGroup,
        groupOperator: rule.groupOperator,
        rules: [rule],
      });
    }
  }

  return groups;
}

interface EvaluatedGroup {
  outcome: RuleOutcome;
  evaluations: RuleEvaluation[];
}

/**
 * Which registry fields are still needed for a firm answer.
 *
 * Only rules in a group that is still UNKNOWN contribute. A group that already
 * passed needs nothing further, and a group that already failed is settled, so
 * asking for more would only confuse the user. Among unknown groups, only rules
 * marked `required` count.
 */
function collectMissingInformation(groups: readonly EvaluatedGroup[]): string[] {
  const missing = new Set<SchemeFieldName>();

  for (const group of groups) {
    if (group.outcome !== 'unknown') continue;
    for (const evaluation of group.evaluations) {
      if (evaluation.outcome === 'unknown' && evaluation.required) {
        missing.add(evaluation.field);
      }
    }
  }

  return [...missing].sort();
}

function statusFromOutcome(outcome: RuleOutcome): EligibilityStatus {
  if (outcome === 'pass') return 'eligible';
  if (outcome === 'unknown') return 'potentially_eligible';
  return 'not_eligible';
}

/**
 * Recursively evaluates a node in the rule tree.
 *
 * For rule nodes: delegates to the existing single-rule evaluator.
 * For group nodes: recursively evaluates children, then reduces with the
 * group's operator.
 *
 * Returns a NodeEvaluation that preserves the tree structure for explainability.
 */
function evaluateNode(
  node: RuleNode,
  applicant: SchemeApplicant
): NodeEvaluation {
  if (node.kind === 'rule') {
    const result = evaluateRule(node.rule, applicant);

    if (result.kind === 'invalid') {
      return {
        nodeId: node.rule.id,
        nodeType: 'rule',
        outcome: 'unknown',
        rule: {
          ruleId: node.rule.id,
          field: node.rule.field,
          operator: node.rule.operator,
          expected: String(node.rule.value),
          actual: null,
          outcome: 'unknown',
          required: node.rule.required,
          descriptionEn: node.rule.descriptionEn,
          descriptionKn: node.rule.descriptionKn,
          reason: 'missing_value',
        },
      };
    }

    return {
      nodeId: node.rule.id,
      nodeType: 'rule',
      outcome: result.evaluation.outcome,
      rule: result.evaluation,
    };
  }

  // Group node
  const group = node.group;
  const childResults = group.children.map(child => evaluateNode(child, applicant));
  const outcomes = childResults.map(r => r.outcome);
  const outcome = reduceOutcomes(outcomes, group.groupOperator);

  return {
    nodeId: group.id,
    nodeType: 'group',
    outcome,
    groupOperator: group.groupOperator,
    children: childResults,
  };
}

/**
 * Flattens a tree result into passed/failed/unknown rule lists.
 */
function flattenTreeResult(node: NodeEvaluation): {
  passed: RuleEvaluation[];
  failed: RuleEvaluation[];
  unknown: RuleEvaluation[];
} {
  const passed: RuleEvaluation[] = [];
  const failed: RuleEvaluation[] = [];
  const unknown: RuleEvaluation[] = [];

  function walk(n: NodeEvaluation): void {
    if (n.nodeType === 'rule' && n.rule) {
      if (n.rule.outcome === 'pass') passed.push(n.rule);
      else if (n.rule.outcome === 'fail') failed.push(n.rule);
      else unknown.push(n.rule);
    }
    if (n.children) {
      for (const child of n.children) walk(child);
    }
  }

  walk(node);
  return { passed, failed, unknown };
}

/**
 * Collects missing information from a tree result.
 */
function collectMissingFromTree(node: NodeEvaluation): string[] {
  const missing = new Set<SchemeFieldName>();

  function walk(n: NodeEvaluation): void {
    if (n.nodeType === 'rule' && n.rule && n.rule.outcome === 'unknown' && n.rule.required) {
      missing.add(n.rule.field);
    }
    if (n.children) {
      for (const child of n.children) walk(child);
    }
  }

  walk(node);
  return [...missing].sort();
}

/**
 * Evaluates a scheme's rule tree recursively.
 *
 * The root group is the entry point. Its operator determines top-level behavior.
 * Children can be rules or nested groups.
 */
export function evaluateEligibilityTree(
  schemeId: string,
  rootGroup: RuleGroupNode,
  applicant: SchemeApplicant
): SchemeEligibilityResult {
  const treeResult = evaluateNode({ kind: 'group', group: rootGroup }, applicant);
  const { passed, failed, unknown } = flattenTreeResult(treeResult);
  const missingInformation = collectMissingFromTree(treeResult);

  return {
    schemeId,
    status: statusFromOutcome(treeResult.outcome),
    passedRules: passed,
    failedRules: failed,
    unknownRules: unknown,
    missingInformation,
    groupResults: [], // Populated by caller if needed for flat display
    invalidRules: [],
    treeResult,
  };
}

/**
 * Legacy entry point: evaluates flat rules (backward compatible).
 *
 * Wraps flat rules in a root AND group and delegates to the tree evaluator.
 */
export function evaluateEligibility(
  schemeId: string,
  rules: readonly SchemeRule[],
  applicant: SchemeApplicant
): SchemeEligibilityResult {
  const passedRules: RuleEvaluation[] = [];
  const failedRules: RuleEvaluation[] = [];
  const unknownRules: RuleEvaluation[] = [];
  const invalidRules: InvalidRuleReport[] = [];
  const groupResults: GroupEvaluation[] = [];
  const evaluatedGroups: EvaluatedGroup[] = [];

  for (const group of groupRules(orderRules(rules))) {
    const groupEvaluations: RuleEvaluation[] = [];
    const groupRuleIds: string[] = [];
    let invalidInGroup = 0;

    for (const rule of group.rules) {
      const result = evaluateRule(rule, applicant);

      if (result.kind === 'invalid') {
        // Surfaced, never silently dropped. See InvalidRuleReport.
        invalidRules.push(result.report);
        invalidInGroup += 1;
        continue;
      }

      groupEvaluations.push(result.evaluation);
      groupRuleIds.push(result.evaluation.ruleId);
    }

    let outcome = reduceOutcomes(
      groupEvaluations.map((e) => e.outcome),
      group.groupOperator
    );

    // A group we could not fully evaluate is UNKNOWN, never a confident verdict.
    // Without this, dropping an invalid rule would leave an empty group that
    // reduces to a vacuous pass, manufacturing eligibility out of an authoring
    // bug.
    if (invalidInGroup > 0) outcome = 'unknown';

    for (const evaluation of groupEvaluations) {
      if (evaluation.outcome === 'pass') passedRules.push(evaluation);
      else if (evaluation.outcome === 'fail') failedRules.push(evaluation);
      else unknownRules.push(evaluation);
    }

    groupResults.push({
      ruleGroup: group.ruleGroup,
      groupOperator: group.groupOperator,
      outcome,
      ruleIds: groupRuleIds,
    });

    evaluatedGroups.push({ outcome, evaluations: groupEvaluations });
  }

  // Every group is a mandatory condition.
  const overall: RuleOutcome =
    evaluatedGroups.length === 0
      ? 'unknown'
      : reduceOutcomes(
          evaluatedGroups.map((g) => g.outcome),
          'AND'
        );

  return {
    schemeId,
    status: statusFromOutcome(overall),
    passedRules,
    failedRules,
    unknownRules,
    missingInformation: collectMissingInformation(evaluatedGroups),
    groupResults,
    invalidRules,
  };
}

/**
 * The registry fields a set of rules actually consults.
 *
 * The eligibility form should ask for these and nothing more, rather than
 * showing every registry field to every user. Invalid rules contribute nothing,
 * because the registry is the only source of a legitimate field name.
 */
export function collectRequiredFields(rules: readonly SchemeRule[]): SchemeFieldName[] {
  const fields = new Set<SchemeFieldName>();

  for (const rule of rules) {
    if (!rule.required) continue;
    if (!isKnownSchemeField(rule.field)) continue;
    fields.add(rule.field);
  }

  return [...fields].sort();
}
