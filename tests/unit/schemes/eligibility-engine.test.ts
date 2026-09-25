import { describe, it, expect } from 'vitest';
import {
  evaluateEligibility,
  collectRequiredFields,
} from '@/features/schemes/eligibility/eligibility-engine';
import { reduceAnd, reduceOr } from '@/features/schemes/eligibility/tri-state';
import type { SchemeApplicant } from '@/features/schemes/eligibility/field-registry';
import type { RuleGroupOperator, RuleOperator, SchemeRule } from '@/features/schemes/types';

/**
 * Group combination and the overall verdict.
 *
 * The semantics under test, in one place:
 *   - a missing field is UNKNOWN, never FAIL
 *   - rules inside a group combine with that group's operator
 *   - groups are alternatives (OR), so a satisfied route settles the scheme
 *   - eligible / potentially_eligible / not_eligible follow from that
 */

function rule(
  partial: Partial<SchemeRule> &
    Pick<SchemeRule, 'field' | 'operator' | 'value'>
): SchemeRule {
  return {
    id: partial.id ?? `${partial.field}-${partial.operator}`,
    schemeId: 'scheme-1',
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

function evaluate(rules: SchemeRule[], applicant: SchemeApplicant = {}) {
  return evaluateEligibility('scheme-1', rules, applicant);
}

// ─── three-valued reduction ──────────────────────────────────────────────────

describe('Kleene reduction', () => {
  it('AND: any fail wins, else any unknown, else pass', () => {
    expect(reduceAnd([])).toBe('pass');
    expect(reduceAnd(['pass', 'pass'])).toBe('pass');
    expect(reduceAnd(['pass', 'unknown'])).toBe('unknown');
    expect(reduceAnd(['pass', 'fail'])).toBe('fail');
    expect(reduceAnd(['unknown', 'fail'])).toBe('fail');
  });

  it('OR: any pass wins, else any unknown, else fail', () => {
    expect(reduceOr([])).toBe('fail');
    expect(reduceOr(['fail', 'fail'])).toBe('fail');
    expect(reduceOr(['pass', 'fail'])).toBe('pass');
    expect(reduceOr(['unknown', 'fail'])).toBe('unknown');
    expect(reduceOr(['unknown', 'pass'])).toBe('pass');
  });
});

// ─── AND groups ──────────────────────────────────────────────────────────────

describe('AND group', () => {
  const group: SchemeRule[] = [
    rule({ field: 'age', operator: '>=', value: 18, id: 'age' }),
    rule({ field: 'annualIncome', operator: '<=', value: 500000, id: 'income' }),
  ];

  it('passes when every rule passes', () => {
    const result = evaluate(group, { age: 23, annualIncome: 300000 });
    expect(result.status).toBe('eligible');
    expect(result.groupResults[0].outcome).toBe('pass');
    expect(result.failedRules).toHaveLength(0);
  });

  it('fails when one rule fails', () => {
    const result = evaluate(group, { age: 23, annualIncome: 700000 });
    expect(result.status).toBe('not_eligible');
    expect(result.groupResults[0].outcome).toBe('fail');
    expect(result.failedRules.map((r) => r.ruleId)).toEqual(['income']);
  });

  it('is unknown when a rule is unknown and none failed', () => {
    const result = evaluate(group, { age: 23 });
    expect(result.status).toBe('potentially_eligible');
    expect(result.groupResults[0].outcome).toBe('unknown');
    expect(result.missingInformation).toEqual(['annualIncome']);
  });

  it('a failed rule takes precedence over an unknown one', () => {
    // AND: we know enough to reject, so do not ask for more.
    const result = evaluate(group, { annualIncome: 700000 });
    expect(result.status).toBe('not_eligible');
    expect(result.missingInformation).toEqual([]);
  });
});

// ─── OR groups ───────────────────────────────────────────────────────────────

describe('OR group', () => {
  const group: SchemeRule[] = [
    rule({ field: 'existingLoan', operator: '=', value: false, id: 'no-loan', groupOperator: 'OR' }),
    rule({ field: 'state', operator: 'IN', value: ['Karnataka'], id: 'state', groupOperator: 'OR' }),
  ];

  it('passes when the first branch passes', () => {
    const result = evaluate(group, { existingLoan: false });
    expect(result.status).toBe('eligible');
    expect(result.groupResults[0].outcome).toBe('pass');
  });

  it('passes when only the second branch passes', () => {
    const result = evaluate(group, { state: 'Karnataka' });
    expect(result.status).toBe('eligible');
  });

  it('fails when every branch fails', () => {
    const result = evaluate(group, { existingLoan: true, state: 'Goa' });
    expect(result.status).toBe('not_eligible');
    expect(result.failedRules).toHaveLength(2);
  });

  it('is unknown when one branch is unknown and none passed', () => {
    const result = evaluate(group, { existingLoan: true });
    expect(result.status).toBe('potentially_eligible');
    expect(result.missingInformation).toEqual(['state']);
  });

  it('a satisfied OR branch cancels a missing sibling from missingInformation', () => {
    // This is the case the specification warned about. Once one branch of an OR
    // passes, the alternative route answered the question, so the user must not
    // be asked for the sibling field.
    const result = evaluate(group, { existingLoan: false });
    expect(result.status).toBe('eligible');
    expect(result.missingInformation).toEqual([]);
    expect(result.unknownRules.map((r) => r.ruleId)).toEqual(['state']);
  });
});

// ─── multiple groups ─────────────────────────────────────────────────────────

describe('multiple groups are all mandatory', () => {
  const groups: SchemeRule[] = [
    rule({ id: 'g1a', ruleGroup: 1, groupOperator: 'AND', field: 'age', operator: '>=', value: 18 }),
    rule({ id: 'g1b', ruleGroup: 1, groupOperator: 'AND', field: 'occupation', operator: '=', value: 'farmer' }),
    rule({ id: 'g2a', ruleGroup: 2, groupOperator: 'AND', field: 'state', operator: '=', value: 'Karnataka' }),
    rule({ id: 'g2b', ruleGroup: 2, groupOperator: 'AND', field: 'applicantCategory', operator: '=', value: 'sc' }),
  ];

  it('groups correctly and evaluates each in order', () => {
    const result = evaluate(groups, { age: 30, occupation: 'farmer', state: 'Karnataka', applicantCategory: 'sc' });
    expect(result.groupResults).toHaveLength(2);
    expect(result.groupResults.map((g) => g.ruleGroup)).toEqual([1, 2]);
    expect(result.status).toBe('eligible');
  });

  it('a failing group is NOT cancelled by a passing sibling group', () => {
    // Groups are AND-combined. Under OR-combination a failing group would be
    // routinely masked, and a hard limit could be bypassed.
    const result = evaluate(groups, { age: 10, occupation: 'farmer', state: 'Karnataka', applicantCategory: 'sc' });
    expect(result.groupResults[0].outcome).toBe('fail');
    expect(result.groupResults[1].outcome).toBe('pass');
    expect(result.status).toBe('not_eligible');
  });

  it('is not eligible when every group fails', () => {
    const result = evaluate(groups, { age: 10, occupation: 'teacher', state: 'Goa', applicantCategory: 'general' });
    expect(result.groupResults.every((g) => g.outcome === 'fail')).toBe(true);
    expect(result.status).toBe('not_eligible');
  });

  it('is potentially eligible when one group passes and another is unknown', () => {
    const result = evaluate(groups, { age: 30, occupation: 'farmer', state: 'Karnataka' });
    expect(result.groupResults[0].outcome).toBe('pass');
    expect(result.groupResults[1].outcome).toBe('unknown');
    expect(result.status).toBe('potentially_eligible');
    expect(result.missingInformation).toEqual(['applicantCategory']);
  });

  it('does not request fields belonging to a group that already failed', () => {
    // age 10 fails group 1 outright, so asking for the still-missing occupation
    // is pointless: the group is settled.
    const result = evaluate(groups, { age: 10, state: 'Karnataka', applicantCategory: 'sc' });
    expect(result.groupResults[0].outcome).toBe('fail');
    expect(result.status).toBe('not_eligible');
    expect(result.missingInformation).toEqual([]);
  });

  it('treats an all-missing group as unknown, not failed', () => {
    // Both group-1 rules absent is UNKNOWN, not FAIL. Missing information must
    // never be mistaken for a rejection.
    const result = evaluate(groups, { state: 'Karnataka', applicantCategory: 'sc' });
    expect(result.groupResults[0].outcome).toBe('unknown');
    expect(result.status).toBe('potentially_eligible');
    expect(result.missingInformation).toEqual(['age', 'occupation']);
  });

  it('orders rules deterministically regardless of input order', () => {
    const shuffled = [groups[3], groups[1], groups[2], groups[0]];
    const a = evaluate(groups, { age: 30, occupation: 'farmer', state: 'Karnataka', applicantCategory: 'sc' });
    const b = evaluate(shuffled, { age: 30, occupation: 'farmer', state: 'Karnataka', applicantCategory: 'sc' });
    expect(b.status).toBe(a.status);
    expect(b.groupResults.map((g) => g.ruleIds)).toEqual(a.groupResults.map((g) => g.ruleIds));
  });
});

// ─── overall status ──────────────────────────────────────────────────────────

describe('overall status', () => {
  it('eligible when a required rule passes', () => {
    const result = evaluate([rule({ field: 'age', operator: '>=', value: 18 })], { age: 30 });
    expect(result.status).toBe('eligible');
    expect(result.passedRules).toHaveLength(1);
  });

  it('potentially eligible when required information is missing', () => {
    const result = evaluate([rule({ field: 'age', operator: '>=', value: 18 })], {});
    expect(result.status).toBe('potentially_eligible');
    expect(result.unknownRules).toHaveLength(1);
    expect(result.missingInformation).toEqual(['age']);
  });

  it('not eligible when a required rule fails', () => {
    const result = evaluate([rule({ field: 'age', operator: '>=', value: 18 })], { age: 12 });
    expect(result.status).toBe('not_eligible');
  });

  it('a scheme with no evaluable rules cannot be called eligible', () => {
    // Claiming "eligible" with nothing to show for it is a false positive, and
    // the worst kind of error for a financial-safety tool. Zero rules is almost
    // always an authoring gap.
    const result = evaluate([], {});
    expect(result.status).toBe('potentially_eligible');
    expect(result.groupResults).toEqual([]);
    expect(result.missingInformation).toEqual([]);
  });

  it('is deterministic across repeated runs', () => {
    const rules = [rule({ field: 'age', operator: '>=', value: 18 })];
    const applicant = { age: 17 };
    const first = JSON.stringify(evaluate(rules, applicant));
    for (let i = 0; i < 5; i++) {
      expect(JSON.stringify(evaluate(rules, applicant))).toBe(first);
    }
  });
});

// ─── missing values by type ─────────────────────────────────────────────────

describe('missing values by declared type', () => {
  // Each case pairs an operator with a value of the type the field declares, and
  // supplies nothing for the applicant.
  const cases: Array<[string, SchemeRule['field'], RuleOperator, SchemeRule['value']]> = [
    ['numeric', 'age', '>=', 18],
    ['string', 'occupation', '=', 'farmer'],
    ['boolean', 'existingLoan', '=', false],
  ];

  for (const [label, field, operator, value] of cases) {
    it(`a missing ${label} field is unknown, never fail`, () => {
      const result = evaluate([rule({ field, operator, value })], {});
      expect(result.status).toBe('potentially_eligible');
      expect(result.failedRules).toHaveLength(0);
      expect(result.unknownRules).toHaveLength(1);
    });
  }

  it('treats an explicit null the same as absent', () => {
    const result = evaluate([rule({ field: 'age', operator: '>=', value: 18 })], {
      age: null as unknown as number,
    });
    expect(result.status).toBe('potentially_eligible');
    expect(result.unknownRules[0].reason).toBe('missing_value');
  });

  it('treats NOT_IN over a missing value as unknown, not as a pass', () => {
    const result = evaluate(
      [rule({ field: 'applicantCategory', operator: 'NOT_IN', value: ['unverified'] })],
      {}
    );
    expect(result.status).toBe('potentially_eligible');
    expect(result.passedRules).toHaveLength(0);
  });
});

// ─── security ────────────────────────────────────────────────────────────────

describe('security: untrusted rule data', () => {
  const dangerous = ['__proto__', 'constructor', 'prototype', 'is_admin', 'role', 'toString'];

  for (const field of dangerous) {
    it(`refuses a rule referencing "${field}"`, () => {
      const result = evaluate([
        rule({ field: 'age', operator: '>=', value: 18 }),
        { ...rule({ field: 'age', operator: '>=', value: 18 }), id: 'bad', field } as unknown as SchemeRule,
      ]);

      expect(result.invalidRules).toHaveLength(1);
      expect(result.invalidRules[0].reason).toBe('unknown_field');
      expect(result.invalidRules[0].field).toBe(field);
    });
  }

  it('does not let an invalid rule influence the verdict', () => {
    const result = evaluate([
      { ...rule({ field: 'age', operator: '>=', value: 18 }), id: 'bad', field: '__proto__' } as unknown as SchemeRule,
    ], { age: 30 });

    // The invalid rule is reported, not silently dropped, and cannot manufacture
    // a pass. With nothing evaluable left, the verdict is "cannot confirm".
    expect(result.invalidRules).toHaveLength(1);
    expect(result.passedRules).toHaveLength(0);
    expect(result.status).toBe('potentially_eligible');
  });

  it('refuses an unknown operator', () => {
    const result = evaluate([
      { ...rule({ field: 'age', operator: '>=', value: 18 }), id: 'bad', operator: 'MATCH' } as unknown as SchemeRule,
    ]);
    expect(result.invalidRules[0].reason).toBe('unknown_operator');
  });

  it('never reads prototype properties from the applicant', () => {
    const polluted = Object.create({ age: 99 });
    polluted.occupation = 'farmer';

    const result = evaluate([rule({ field: 'age', operator: '>=', value: 18 })], polluted);
    // age is inherited, so it must be treated as absent, not as 99.
    expect(result.status).toBe('potentially_eligible');
    expect(result.missingInformation).toEqual(['age']);
  });

  it('survives an applicant carrying hostile extra keys', () => {
    const hostile = { age: 30, is_admin: true, role: 'admin' } as SchemeApplicant;
    const result = evaluate([rule({ field: 'age', operator: '>=', value: 18 })], hostile);
    expect(result.status).toBe('eligible');
  });
});

// ─── money ───────────────────────────────────────────────────────────────────

describe('monetary values are rupees', () => {
  it('treats 500000 as five lakh rupees, not five lakh paise', () => {
    const rules = [rule({ field: 'annualIncome', operator: '<=', value: 500000 })];

    expect(evaluate(rules, { annualIncome: 500000 }).status).toBe('eligible');
    expect(evaluate(rules, { annualIncome: 500001 }).status).toBe('not_eligible');
  });

  it('applies the inclusive boundary exactly', () => {
    const rules = [rule({ field: 'requestedLoanAmount', operator: '<=', value: 250000 })];
    expect(evaluate(rules, { requestedLoanAmount: 250000 }).status).toBe('eligible');
    expect(evaluate(rules, { requestedLoanAmount: 250001 }).status).toBe('not_eligible');
  });

  it('does not silently scale a rupee amount', () => {
    // If a paise conversion leaked in, 300000 rupees would be read as
    // 30000000 paise and rejected against a 5 lakh limit. It must pass.
    const result = evaluate([rule({ field: 'annualIncome', operator: '<=', value: 500000 })], {
      annualIncome: 300000,
    });
    expect(result.status).toBe('eligible');
    expect(result.passedRules[0].actual).toBe('300000');
  });

  it('carries the rupee amount through to the explanation unchanged', () => {
    const result = evaluate([rule({ field: 'annualIncome', operator: '<=', value: 500000 })], {
      annualIncome: 300000,
    });
    expect(result.passedRules[0].expected).toBe('500000');
    expect(result.passedRules[0].actual).toBe('300000');
  });
});

// ─── form scoping helper ─────────────────────────────────────────────────────

describe('collectRequiredFields', () => {
  it('lists only the fields the rules actually consult', () => {
    const rules = [
      rule({ field: 'age', operator: '>=', value: 18 }),
      rule({ field: 'occupation', operator: '=', value: 'farmer' }),
      rule({ field: 'gender', operator: '=', value: 'female', required: false }),
    ];
    expect(collectRequiredFields(rules)).toEqual(['age', 'occupation']);
  });

  it('ignores rules naming a field outside the registry', () => {
    const rules = [
      { ...rule({ field: 'age', operator: '>=', value: 18 }), field: 'is_admin' } as unknown as SchemeRule,
    ];
    expect(collectRequiredFields(rules)).toEqual([]);
  });

  it('deduplicates and sorts', () => {
    const rules = [
      rule({ field: 'state', operator: '=', value: 'Karnataka' }),
      rule({ field: 'age', operator: '>=', value: 18 }),
      rule({ field: 'age', operator: '<=', value: 60 }),
    ];
    expect(collectRequiredFields(rules)).toEqual(['age', 'state']);
  });
});

// ─── group operator plumbing ─────────────────────────────────────────────────

describe('group operator is honoured', () => {
  it('an AND group and an OR group over the same rules differ', () => {
    const asAnd: RuleGroupOperator = 'AND';
    const asOr: RuleGroupOperator = 'OR';
    const applicant: SchemeApplicant = { age: 30, annualIncome: 900000 };

    const andResult = evaluate([
      rule({ field: 'age', operator: '>=', value: 18, groupOperator: asAnd }),
      rule({ field: 'annualIncome', operator: '<=', value: 500000, groupOperator: asAnd }),
    ], applicant);
    expect(andResult.status).toBe('not_eligible');

    const orResult = evaluate([
      rule({ field: 'age', operator: '>=', value: 18, groupOperator: asOr }),
      rule({ field: 'annualIncome', operator: '<=', value: 500000, groupOperator: asOr }),
    ], applicant);
    expect(orResult.status).toBe('eligible');
  });

  it('is exposed on the result for explanation', () => {
    const result = evaluate([
      rule({ field: 'age', operator: '>=', value: 18, groupOperator: 'OR' }),
    ], { age: 30 });
    expect(result.groupResults[0].groupOperator).toBe('OR');
    expect(result.groupResults[0].ruleIds).toHaveLength(1);
  });
});
