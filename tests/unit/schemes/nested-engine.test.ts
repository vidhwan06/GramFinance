import { describe, it, expect } from 'vitest';
import { evaluateEligibilityTree } from '@/features/schemes/eligibility/eligibility-engine';
import { reduceAnd, reduceOr } from '@/features/schemes/eligibility/tri-state';
import type { RuleGroupNode, RuleNode, SchemeApplicant } from '@/features/schemes/types';
import type { SchemeRule } from '@/features/schemes/eligibility/check-eligibility-service';

/**
 * Phase 5B: Nested rule group engine tests.
 *
 * Tests the recursive evaluator with flat and nested structures.
 */

function rule(partial: Partial<SchemeRule> & Pick<SchemeRule, 'field' | 'operator' | 'value'>): SchemeRule {
  return {
    id: partial.id ?? `${partial.field}-${partial.operator}`,
    schemeId: 'test',
    ruleGroup: partial.ruleGroup ?? 1,
    groupOperator: partial.groupOperator ?? 'AND',
    ruleType: 'eligibility',
    required: partial.required ?? true,
    descriptionEn: null,
    descriptionKn: null,
    priority: partial.priority ?? 0,
    createdAt: '2026-09-27T00:00:00.000Z',
    ...partial,
  };
}

function group(
  partial: Partial<RuleGroupNode> & Pick<RuleGroupNode, 'id' | 'groupOperator'>
): RuleGroupNode {
  return {
    schemeId: 'test',
    parentGroupId: partial.parentGroupId ?? null,
    groupOrder: partial.groupOrder ?? 0,
    children: partial.children ?? [],
    ...partial,
  };
}

function r(rule: SchemeRule): RuleNode {
  return { kind: 'rule', rule };
}

function g(group: RuleGroupNode): RuleNode {
  return { kind: 'group', group };
}

// ─── Flat AND ────────────────────────────────────────────────────────────────

describe('Nested engine: flat AND', () => {
  it('AND(PASS, PASS, PASS) => PASS', () => {
    const root = group({
      id: 'root',
      groupOperator: 'AND',
      children: [
        r(rule({ field: 'age', operator: '>=', value: 18 })),
        r(rule({ field: 'gender', operator: '=', value: 'female' })),
        r(rule({ field: 'poorHousehold', operator: '=', value: true })),
      ],
    });
    const result = evaluateEligibilityTree('test', root, { age: 25, gender: 'female', poorHousehold: true });
    expect(result.status).toBe('eligible');
  });

  it('AND(PASS, FAIL, PASS) => FAIL', () => {
    const root = group({
      id: 'root',
      groupOperator: 'AND',
      children: [
        r(rule({ field: 'age', operator: '>=', value: 18 })),
        r(rule({ field: 'gender', operator: '=', value: 'female' })),
        r(rule({ field: 'poorHousehold', operator: '=', value: true })),
      ],
    });
    const result = evaluateEligibilityTree('test', root, { age: 25, gender: 'male', poorHousehold: true });
    expect(result.status).toBe('not_eligible');
  });

  it('AND(PASS, UNKNOWN, PASS) => UNKNOWN', () => {
    const root = group({
      id: 'root',
      groupOperator: 'AND',
      children: [
        r(rule({ field: 'age', operator: '>=', value: 18 })),
        r(rule({ field: 'gender', operator: '=', value: 'female' })),
        r(rule({ field: 'poorHousehold', operator: '=', value: true })),
      ],
    });
    const result = evaluateEligibilityTree('test', root, { age: 25, poorHousehold: true });
    expect(result.status).toBe('potentially_eligible');
  });
});

// ─── Flat OR ─────────────────────────────────────────────────────────────────

