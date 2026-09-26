import { describe, it, expect } from 'vitest';
import {
  evaluateEligibility,
} from '@/features/schemes/eligibility/eligibility-engine';
import type { SchemeApplicant } from '@/features/schemes/eligibility/field-registry';
import type { SchemeRule } from '@/features/schemes/types';

/**
 * PMUY (Pradhan Mantri Ujjwala Yojana) eligibility rules.
 *
 * All four conditions must be met (single AND group):
 *   Group 1 (AND): age >= 18, gender = female, hasExistingLpgConnection = false, poorHousehold = true
 */

function rule(
  partial: Partial<SchemeRule> &
    Pick<SchemeRule, 'field' | 'operator' | 'value'>
): SchemeRule {
  return {
    id: partial.id ?? `${partial.field}-${partial.operator}`,
    schemeId: 'pmuy',
    ruleGroup: partial.ruleGroup ?? 1,
    groupOperator: partial.groupOperator ?? 'AND',
    ruleType: 'eligibility',
    required: partial.required ?? true,
    descriptionEn: null,
    descriptionKn: null,
    priority: partial.priority ?? 0,
    createdAt: '2026-09-26T00:00:00.000Z',
    ...partial,
  };
}

function pmuyRules(): SchemeRule[] {
  return [
    rule({ field: 'age', operator: '>=', value: 18, ruleGroup: 1, priority: 0 }),
    rule({ field: 'gender', operator: '=', value: 'female', ruleGroup: 1, priority: 1 }),
    rule({ field: 'hasExistingLpgConnection', operator: '=', value: false, ruleGroup: 1, priority: 2 }),
    rule({ field: 'poorHousehold', operator: '=', value: true, ruleGroup: 1, priority: 3 }),
  ];
}

function evaluate(applicant: SchemeApplicant) {
  return evaluateEligibility('pmuy', pmuyRules(), applicant);
}

/** A fully eligible PMUY applicant — baseline for mutation. */
function eligibleApplicant(): SchemeApplicant {
  return {
    age: 25,
    gender: 'female',
    hasExistingLpgConnection: false,
    poorHousehold: true,
  };
}

// ─── eligible applicant ─────────────────────────────────────────────────────

describe('PMUY: eligible applicant', () => {
  it('returns eligible for an adult woman from a poor household with no LPG', () => {
    const result = evaluate(eligibleApplicant());
    expect(result.status).toBe('eligible');
    expect(result.passedRules).toHaveLength(4);
    expect(result.failedRules).toHaveLength(0);
    expect(result.unknownRules).toHaveLength(0);
  });
});

// ─── age boundary ───────────────────────────────────────────────────────────

describe('PMUY: age boundary', () => {
  it('returns not_eligible for age 17', () => {
    const applicant = { ...eligibleApplicant(), age: 17 };
    const result = evaluate(applicant);
    expect(result.status).toBe('not_eligible');
    expect(result.failedRules.some((r) => r.field === 'age')).toBe(true);
  });

  it('returns eligible for age exactly 18', () => {
    const applicant = { ...eligibleApplicant(), age: 18 };
    const result = evaluate(applicant);
    expect(result.status).toBe('eligible');
  });

  it('returns eligible for age 19', () => {
    const applicant = { ...eligibleApplicant(), age: 19 };
    const result = evaluate(applicant);
    expect(result.status).toBe('eligible');
  });

  it('returns not_eligible for age 0', () => {
    const applicant = { ...eligibleApplicant(), age: 0 };
    const result = evaluate(applicant);
    expect(result.status).toBe('not_eligible');
  });
});

// ─── gender ─────────────────────────────────────────────────────────────────

describe('PMUY: gender', () => {
  it('returns not_eligible for male applicant', () => {
    const applicant = { ...eligibleApplicant(), gender: 'male' };
    const result = evaluate(applicant);
    expect(result.status).toBe('not_eligible');
    expect(result.failedRules.some((r) => r.field === 'gender')).toBe(true);
  });

  it('returns eligible for female applicant', () => {
    const applicant = { ...eligibleApplicant(), gender: 'female' };
    const result = evaluate(applicant);
    expect(result.status).toBe('eligible');
  });
});

// ─── existing LPG connection ────────────────────────────────────────────────

describe('PMUY: existing LPG connection', () => {
  it('returns not_eligible when household already has LPG', () => {
    const applicant = { ...eligibleApplicant(), hasExistingLpgConnection: true };
    const result = evaluate(applicant);
    expect(result.status).toBe('not_eligible');
    expect(result.failedRules.some((r) => r.field === 'hasExistingLpgConnection')).toBe(true);
  });

  it('returns eligible when household has no LPG', () => {
    const applicant = { ...eligibleApplicant(), hasExistingLpgConnection: false };
    const result = evaluate(applicant);
    expect(result.status).toBe('eligible');
  });
});

