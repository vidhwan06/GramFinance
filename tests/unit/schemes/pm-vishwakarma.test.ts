import { describe, it, expect } from 'vitest';
import { evaluateEligibilityTree } from '@/features/schemes/eligibility/eligibility-engine';
import type { RuleGroupNode, RuleNode, SchemeApplicant } from '@/features/schemes/types';
import type { SchemeRule } from '@/features/schemes/eligibility/check-eligibility-service';

/**
 * PM Vishwakarma eligibility rule tree tests.
 *
 * Tests the nested rule tree:
 *   ROOT AND
 *     ├── age >= 18
 *     ├── trade IN [18 trades]
 *     ├── worksWithHandsAndTools = true
 *     ├── selfEmployed = true
 *     ├── worksInUnorganisedSector = true
 *     ├── engagedInTrade = true
 *     ├── familyMemberAlreadyBeneficiary = false
 *     ├── governmentServiceOrFamilyMember = false
 *     └── LOAN OR
 *         ├── hasSimilarGovtLoanLast5Years = false
 *         ├── MUDRA AND
 *         │   ├── similarGovtLoanType = mudra
 *         │   └── similarGovtLoanFullyRepaid = true
 *         └── PM SVANidhi AND
 *             ├── similarGovtLoanType = pm_svanidhi
 *             └── similarGovtLoanFullyRepaid = true
 */