describe('Nested engine: flat OR', () => {
  it('OR(FAIL, PASS, FAIL) => PASS', () => {
    const root = group({
      id: 'root',
      groupOperator: 'OR',
      children: [
        r(rule({ field: 'age', operator: '>=', value: 18 })),
        r(rule({ field: 'gender', operator: '=', value: 'female' })),
        r(rule({ field: 'poorHousehold', operator: '=', value: true })),
      ],
    });
    const result = evaluateEligibilityTree('test', root, { age: 17, gender: 'female', poorHousehold: false });
    expect(result.status).toBe('eligible');
  });

  it('OR(FAIL, UNKNOWN, FAIL) => UNKNOWN', () => {
    const root = group({
      id: 'root',
      groupOperator: 'OR',
      children: [
        r(rule({ field: 'age', operator: '>=', value: 18 })),
        r(rule({ field: 'gender', operator: '=', value: 'female' })),
        r(rule({ field: 'poorHousehold', operator: '=', value: true })),
      ],
    });
    const result = evaluateEligibilityTree('test', root, { age: 17, poorHousehold: false });
    expect(result.status).toBe('potentially_eligible');
  });

  it('OR(FAIL, FAIL, FAIL) => FAIL', () => {
    const root = group({
      id: 'root',
      groupOperator: 'OR',
      children: [
        r(rule({ field: 'age', operator: '>=', value: 18 })),
        r(rule({ field: 'gender', operator: '=', value: 'female' })),
        r(rule({ field: 'poorHousehold', operator: '=', value: true })),
      ],
    });
    const result = evaluateEligibilityTree('test', root, { age: 17, gender: 'male', poorHousehold: false });
    expect(result.status).toBe('not_eligible');
  });
});

// ─── Nested AND inside OR ────────────────────────────────────────────────────

describe('Nested engine: nested AND inside OR', () => {
  it('OR(FAIL, AND(PASS, PASS), AND(PASS, FAIL)) => PASS', () => {
    const root = group({
      id: 'root',
      groupOperator: 'OR',
      children: [
        r(rule({ field: 'age', operator: '>=', value: 18 })),
        g(group({
          id: 'g1',
          groupOperator: 'AND',
          children: [
            r(rule({ field: 'gender', operator: '=', value: 'female' })),
            r(rule({ field: 'poorHousehold', operator: '=', value: true })),
          ],
        })),
        g(group({
          id: 'g2',
          groupOperator: 'AND',
          children: [
            r(rule({ field: 'age', operator: '>=', value: 21 })),
            r(rule({ field: 'poorHousehold', operator: '=', value: false })),
          ],
        })),
      ],
    });
    const result = evaluateEligibilityTree('test', root, { age: 25, gender: 'female', poorHousehold: true });
    expect(result.status).toBe('eligible');
  });

  it('OR(FAIL, AND(PASS, UNKNOWN), FAIL) => UNKNOWN', () => {
    const root = group({
      id: 'root',
      groupOperator: 'OR',
      children: [
        r(rule({ field: 'age', operator: '>=', value: 30 })),
        g(group({
          id: 'g1',
          groupOperator: 'AND',
          children: [
            r(rule({ field: 'gender', operator: '=', value: 'female' })),
            r(rule({ field: 'poorHousehold', operator: '=', value: true })),
          ],
        })),
        r(rule({ field: 'age', operator: '>=', value: 35 })),
      ],
    });
    const result = evaluateEligibilityTree('test', root, { age: 25, gender: 'female' });
    expect(result.status).toBe('potentially_eligible');
  });

  it('OR(FAIL, AND(PASS, FAIL), FAIL) => FAIL', () => {
    const root = group({
      id: 'root',
      groupOperator: 'OR',
      children: [
        r(rule({ field: 'age', operator: '>=', value: 30 })),
        g(group({
          id: 'g1',
          groupOperator: 'AND',
          children: [
            r(rule({ field: 'gender', operator: '=', value: 'female' })),
            r(rule({ field: 'poorHousehold', operator: '=', value: false })),
          ],
        })),
        r(rule({ field: 'age', operator: '>=', value: 35 })),
      ],
    });
    const result = evaluateEligibilityTree('test', root, { age: 25, gender: 'female', poorHousehold: true });
    expect(result.status).toBe('not_eligible');
  });
});

// ─── Nested OR inside AND ────────────────────────────────────────────────────

describe('Nested engine: nested OR inside AND', () => {
  it('AND(PASS, OR(FAIL, PASS), PASS) => PASS', () => {
    const root = group({
      id: 'root',
      groupOperator: 'AND',
      children: [
        r(rule({ field: 'age', operator: '>=', value: 18 })),
        g(group({
          id: 'g1',
          groupOperator: 'OR',
          children: [
            r(rule({ field: 'gender', operator: '=', value: 'female' })),
            r(rule({ field: 'poorHousehold', operator: '=', value: true })),
          ],
        })),
        r(rule({ field: 'age', operator: '<=', value: 60 })),
      ],
    });
    const result = evaluateEligibilityTree('test', root, { age: 25, gender: 'male', poorHousehold: true });
    expect(result.status).toBe('eligible');
  });
});

