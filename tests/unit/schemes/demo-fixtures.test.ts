import { describe, it, expect } from 'vitest';
import { evaluateEligibility, collectRequiredFields } from '@/features/schemes/eligibility/eligibility-engine';
import type { SchemeApplicant } from '@/features/schemes/eligibility/field-registry';
import type { RuleOperator, SchemeRule } from '@/features/schemes/types';

/**
 * Regression tests against the real DEMO_SCHEME_001 / DEMO_SCHEME_002 rules.
 *
 * These fixtures mirror supabase/seed-demo.sql rule for rule. They are pure data
 * -- no Supabase, no network -- so the engine is verified against exactly what
 * will be stored in the database once the seed runs.
 *
 * DEMO_SCHEME_001 (active)  group 1, AND:
 *   age               >= 18
 *   annualIncome      <= 500000
 *   occupation        IN ["student", "farmer"]
 *   applicantCategory NOT_IN ["unverified"]
 *
 * DEMO_SCHEME_002 (draft)  group 1, AND:
 *   loanPurpose         = "agriculture"
 *   requestedLoanAmount <= 250000
 * group 2, OR:
 *   existingLoan = false
 *   state        IN ["Karnataka"]
 */

function rule(
  id: string,
  ruleGroup: number,
  groupOperator: 'AND' | 'OR',
  field: SchemeRule['field'],
  operator: RuleOperator,
  value: SchemeRule['value'],
  priority: number,
  required = true
): SchemeRule {
  return {
    id,
    schemeId: 'demo',
    ruleGroup,
    groupOperator,
    ruleType: 'eligibility',
    field,
    operator,
    value,
    required,
    descriptionEn: `DEMO: ${id}`,
    descriptionKn: null,
    priority,
    createdAt: '2026-09-26T00:00:00.000Z',
  };
}

const DEMO_001: SchemeRule[] = [
  rule('d1-age', 1, 'AND', 'age', '>=', 18, 1),
  rule('d1-income', 1, 'AND', 'annualIncome', '<=', 500000, 2),
  rule('d1-occupation', 1, 'AND', 'occupation', 'IN', ['student', 'farmer'], 3),
  rule('d1-category', 1, 'AND', 'applicantCategory', 'NOT_IN', ['unverified'], 4),
];

const DEMO_002: SchemeRule[] = [
  rule('d2-purpose', 1, 'AND', 'loanPurpose', '=', 'agriculture', 1),
  rule('d2-amount', 1, 'AND', 'requestedLoanAmount', '<=', 250000, 2),
  rule('d2-no-loan', 2, 'OR', 'existingLoan', '=', false, 1),
  rule('d2-state', 2, 'OR', 'state', 'IN', ['Karnataka'], 2),
];

const evaluate001 = (applicant: SchemeApplicant) =>
  evaluateEligibility('DEMO_SCHEME_001', DEMO_001, applicant);

const evaluate002 = (applicant: SchemeApplicant) =>
  evaluateEligibility('DEMO_SCHEME_002', DEMO_002, applicant);

const FULL_001: SchemeApplicant = {
  age: 23,
  annualIncome: 300000,
  occupation: 'student',
  applicantCategory: 'general',
};

