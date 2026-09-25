import { describe, it, expect } from 'vitest';
import {
  runEligibilityCheck,
  type SchemeForEvaluation,
} from '@/features/schemes/eligibility/check-eligibility-service';
import type { RuleOperator, SchemeRule, SchemeStatus } from '@/features/schemes/types';

/**
 * Orchestration between the data layer and the engine.
 *
 * Pure, so no database and no network. What matters here is the guard rails:
 * unpublished schemes never surface, counts are honest, and the disclaimer
 * always travels with the result.
 */

function rule(
  id: string,
  field: SchemeRule['field'],
  operator: RuleOperator,
  value: SchemeRule['value'],
  required = true
): SchemeRule {
  return {
    id,
    schemeId: 'scheme',
    ruleGroup: 1,
    groupOperator: 'AND',
    ruleType: 'eligibility',
    field,
    operator,
    value,
    required,
    descriptionEn: null,
    descriptionKn: null,
    priority: 0,
    createdAt: '2026-09-26T00:00:00.000Z',
  };
}

function scheme(
  id: string,
  status: SchemeStatus,
  rules: SchemeRule[] = [],
  ruleProblems: string[] = []
): SchemeForEvaluation {
  return {
    id,
    nameEn: `${id} (EN)`,
    nameKn: `${id} (KN)`,
    status,
    lastVerified: '2026-09-26',
    rules,
    ruleProblems,
  };
}

