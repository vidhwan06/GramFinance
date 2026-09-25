import { describe, it, expect } from 'vitest';
import { evaluateRule, formatRuleValue, isKnownRuleOperator } from '@/features/schemes/eligibility/rule-evaluator';
import type { SchemeApplicant } from '@/features/schemes/eligibility/field-registry';
import type { RuleOperator, SchemeRule } from '@/features/schemes/types';

/**
 * Single-rule evaluation.
 *
 * The contract under test: a missing value is UNKNOWN, never FAIL. Everything
 * else in this file exists to make sure that distinction survives contact with
 * all nine operators.
 */

let seq = 0;
function rule(partial: Partial<SchemeRule> & Pick<SchemeRule, 'field' | 'operator' | 'value'>): SchemeRule {
  seq += 1;
  return {
    id: `r${seq}`,
    schemeId: 'scheme-1',
    ruleGroup: 1,
    groupOperator: 'AND',
    ruleType: 'eligibility',
    required: true,
    descriptionEn: null,
    descriptionKn: null,
    priority: seq,
    createdAt: '2026-09-26T00:00:00.000Z',
    ...partial,
  };
}

function evaluate(r: SchemeRule, applicant: SchemeApplicant) {
  const result = evaluateRule(r, applicant);
  if (result.kind !== 'evaluated') {
    throw new Error(`expected an evaluation, got invalid: ${result.report.reason}`);
  }
  return result.evaluation;
}

describe('operator = and !=', () => {
  it('matches an identical number', () => {
    expect(evaluate(rule({ field: 'age', operator: '=', value: 18 }), { age: 18 }).outcome).toBe('pass');
    expect(evaluate(rule({ field: 'age', operator: '=', value: 18 }), { age: 19 }).outcome).toBe('fail');
  });

  it('matches an identical string, case-sensitively', () => {
    expect(
      evaluate(rule({ field: 'loanPurpose', operator: '=', value: 'agriculture' }), {
        loanPurpose: 'agriculture',
      }).outcome
    ).toBe('pass');
    // Determinism beats convenience: no case folding, so the same input always
    // produces the same verdict.
    expect(
      evaluate(rule({ field: 'loanPurpose', operator: '=', value: 'agriculture' }), {
        loanPurpose: 'Agriculture',
      }).outcome
    ).toBe('fail');
  });

  it('matches a boolean exactly', () => {
    const r = rule({ field: 'existingLoan', operator: '=', value: false });
    expect(evaluate(r, { existingLoan: false }).outcome).toBe('pass');
    expect(evaluate(r, { existingLoan: true }).outcome).toBe('fail');
  });

  it('does not coerce across types', () => {
    // "18" is not 18.
    expect(
      evaluate(rule({ field: 'age', operator: '=', value: 18 }), { age: '18' as unknown as number })
        .outcome
    ).toBe('unknown');
    expect(evaluate(rule({ field: 'age', operator: '=', value: 18 }), {}).outcome).toBe('unknown');
  });

  it('negates with !=', () => {
    const r = rule({ field: 'state', operator: '!=', value: 'Goa' });
    expect(evaluate(r, { state: 'Karnataka' }).outcome).toBe('pass');
    expect(evaluate(r, { state: 'Goa' }).outcome).toBe('fail');
    // A missing value must NOT be reported as "not equal", i.e. a pass.
    expect(evaluate(r, {}).outcome).toBe('unknown');
  });
});

describe('ordering operators > >= < <=', () => {
  const cases: Array<[RuleOperator, number, number, 'pass' | 'fail']> = [
    ['>', 20, 18, 'pass'],
    ['>', 18, 18, 'fail'],
    ['>=', 18, 18, 'pass'],
    ['>=', 17, 18, 'fail'],
    ['<', 17, 18, 'pass'],
    ['<', 18, 18, 'fail'],
    ['<=', 18, 18, 'pass'],
    ['<=', 19, 18, 'fail'],
  ];

  for (const [operator, actual, expected, outcome] of cases) {
    it(`${actual} ${operator} ${expected} is ${outcome}`, () => {
      expect(
        evaluate(rule({ field: 'age', operator, value: expected }), { age: actual }).outcome
      ).toBe(outcome);
    });
  }

  it('refuses to order strings, rather than relying on JS coercion', () => {
    // '9' > '10' is TRUE in JavaScript. That trap is exactly why ordering is
    // numeric-only here.
    expect(
      evaluate(rule({ field: 'age', operator: '>', value: 10 }), {
        age: '9' as unknown as number,
      }).outcome
    ).toBe('unknown');
  });

  it('treats NaN and Infinity as undecidable', () => {
    for (const bad of [NaN, Infinity, -Infinity]) {
      expect(
        evaluate(rule({ field: 'annualIncome', operator: '<=', value: 500000 }), {
          annualIncome: bad,
        }).outcome
      ).toBe('unknown');
    }
  });
});