// ─── Multiple nesting levels ─────────────────────────────────────────────────

describe('Nested engine: multiple nesting levels', () => {
  it('AND(OR(true, AND(false, true)), OR(false, AND(true, true))) => PASS', () => {
    const root = group({
      id: 'root',
      groupOperator: 'AND',
      children: [
        g(group({
          id: 'g1',
          groupOperator: 'OR',
          children: [
            r(rule({ field: 'age', operator: '>=', value: 18 })),
            g(group({
              id: 'g1-1',
              groupOperator: 'AND',
              children: [
                r(rule({ field: 'gender', operator: '=', value: 'male' })),
                r(rule({ field: 'poorHousehold', operator: '=', value: false })),
              ],
            })),
          ],
        })),
        g(group({
          id: 'g2',
          groupOperator: 'OR',
          children: [
            r(rule({ field: 'age', operator: '>=', value: 21 })),
            g(group({
              id: 'g2-1',
              groupOperator: 'AND',
              children: [
                r(rule({ field: 'gender', operator: '=', value: 'female' })),
                r(rule({ field: 'poorHousehold', operator: '=', value: true })),
              ],
            })),
          ],
        })),
      ],
    });
    const result = evaluateEligibilityTree('test', root, { age: 25, gender: 'female', poorHousehold: true });
    expect(result.status).toBe('eligible');
  });
});

// ─── Empty groups ────────────────────────────────────────────────────────────

describe('Nested engine: empty groups', () => {
  it('Empty AND group => PASS', () => {
    const root = group({ id: 'root', groupOperator: 'AND', children: [] });
    const result = evaluateEligibilityTree('test', root, {});
    expect(result.status).toBe('eligible');
  });

  it('Empty OR group => FAIL', () => {
    const root = group({ id: 'root', groupOperator: 'OR', children: [] });
    const result = evaluateEligibilityTree('test', root, {});
    expect(result.status).toBe('not_eligible');
  });
});

// ─── Tree result structure ───────────────────────────────────────────────────

describe('Nested engine: tree result structure', () => {
  it('preserves nested structure in treeResult', () => {
    const root = group({
      id: 'root',
      groupOperator: 'OR',
      children: [
        r(rule({ field: 'age', operator: '>=', value: 18 })),
        g(group({
          id: 'g1',
          groupOperator: 'AND',
          children: [
            r(rule({ field: 'gender', operator: '=', value: 'female' })),
            r(rule({ field: 'poorHousehold', operator: '=', value: true })),
          ],
        })),
      ],
    });
    const result = evaluateEligibilityTree('test', root, { age: 25, gender: 'female', poorHousehold: true });
    expect(result.treeResult).not.toBeNull();
    expect(result.treeResult?.nodeType).toBe('group');
    expect(result.treeResult?.children).toHaveLength(2);
    expect(result.treeResult?.children?.[1].nodeType).toBe('group');
    expect(result.treeResult?.children?.[1].children).toHaveLength(2);
  });
});

// ─── Backward compatibility: flat rules ───────────────────────────────────────

describe('Nested engine: backward compatibility', () => {
  it('flat AND rules produce same results as before', () => {
    const root = group({
      id: 'root',
      groupOperator: 'AND',
      children: [
        r(rule({ field: 'age', operator: '>=', value: 18 })),
        r(rule({ field: 'gender', operator: '=', value: 'female' })),
        r(rule({ field: 'poorHousehold', operator: '=', value: true })),
      ],
    });

    const eligible = evaluateEligibilityTree('test', root, { age: 25, gender: 'female', poorHousehold: true });
    expect(eligible.status).toBe('eligible');

    const notEligible = evaluateEligibilityTree('test', root, { age: 17, gender: 'female', poorHousehold: true });
    expect(notEligible.status).toBe('not_eligible');

    const unknown = evaluateEligibilityTree('test', root, { age: 25, poorHousehold: true });
    expect(unknown.status).toBe('potentially_eligible');
  });
});