describe('runEligibilityCheck', () => {
  it('returns a verdict per active scheme', () => {
    const outcome = runEligibilityCheck(
      [
        scheme('s1', 'active', [rule('r1', 'age', '>=', 18)]),
        scheme('s2', 'active', [rule('r2', 'occupation', '=', 'farmer')]),
      ],
      { age: 30, occupation: 'farmer' }
    );

    expect(outcome.results).toHaveLength(2);
    expect(outcome.results.every((r) => r.eligibility.status === 'eligible')).toBe(true);
  });

  it('includes the scheme identity and its verification date', () => {
    const outcome = runEligibilityCheck(
      [scheme('s1', 'active', [rule('r1', 'age', '>=', 18)])],
      { age: 30 }
    );

    const first = outcome.results[0];
    expect(first.scheme.id).toBe('s1');
    expect(first.scheme.nameEn).toBe('s1 (EN)');
    expect(first.scheme.nameKn).toBe('s1 (KN)');
    expect(first.scheme.lastVerified).toBe('2026-09-26');
  });

  it('evaluates a single scheme without loading the rest', () => {
    const outcome = runEligibilityCheck(
      [scheme('only', 'active', [rule('r1', 'age', '>=', 18)])],
      { age: 30 }
    );
    expect(outcome.results.map((r) => r.scheme.id)).toEqual(['only']);
  });

  describe('unpublished schemes never surface', () => {
    it('skips draft, inactive and expired schemes', () => {
      const statuses: SchemeStatus[] = ['draft', 'inactive', 'expired'];
      const outcome = runEligibilityCheck(
        statuses.map((status, i) => scheme(`s${i}`, status, [rule('r', 'age', '>=', 18)])),
        { age: 30 }
      );

      // Not evaluated, not reported, and not counted. Confirming that a draft
      // scheme exists would leak unpublished work.
      expect(outcome.results).toHaveLength(0);
      expect(outcome.summary.schemeCount).toBe(0);
    });

    it('still counts their rules as loaded, without evaluating them', () => {
      const outcome = runEligibilityCheck([scheme('draft', 'draft', [rule('r', 'age', '>=', 18)])], {
        age: 30,
      });
      expect(outcome.summary.ruleCount).toBe(1);
      expect(outcome.summary.byStatus).toEqual({
        eligible: 0,
        potentially_eligible: 0,
        not_eligible: 0,
      });
    });
  });

  describe('summary', () => {
    it('counts outcomes by status', () => {
      const outcome = runEligibilityCheck(
        [
          scheme('pass', 'active', [rule('a', 'age', '>=', 18)]),
          scheme('missing', 'active', [rule('b', 'occupation', '=', 'farmer')]),
          scheme('fail', 'active', [rule('c', 'age', '>=', 65)]),
        ],
        { age: 30 }
      );

      expect(outcome.summary.schemeCount).toBe(3);
      expect(outcome.summary.byStatus).toEqual({
        eligible: 1,
        potentially_eligible: 1,
        not_eligible: 1,
      });
    });

    it('reports rules that could not be mapped, without blocking', () => {
      const outcome = runEligibilityCheck(
        [scheme('s1', 'active', [rule('r1', 'age', '>=', 18)], ['r2: unknown field "is_admin"'])],
        { age: 30 }
      );

      expect(outcome.summary.problemRuleCount).toBe(1);
      // The verdict is still produced.
      expect(outcome.results).toHaveLength(1);
    });

    it('is zeroed for an empty catalogue', () => {
      const outcome = runEligibilityCheck([], {});
      expect(outcome.results).toEqual([]);
      expect(outcome.summary).toEqual({
        schemeCount: 0,
        ruleCount: 0,
        problemRuleCount: 0,
        byStatus: { eligible: 0, potentially_eligible: 0, not_eligible: 0 },
      });
    });
  });

  describe('requiredFields drives the dynamic form', () => {
    it('lists only the fields the scheme actually needs', () => {
      const outcome = runEligibilityCheck(
        [scheme('s1', 'active', [rule('a', 'age', '>=', 18), rule('b', 'occupation', '=', 'farmer')])],
        {}
      );

      expect(outcome.results[0].requiredFields).toEqual(['age', 'occupation']);
    });

    it('omits optional rules', () => {
      const outcome = runEligibilityCheck(
        [scheme('s1', 'active', [rule('a', 'age', '>=', 18), rule('b', 'gender', '=', 'female', false)])],
        {}
      );

      expect(outcome.results[0].requiredFields).toEqual(['age']);
    });

    it('asks for nothing from a scheme with no rules', () => {
      const outcome = runEligibilityCheck([scheme('s1', 'active', [])], {});
      expect(outcome.results[0].requiredFields).toEqual([]);
    });
  });

  describe('disclaimer', () => {
    it('always travels with the response so a client cannot omit it', () => {
      const outcome = runEligibilityCheck([], {});

      expect(outcome.disclaimer.en.length).toBeGreaterThan(20);
      expect(outcome.disclaimer.kn).toMatch(/[\u0C80-\u0CFF]/);
      expect(outcome.disclaimer.kn).not.toBe(outcome.disclaimer.en);
    });

    it('never promises approval', () => {
      const outcome = runEligibilityCheck([], {});
      expect(outcome.disclaimer.en.toLowerCase()).not.toMatch(
        /\b(guaranteed|you will be approved|definitely eligible)\b/
      );
    });
  });

  it('is deterministic for the same inputs', () => {
    const schemes = [
      scheme('a', 'active', [rule('r1', 'age', '>=', 18), rule('r2', 'annualIncome', '<=', 500000)]),
      scheme('b', 'active', [rule('r3', 'occupation', 'IN', ['farmer', 'student'])]),
    ];
    const applicant = { age: 30, annualIncome: 300000, occupation: 'farmer' };

    const first = JSON.stringify(runEligibilityCheck(schemes, applicant));
    for (let i = 0; i < 5; i++) {
      expect(JSON.stringify(runEligibilityCheck(schemes, applicant))).toBe(first);
    }
  });

  it('does not mutate the schemes it is given', () => {
    const schemes = [scheme('s1', 'active', [rule('r1', 'age', '>=', 18)])];
    const snapshot = JSON.stringify(schemes);
    runEligibilityCheck(schemes, { age: 30 });
    expect(JSON.stringify(schemes)).toBe(snapshot);
  });
});