// ─── poor household ─────────────────────────────────────────────────────────

describe('PMUY: poor household', () => {
  it('returns not_eligible when not a poor household', () => {
    const applicant = { ...eligibleApplicant(), poorHousehold: false };
    const result = evaluate(applicant);
    expect(result.status).toBe('not_eligible');
    expect(result.failedRules.some((r) => r.field === 'poorHousehold')).toBe(true);
  });

  it('returns eligible when poor household', () => {
    const applicant = { ...eligibleApplicant(), poorHousehold: true };
    const result = evaluate(applicant);
    expect(result.status).toBe('eligible');
  });
});

// ─── UNKNOWN / missing fields ───────────────────────────────────────────────

describe('PMUY: missing/UNKNOWN fields', () => {
  it('returns potentially_eligible when age is missing', () => {
    const { age, ...rest } = eligibleApplicant();
    void age;
    const result = evaluate(rest);
    expect(result.status).toBe('potentially_eligible');
    expect(result.unknownRules.some((r) => r.field === 'age')).toBe(true);
  });

  it('returns potentially_eligible when gender is missing', () => {
    const { gender, ...rest } = eligibleApplicant();
    void gender;
    const result = evaluate(rest);
    expect(result.status).toBe('potentially_eligible');
    expect(result.unknownRules.some((r) => r.field === 'gender')).toBe(true);
  });

  it('returns potentially_eligible when LPG status is missing', () => {
    const { hasExistingLpgConnection, ...rest } = eligibleApplicant();
    void hasExistingLpgConnection;
    const result = evaluate(rest);
    expect(result.status).toBe('potentially_eligible');
    expect(result.unknownRules.some((r) => r.field === 'hasExistingLpgConnection')).toBe(true);
  });

  it('returns potentially_eligible when poor household status is missing', () => {
    const { poorHousehold, ...rest } = eligibleApplicant();
    void poorHousehold;
    const result = evaluate(rest);
    expect(result.status).toBe('potentially_eligible');
    expect(result.unknownRules.some((r) => r.field === 'poorHousehold')).toBe(true);
  });

  it('returns potentially_eligible when all fields are missing', () => {
    const result = evaluate({});
    expect(result.status).toBe('potentially_eligible');
    expect(result.unknownRules).toHaveLength(4);
  });

  it('returns not_eligible when a known failure overrides unknown fields', () => {
    const applicant: SchemeApplicant = {
      age: 25,
      gender: 'male',
      hasExistingLpgConnection: false,
    };
    const result = evaluate(applicant);
    expect(result.status).toBe('not_eligible');
    expect(result.failedRules.some((r) => r.field === 'gender')).toBe(true);
    expect(result.unknownRules.some((r) => r.field === 'poorHousehold')).toBe(true);
  });
});

// ─── combinations ───────────────────────────────────────────────────────────

describe('PMUY: combinations', () => {
  it('returns not_eligible for adult woman with existing LPG', () => {
    const applicant = {
      age: 25,
      gender: 'female',
      hasExistingLpgConnection: true,
      poorHousehold: true,
    };
    const result = evaluate(applicant);
    expect(result.status).toBe('not_eligible');
    expect(result.failedRules.some((r) => r.field === 'hasExistingLpgConnection')).toBe(true);
  });

  it('returns not_eligible for adult woman not from poor household', () => {
    const applicant = {
      age: 25,
      gender: 'female',
      hasExistingLpgConnection: false,
      poorHousehold: false,
    };
    const result = evaluate(applicant);
    expect(result.status).toBe('not_eligible');
    expect(result.failedRules.some((r) => r.field === 'poorHousehold')).toBe(true);
  });

  it('returns not_eligible for adult man from poor household', () => {
    const applicant = {
      age: 25,
      gender: 'male',
      hasExistingLpgConnection: false,
      poorHousehold: true,
    };
    const result = evaluate(applicant);
    expect(result.status).toBe('not_eligible');
    expect(result.failedRules.some((r) => r.field === 'gender')).toBe(true);
  });

  it('returns not_eligible when multiple conditions fail', () => {
    const applicant = {
      age: 17,
      gender: 'male',
      hasExistingLpgConnection: true,
      poorHousehold: false,
    };
    const result = evaluate(applicant);
    expect(result.status).toBe('not_eligible');
    expect(result.failedRules).toHaveLength(4);
  });
});

// ─── rule structure ─────────────────────────────────────────────────────────

describe('PMUY: rule structure', () => {
  it('has exactly 4 rules in 1 group', () => {
    const rules = pmuyRules();
    expect(rules).toHaveLength(4);
    const groups = new Set(rules.map((r) => r.ruleGroup));
    expect(groups.size).toBe(1);
  });

  it('uses AND group operator', () => {
    const rules = pmuyRules();
    for (const r of rules) {
      expect(r.groupOperator).toBe('AND');
    }
  });
});