function rule(partial: Partial<SchemeRule> & Pick<SchemeRule, 'field' | 'operator' | 'value'>): SchemeRule {
  return {
    id: partial.id ?? `${partial.field}-${partial.operator}`,
    schemeId: 'pmvishwakarma',
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
    schemeId: 'pmvishwakarma',
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

const TRADES = [
  'carpenter', 'boat_maker', 'armourer', 'blacksmith', 'hammer_tool_kit_maker',
  'locksmith', 'goldsmith', 'potter', 'sculptor_stone_worker', 'cobbler_footwear_artisan',
  'mason', 'basket_mat_broom_coir_weaver', 'doll_toy_maker', 'barber',
  'garland_maker', 'washerman', 'tailor', 'fishing_net_maker',
];

function pmVishwakarmaTree(): RuleGroupNode {
  return group({
    id: 'root',
    groupOperator: 'AND',
    children: [
      r(rule({ field: 'age', operator: '>=', value: 18, priority: 0 })),
      r(rule({ field: 'trade', operator: 'IN', value: TRADES, priority: 1 })),
      r(rule({ field: 'worksWithHandsAndTools', operator: '=', value: true, priority: 2 })),
      r(rule({ field: 'selfEmployed', operator: '=', value: true, priority: 3 })),
      r(rule({ field: 'worksInUnorganisedSector', operator: '=', value: true, priority: 4 })),
      r(rule({ field: 'engagedInTrade', operator: '=', value: true, priority: 5 })),
      r(rule({ field: 'familyMemberAlreadyBeneficiary', operator: '=', value: false, priority: 6 })),
      r(rule({ field: 'governmentServiceOrFamilyMember', operator: '=', value: false, priority: 7 })),
      g(group({
        id: 'loan-or',
        groupOperator: 'OR',
        children: [
          r(rule({ field: 'hasSimilarGovtLoanLast5Years', operator: '=', value: false, priority: 0 })),
          g(group({
            id: 'mudra-and',
            groupOperator: 'AND',
            children: [
              r(rule({ field: 'similarGovtLoanType', operator: '=', value: 'mudra', priority: 0 })),
              r(rule({ field: 'similarGovtLoanFullyRepaid', operator: '=', value: true, priority: 1 })),
            ],
          })),
          g(group({
            id: 'pm-svanidhi-and',
            groupOperator: 'AND',
            children: [
              r(rule({ field: 'similarGovtLoanType', operator: '=', value: 'pm_svanidhi', priority: 0 })),
              r(rule({ field: 'similarGovtLoanFullyRepaid', operator: '=', value: true, priority: 1 })),
            ],
          })),
        ],
      })),
    ],
  });
}

function evaluate(applicant: SchemeApplicant) {
  return evaluateEligibilityTree('pmvishwakarma', pmVishwakarmaTree(), applicant);
}

/** A fully eligible PM Vishwakarma applicant. */
function eligibleApplicant(): SchemeApplicant {
  return {
    age: 25,
    trade: 'carpenter',
    worksWithHandsAndTools: true,
    selfEmployed: true,
    worksInUnorganisedSector: true,
    engagedInTrade: true,
    familyMemberAlreadyBeneficiary: false,
    governmentServiceOrFamilyMember: false,
    hasSimilarGovtLoanLast5Years: false,
  };
}

// ─── Basic eligibility ──────────────────────────────────────────────────────

describe('PM Vishwakarma: basic eligibility', () => {
  it('returns eligible for a valid 18+ carpenter', () => {
    const result = evaluate(eligibleApplicant());
    expect(result.status).toBe('eligible');
  });

  it('returns not_eligible for age 17', () => {
    const applicant = { ...eligibleApplicant(), age: 17 };
    const result = evaluate(applicant);
    expect(result.status).toBe('not_eligible');
  });

  it('returns eligible for age exactly 18', () => {
    const applicant = { ...eligibleApplicant(), age: 18 };
    const result = evaluate(applicant);
    expect(result.status).toBe('eligible');
  });

  it('returns not_eligible for invalid trade', () => {
    const applicant = { ...eligibleApplicant(), trade: 'software_engineer' };
    const result = evaluate(applicant);
    expect(result.status).toBe('not_eligible');
  });
});

// ─── All 18 trades ──────────────────────────────────────────────────────────

describe('PM Vishwakarma: all 18 valid trades', () => {
  for (const trade of TRADES) {
    it(`passes trade rule for ${trade}`, () => {
      const applicant = { ...eligibleApplicant(), trade };
      const result = evaluate(applicant);
      expect(result.status).toBe('eligible');
    });
  }
});

// ─── Boolean conditions ─────────────────────────────────────────────────────

describe('PM Vishwakarma: boolean conditions', () => {
  it('returns not_eligible when worksWithHandsAndTools=false', () => {
    const applicant = { ...eligibleApplicant(), worksWithHandsAndTools: false };
    expect(evaluate(applicant).status).toBe('not_eligible');
  });

  it('returns not_eligible when selfEmployed=false', () => {
    const applicant = { ...eligibleApplicant(), selfEmployed: false };
    expect(evaluate(applicant).status).toBe('not_eligible');
  });

  it('returns not_eligible when worksInUnorganisedSector=false', () => {
    const applicant = { ...eligibleApplicant(), worksInUnorganisedSector: false };
    expect(evaluate(applicant).status).toBe('not_eligible');
  });

  it('returns not_eligible when engagedInTrade=false', () => {
    const applicant = { ...eligibleApplicant(), engagedInTrade: false };
    expect(evaluate(applicant).status).toBe('not_eligible');
  });

  it('returns not_eligible when familyMemberAlreadyBeneficiary=true', () => {
    const applicant = { ...eligibleApplicant(), familyMemberAlreadyBeneficiary: true };
    expect(evaluate(applicant).status).toBe('not_eligible');
  });

  it('returns not_eligible when governmentServiceOrFamilyMember=true', () => {
    const applicant = { ...eligibleApplicant(), governmentServiceOrFamilyMember: true };
    expect(evaluate(applicant).status).toBe('not_eligible');
  });
});

// ─── Loan logic ──────────────────────────────────────────────────────────────

describe('PM Vishwakarma: loan logic', () => {
  it('returns eligible when no similar government loan', () => {
    const applicant = { ...eligibleApplicant(), hasSimilarGovtLoanLast5Years: false };
    expect(evaluate(applicant).status).toBe('eligible');
  });

  it('returns eligible for MUDRA loan fully repaid', () => {
    const applicant = {
      ...eligibleApplicant(),
      hasSimilarGovtLoanLast5Years: true,
      similarGovtLoanType: 'mudra',
      similarGovtLoanFullyRepaid: true,
    };
    expect(evaluate(applicant).status).toBe('eligible');
  });

  it('returns eligible for PM SVANidhi loan fully repaid', () => {
    const applicant = {
      ...eligibleApplicant(),
      hasSimilarGovtLoanLast5Years: true,
      similarGovtLoanType: 'pm_svanidhi',
      similarGovtLoanFullyRepaid: true,
    };
    expect(evaluate(applicant).status).toBe('eligible');
  });

  it('returns not_eligible for MUDRA loan not fully repaid', () => {
    const applicant = {
      ...eligibleApplicant(),
      hasSimilarGovtLoanLast5Years: true,
      similarGovtLoanType: 'mudra',
      similarGovtLoanFullyRepaid: false,
    };
    expect(evaluate(applicant).status).toBe('not_eligible');
  });

  it('returns not_eligible for PM SVANidhi loan not fully repaid', () => {
    const applicant = {
      ...eligibleApplicant(),
      hasSimilarGovtLoanLast5Years: true,
      similarGovtLoanType: 'pm_svanidhi',
      similarGovtLoanFullyRepaid: false,
    };
    expect(evaluate(applicant).status).toBe('not_eligible');
  });

  it('returns not_eligible for other similar government loan', () => {
    const applicant = {
      ...eligibleApplicant(),
      hasSimilarGovtLoanLast5Years: true,
      similarGovtLoanType: 'other_similar_govt_scheme',
      similarGovtLoanFullyRepaid: false,
    };
    expect(evaluate(applicant).status).toBe('not_eligible');
  });

  it('returns not_eligible for other similar government loan even if fully repaid', () => {
    const applicant = {
      ...eligibleApplicant(),
      hasSimilarGovtLoanLast5Years: true,
      similarGovtLoanType: 'other_similar_govt_scheme',
      similarGovtLoanFullyRepaid: true,
    };
    expect(evaluate(applicant).status).toBe('not_eligible');
  });

  it('returns potentially_eligible when loan type is missing', () => {
    const applicant = {
      ...eligibleApplicant(),
      hasSimilarGovtLoanLast5Years: true,
    };
    const result = evaluate(applicant);
    expect(result.status).toBe('potentially_eligible');
  });
});

// ─── Missing/UNKNOWN fields ──────────────────────────────────────────────────

describe('PM Vishwakarma: missing/UNKNOWN fields', () => {
  it('returns potentially_eligible when trade is missing', () => {
    const { trade, ...rest } = eligibleApplicant();
    void trade;
    const result = evaluate(rest);
    expect(result.status).toBe('potentially_eligible');
  });

  it('returns potentially_eligible when age is missing', () => {
    const { age, ...rest } = eligibleApplicant();
    void age;
    const result = evaluate(rest);
    expect(result.status).toBe('potentially_eligible');
  });

  it('returns potentially_eligible when all fields are missing', () => {
    const result = evaluate({});
    expect(result.status).toBe('potentially_eligible');
  });

  it('returns not_eligible when a known failure overrides unknown fields', () => {
    const applicant: SchemeApplicant = {
      age: 25,
      trade: 'carpenter',
      worksWithHandsAndTools: true,
      selfEmployed: true,
      worksInUnorganisedSector: true,
      engagedInTrade: true,
      familyMemberAlreadyBeneficiary: true,
      governmentServiceOrFamilyMember: false,
      hasSimilarGovtLoanLast5Years: false,
    };
    const result = evaluate(applicant);
    expect(result.status).toBe('not_eligible');
  });
});

// ─── Tree result structure ───────────────────────────────────────────────────

describe('PM Vishwakarma: tree result structure', () => {
  it('preserves nested structure in treeResult', () => {
    const result = evaluate(eligibleApplicant());
    expect(result.treeResult).not.toBeNull();
    expect(result.treeResult?.nodeType).toBe('group');
    expect(result.treeResult?.children).toHaveLength(9);

    // Last child should be the loan OR group
    const loanGroup = result.treeResult?.children?.[8];
    expect(loanGroup?.nodeType).toBe('group');
    expect(loanGroup?.groupOperator).toBe('OR');
    expect(loanGroup?.children).toHaveLength(3);

    // Second child of loan OR should be MUDRA AND
    const mudraGroup = loanGroup?.children?.[1];
    expect(mudraGroup?.nodeType).toBe('group');
    expect(mudraGroup?.groupOperator).toBe('AND');
    expect(mudraGroup?.children).toHaveLength(2);

    // Third child of loan OR should be PM SVANidhi AND
    const pmSvanidhiGroup = loanGroup?.children?.[2];
    expect(pmSvanidhiGroup?.nodeType).toBe('group');
    expect(pmSvanidhiGroup?.groupOperator).toBe('AND');
    expect(pmSvanidhiGroup?.children).toHaveLength(2);
  });
});