describe('IN and NOT_IN', () => {
  it('passes when the value is a member', () => {
    const r = rule({ field: 'occupation', operator: 'IN', value: ['student', 'farmer'] });
    expect(evaluate(r, { occupation: 'farmer' }).outcome).toBe('pass');
    expect(evaluate(r, { occupation: 'student' }).outcome).toBe('pass');
    expect(evaluate(r, { occupation: 'teacher' }).outcome).toBe('fail');
  });

  it('passes NOT_IN when the value is absent from the list', () => {
    const r = rule({ field: 'applicantCategory', operator: 'NOT_IN', value: ['unverified'] });
    expect(evaluate(r, { applicantCategory: 'general' }).outcome).toBe('pass');
    expect(evaluate(r, { applicantCategory: 'unverified' }).outcome).toBe('fail');
  });

  it('does NOT treat a missing value as "not in the list"', () => {
    // The classic bug: NOT_IN over an absent value resolves to true and quietly
    // passes a rule the user never actually satisfied.
    const r = rule({ field: 'applicantCategory', operator: 'NOT_IN', value: ['unverified'] });
    const result = evaluate(r, {});
    expect(result.outcome).toBe('unknown');
    expect(result.reason).toBe('missing_value');
  });

  it('does not treat a missing value as "in the list"', () => {
    const r = rule({ field: 'occupation', operator: 'IN', value: ['student'] });
    expect(evaluate(r, {}).outcome).toBe('unknown');
  });

  it('compares numbers in a list numerically', () => {
    const r = rule({ field: 'age', operator: 'IN', value: [18, 21] });
    expect(evaluate(r, { age: 21 }).outcome).toBe('pass');
    expect(evaluate(r, { age: 20 }).outcome).toBe('fail');
  });
});

describe('CONTAINS', () => {
  it('matches a substring for text', () => {
    const r = rule({ field: 'occupation', operator: 'CONTAINS', value: 'farm' });
    expect(evaluate(r, { occupation: 'small farmer' }).outcome).toBe('pass');
    expect(evaluate(r, { occupation: 'teacher' }).outcome).toBe('fail');
  });

  it('is undecidable when there is no sensible containment', () => {
    // CONTAINS with a SCALAR rule value means substring for text. A number
    // field with a string needle has no containment relation, so it must be
    // UNKNOWN rather than a guess.
    const r = rule({ field: 'annualIncome', operator: 'CONTAINS', value: 'farm' });
    expect(evaluate(r, { annualIncome: 300000 }).outcome).toBe('unknown');
  });

  it('also supports an array rule value as list membership', () => {
    // The second shape allowed by migration 012. No registry field is an array
    // today, so this cannot arise from real applicant input yet.
    const r = rule({ field: 'occupation', operator: 'CONTAINS', value: ['farmer'] });
    expect(evaluate(r, { occupation: 'farmer' }).outcome).toBe('pass');
    expect(evaluate(r, { occupation: 'teacher' }).outcome).toBe('fail');
  });

  it('compares a scalar needle for equality when neither side is text', () => {
    const r = rule({ field: 'age', operator: 'CONTAINS', value: 18 });
    expect(evaluate(r, { age: 18 }).outcome).toBe('pass');
    expect(evaluate(r, { age: 19 }).outcome).toBe('fail');
  });

  it('is undecidable when the text field holds a number', () => {
    const r = rule({ field: 'occupation', operator: 'CONTAINS', value: 'farm' });
    expect(evaluate(r, { occupation: 42 as unknown as string }).outcome).toBe('unknown');
  });

  it('treats a missing value as unknown', () => {
    const r = rule({ field: 'occupation', operator: 'CONTAINS', value: 'farm' });
    expect(evaluate(r, {}).outcome).toBe('unknown');
  });
});

describe('all nine operators are recognised, and nothing else is', () => {
  const approved: RuleOperator[] = ['=', '!=', '>', '>=', '<', '<=', 'IN', 'NOT_IN', 'CONTAINS'];

  it('accepts exactly the V1 set', () => {
    for (const operator of approved) {
      expect(isKnownRuleOperator(operator)).toBe(true);
    }
    expect(approved).toHaveLength(9);
  });

  it('rejects anything outside it, including code-like input', () => {
    for (const bad of ['LIKE', 'MATCH', '&&', 'process.exit()', '', null, 42, {}, '==']) {
      expect(isKnownRuleOperator(bad)).toBe(false);
    }
  });
});

describe('value/operator shape validation', () => {
  it('rejects an array operator given a scalar', () => {
    const result = evaluateRule(rule({ field: 'occupation', operator: 'IN', value: 'farmer' }), {
      occupation: 'farmer',
    });
    expect(result.kind).toBe('invalid');
    if (result.kind === 'invalid') {
      expect(result.report.reason).toBe('value_shape_mismatch');
    }
  });

  it('rejects a scalar operator given an array', () => {
    const result = evaluateRule(rule({ field: 'age', operator: '=', value: [18] }), { age: 18 });
    expect(result.kind).toBe('invalid');
    if (result.kind === 'invalid') {
      expect(result.report.reason).toBe('value_shape_mismatch');
    }
  });
});

describe('rule formatting for display', () => {
  it('joins array values instead of stringifying them', () => {
    expect(formatRuleValue(['student', 'farmer'])).toBe('student, farmer');
    expect(formatRuleValue(500000)).toBe('500000');
    expect(formatRuleValue(false)).toBe('false');
    expect(formatRuleValue(null)).toBe('null');
  });

  it('renders the applicant value, or null when absent', () => {
    expect(evaluate(rule({ field: 'age', operator: '>=', value: 18 }), { age: 23 }).actual).toBe('23');
    expect(evaluate(rule({ field: 'age', operator: '>=', value: 18 }), {}).actual).toBeNull();
  });
});