describe('DEMO_SCHEME_001 - single AND group', () => {
  it('is eligible for a fully matching applicant', () => {
    const result = evaluate001(FULL_001);
    expect(result.status).toBe('eligible');
    expect(result.passedRules).toHaveLength(4);
    expect(result.failedRules).toHaveLength(0);
    expect(result.unknownRules).toHaveLength(0);
    expect(result.missingInformation).toEqual([]);
    expect(result.invalidRules).toEqual([]);
    expect(result.groupResults).toEqual([
      { ruleGroup: 1, groupOperator: 'AND', outcome: 'pass', ruleIds: ['d1-age', 'd1-income', 'd1-occupation', 'd1-category'] },
    ]);
  });

  it('asks for exactly the missing field', () => {
    const { annualIncome: _omitted, ...withoutIncome } = FULL_001;
    const result = evaluate001(withoutIncome);
    expect(result.status).toBe('potentially_eligible');
    expect(result.missingInformation).toEqual(['annualIncome']);
    expect(result.passedRules).toHaveLength(3);
  });

  it('rejects an applicant over the income limit', () => {
    const result = evaluate001({ ...FULL_001, annualIncome: 700000 });
    expect(result.status).toBe('not_eligible');
    expect(result.failedRules.map((r) => r.ruleId)).toEqual(['d1-income']);
    // The limit is 5 lakh RUPEES, not 5 lakh paise.
    expect(result.failedRules[0].expected).toBe('500000');
  });

  it('accepts an applicant exactly on the income boundary', () => {
    expect(evaluate001({ ...FULL_001, annualIncome: 500000 }).status).toBe('eligible');
    expect(evaluate001({ ...FULL_001, annualIncome: 500001 }).status).toBe('not_eligible');
  });

  it('rejects an applicant under 18', () => {
    expect(evaluate001({ ...FULL_001, age: 17 }).status).toBe('not_eligible');
    expect(evaluate001({ ...FULL_001, age: 18 }).status).toBe('eligible');
  });

  it('rejects an occupation outside the list', () => {
    expect(evaluate001({ ...FULL_001, occupation: 'teacher' }).status).toBe('not_eligible');
  });

  it('rejects the unverified applicant category', () => {
    expect(evaluate001({ ...FULL_001, applicantCategory: 'unverified' }).status).toBe('not_eligible');
    expect(evaluate001({ ...FULL_001, applicantCategory: 'sc' }).status).toBe('eligible');
  });

  it('does not treat a missing applicant category as "not unverified"', () => {
    // NOT_IN over an absent value must not resolve to a pass.
    const { applicantCategory: _omitted, ...withoutCategory } = FULL_001;
    const result = evaluate001(withoutCategory);
    expect(result.status).toBe('potentially_eligible');
    expect(result.missingInformation).toEqual(['applicantCategory']);
  });

  it('collects every required field for the form', () => {
    expect(collectRequiredFields(DEMO_001)).toEqual([
      'age',
      'annualIncome',
      'applicantCategory',
      'occupation',
    ]);
  });
});

describe('DEMO_SCHEME_002 - AND group plus OR group', () => {
  const BASE: SchemeApplicant = {
    loanPurpose: 'agriculture',
    requestedLoanAmount: 200000,
  };

  it('is eligible when group 1 passes and the OR group is satisfied', () => {
    const result = evaluate002({ ...BASE, existingLoan: false });
    expect(result.status).toBe('eligible');
    expect(result.groupResults).toHaveLength(2);
    expect(result.groupResults[1].outcome).toBe('pass');
  });

  it('is eligible via the state branch of the OR group', () => {
    // existingLoan is absent (UNKNOWN) but state satisfies the alternative.
    const result = evaluate002({ ...BASE, state: 'Karnataka' });
    expect(result.status).toBe('eligible');
    expect(result.groupResults[1].outcome).toBe('pass');
  });

  it('does not ask for existingLoan once the state branch has passed', () => {
    // The specification's OR-group warning: a satisfied alternative route means
    // the user must not be prompted for the sibling field.
    const result = evaluate002({ ...BASE, state: 'Karnataka' });
    expect(result.missingInformation).toEqual([]);
  });

  it('is potentially eligible when the OR group is unresolved', () => {
    const result = evaluate002({ ...BASE, existingLoan: true });
    expect(result.status).toBe('potentially_eligible');
    expect(result.missingInformation).toEqual(['state']);
  });

  it('is not eligible when both the AND group and the OR group fail', () => {
    const result = evaluate002({
      loanPurpose: 'education',
      requestedLoanAmount: 200000,
      existingLoan: true,
      state: 'Goa',
    });
    expect(result.status).toBe('not_eligible');
    expect(result.groupResults.every((g) => g.outcome === 'fail')).toBe(true);
  });

  it('a failing AND group is not rescued by the OR group', () => {
    // This is the case that decided the group semantics. An applicant who wants
    // an education loan must NOT be told they may be eligible for a farm-credit
    // scheme purely because they have no existing loan.
    const result = evaluate002({
      loanPurpose: 'education', // fails group 1
      requestedLoanAmount: 200000,
      existingLoan: false, // group 2 would pass
      state: 'Karnataka',
    });
    expect(result.groupResults[0].outcome).toBe('fail');
    expect(result.groupResults[1].outcome).toBe('pass');
    expect(result.status).toBe('not_eligible');
  });

  it('rejects an amount above the scheme limit, in rupees', () => {
    const result = evaluate002({ ...BASE, requestedLoanAmount: 250001, existingLoan: false });
    expect(result.status).toBe('not_eligible');
    expect(result.failedRules[0].expected).toBe('250000');
  });

  it('accepts the exact amount boundary', () => {
    const result = evaluate002({ ...BASE, requestedLoanAmount: 250000, existingLoan: false });
    expect(result.status).toBe('eligible');
  });

  it('excludes optional rules from the form scoping', () => {
    // Every rule in this fixture is required, so the form asks for all of them.
    expect(collectRequiredFields(DEMO_002)).toEqual([
      'existingLoan',
      'loanPurpose',
      'requestedLoanAmount',
      'state',
    ]);
  });
});
