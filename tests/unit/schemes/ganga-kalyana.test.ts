import { describe, it, expect } from 'vitest';
import { evaluateEligibilityTree } from '@/features/schemes/eligibility/eligibility-engine';
import type { RuleGroupNode, RuleNode, SchemeApplicant } from '@/features/schemes/types';
import type { SchemeRule } from '@/features/schemes/eligibility/check-eligibility-service';

/**
 * Ganga Kalyana eligibility rule tree tests.
 *
 * Tests the flat rule tree:
 *   ROOT AND
 *     ├── caste = SC
 *     ├── isFarmer = true
 *     ├── landHoldingAcres >= 1.5
 *     └── landHoldingAcres <= 5
 */

function rule(partial: Partial<SchemeRule> & Pick<SchemeRule, 'field' | 'operator' | 'value'>): SchemeRule {
  return {
    id: partial.id ?? `${partial.field}-${partial.operator}`,
    schemeId: 'ganga-kalyana',
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

function group(partial: Partial<RuleGroupNode> & Pick<RuleGroupNode, 'id' | 'groupOperator'>): RuleGroupNode {
  return {
    schemeId: 'ganga-kalyana',
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

function gangaKalyanaTree(): RuleGroupNode {
  return group({
    id: 'root',
    groupOperator: 'AND',
    children: [
      r(rule({ field: 'caste', operator: '=', value: 'SC', priority: 0 })),
      r(rule({ field: 'isFarmer', operator: '=', value: true, priority: 1 })),
      r(rule({ field: 'landHoldingAcres', operator: '>=', value: 1.5, priority: 2 })),
      r(rule({ field: 'landHoldingAcres', operator: '<=', value: 5, priority: 3 })),
    ],
  });
}

function evaluate(applicant: SchemeApplicant) {
  return evaluateEligibilityTree('ganga-kalyana', gangaKalyanaTree(), applicant);
}

/** A fully eligible Ganga Kalyana applicant. */
function eligibleApplicant(): SchemeApplicant {
  return {
    caste: 'SC',
    isFarmer: true,
    landHoldingAcres: 3,
  };
}

// ─── Basic eligibility ──────────────────────────────────────────────────────

describe('Ganga Kalyana: basic eligibility', () => {
  it('returns eligible for a valid SC farmer with 3 acres', () => {
    const result = evaluate(eligibleApplicant());
    expect(result.status).toBe('eligible');
  });

  it('returns not_eligible for caste ST', () => {
    const applicant = { ...eligibleApplicant(), caste: 'ST' };
    const result = evaluate(applicant);
    expect(result.status).toBe('not_eligible');
  });

  it('returns not_eligible for caste OBC', () => {
    const applicant = { ...eligibleApplicant(), caste: 'OBC' };
    const result = evaluate(applicant);
    expect(result.status).toBe('not_eligible');
  });

  it('returns not_eligible for caste General', () => {
    const applicant = { ...eligibleApplicant(), caste: 'General' };
    const result = evaluate(applicant);
    expect(result.status).toBe('not_eligible');
  });

  it('returns not_eligible for missing caste', () => {
    const { caste, ...rest } = eligibleApplicant();
    void caste;
    const result = evaluate(rest);
    expect(result.status).toBe('potentially_eligible');
  });

  it('returns not_eligible for isFarmer = false', () => {
    const applicant = { ...eligibleApplicant(), isFarmer: false };
    const result = evaluate(applicant);
    expect(result.status).toBe('not_eligible');
  });

  it('returns not_eligible for missing isFarmer', () => {
    const { isFarmer, ...rest } = eligibleApplicant();
    void isFarmer;
    const result = evaluate(rest);
    expect(result.status).toBe('potentially_eligible');
  });
});

// ─── Land holding bounds ────────────────────────────────────────────────────

describe('Ganga Kalyana: land holding bounds', () => {
  it('returns eligible for landHoldingAcres = 1.5 (lower bound)', () => {
    const applicant = { ...eligibleApplicant(), landHoldingAcres: 1.5 };
    const result = evaluate(applicant);
    expect(result.status).toBe('eligible');
  });

  it('returns eligible for landHoldingAcres = 5 (upper bound)', () => {
    const applicant = { ...eligibleApplicant(), landHoldingAcres: 5 };
    const result = evaluate(applicant);
    expect(result.status).toBe('eligible');
  });

  it('returns not_eligible for landHoldingAcres = 1.4 (below lower bound)', () => {
    const applicant = { ...eligibleApplicant(), landHoldingAcres: 1.4 };
    const result = evaluate(applicant);
    expect(result.status).toBe('not_eligible');
  });

  it('returns not_eligible for landHoldingAcres = 5.1 (above upper bound)', () => {
    const applicant = { ...eligibleApplicant(), landHoldingAcres: 5.1 };
    const result = evaluate(applicant);
    expect(result.status).toBe('not_eligible');
  });

  it('returns not_eligible for landHoldingAcres = 1 (well below)', () => {
    const applicant = { ...eligibleApplicant(), landHoldingAcres: 1 };
    const result = evaluate(applicant);
    expect(result.status).toBe('not_eligible');
  });

  it('returns not_eligible for landHoldingAcres = 10 (well above)', () => {
    const applicant = { ...eligibleApplicant(), landHoldingAcres: 10 };
    const result = evaluate(applicant);
    expect(result.status).toBe('not_eligible');
  });

  it('returns potentially_eligible for missing landHoldingAcres', () => {
    const { landHoldingAcres, ...rest } = eligibleApplicant();
    void landHoldingAcres;
    const result = evaluate(rest);
    expect(result.status).toBe('potentially_eligible');
  });
});

// ─── Multiple invalid conditions ────────────────────────────────────────────

describe('Ganga Kalyana: multiple invalid conditions', () => {
  it('returns not_eligible for non-SC and non-farmer', () => {
    const applicant = { ...eligibleApplicant(), caste: 'OBC', isFarmer: false };
    const result = evaluate(applicant);
    expect(result.status).toBe('not_eligible');
  });

  it('returns not_eligible for SC but non-farmer with valid land', () => {
    const applicant = { ...eligibleApplicant(), isFarmer: false };
    const result = evaluate(applicant);
    expect(result.status).toBe('not_eligible');
  });

  it('returns not_eligible for non-SC farmer with valid land', () => {
    const applicant = { ...eligibleApplicant(), caste: 'General' };
    const result = evaluate(applicant);
    expect(result.status).toBe('not_eligible');
  });
});

// ─── Missing/UNKNOWN fields ────────────────────────────────────────────────

describe('Ganga Kalyana: missing/UNKNOWN fields', () => {
  it('returns potentially_eligible when all fields are missing', () => {
    const result = evaluate({});
    expect(result.status).toBe('potentially_eligible');
  });

  it('returns potentially_eligible when only caste is provided', () => {
    const result = evaluate({ caste: 'SC' });
    expect(result.status).toBe('potentially_eligible');
  });

  it('returns potentially_eligible when caste and isFarmer provided but land missing', () => {
    const result = evaluate({ caste: 'SC', isFarmer: true });
    expect(result.status).toBe('potentially_eligible');
  });

  it('returns not_eligible when a known failure overrides unknown fields', () => {
    const applicant: SchemeApplicant = {
      caste: 'SC',
      isFarmer: true,
      landHoldingAcres: 10, // fails upper bound
    };
    const result = evaluate(applicant);
    expect(result.status).toBe('not_eligible');
  });
});

// ─── Tree result structure ────────────────────────────────────────────────

describe('Ganga Kalyana: tree result structure', () => {
  it('preserves flat structure in treeResult', () => {
    const result = evaluate(eligibleApplicant());
    expect(result.treeResult).not.toBeNull();
    expect(result.treeResult?.nodeType).toBe('group');
    expect(result.treeResult?.groupOperator).toBe('AND');
    expect(result.treeResult?.children).toHaveLength(4);

    const childFields = result.treeResult?.children?.map(c => 
      c.nodeType === 'rule' ? c.rule?.field : 'group'
    );
    expect(childFields?.sort()).toEqual(['caste', 'isFarmer', 'landHoldingAcres', 'landHoldingAcres'].sort());
  });
});