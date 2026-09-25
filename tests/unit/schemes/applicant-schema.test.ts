import { describe, it, expect } from 'vitest';
import {
  applicantSchema,
  eligibilityRequestSchema,
  formatValidationIssues,
  AGE_MAX,
  MAX_ANNUAL_INCOME_RUPEES,
  MAX_REQUESTED_LOAN_RUPEES,
  MAX_TEXT_LENGTH,
} from '@/features/schemes/eligibility/applicant-schema';
import { SCHEME_FIELD_NAMES } from '@/features/schemes/eligibility/field-registry';

/**
 * The request boundary.
 *
 * The schema is the only thing standing between untrusted JSON and the
 * eligibility engine, so these tests care about two things: it accepts every
 * legitimate registry field, and it refuses everything else.
 */

const VALID_UUID = '3f2504e0-4f89-11d3-9a0c-0305e82c3301';

describe('applicantSchema', () => {
  it('exposes exactly the registry fields, derived not duplicated', () => {
    const shapeKeys = Object.keys(applicantSchema.shape).sort();
    expect(shapeKeys).toEqual([...SCHEME_FIELD_NAMES].sort());
  });

  it('accepts an empty applicant', () => {
    // "We do not know yet" must survive the boundary, not be rejected.
    expect(applicantSchema.safeParse({}).success).toBe(true);
  });

  it('accepts every registry field at a sensible value', () => {
    const result = applicantSchema.safeParse({
      age: 30,
      annualIncome: 300000,
      occupation: 'farmer',
      state: 'Karnataka',
      district: 'Mysuru',
      gender: 'female',
      applicantCategory: 'sc',
      loanPurpose: 'agriculture',
      requestedLoanAmount: 200000,
      employmentType: 'self-employed',
      existingLoan: false,
    });
    expect(result.success).toBe(true);
  });

  it('rejects unknown keys, including dangerous ones', () => {
    for (const key of ['__proto__', 'constructor', 'prototype', 'is_admin', 'role', 'toString']) {
      const result = applicantSchema.safeParse({ age: 30, [key]: 'x' });
      expect(result.success, `${key} must be rejected`).toBe(false);
    }
  });

  describe('age', () => {
    it('accepts the inclusive bounds', () => {
      expect(applicantSchema.safeParse({ age: 0 }).success).toBe(true);
      expect(applicantSchema.safeParse({ age: AGE_MAX }).success).toBe(true);
    });

    it('rejects out-of-range and fractional ages', () => {
      for (const age of [-1, AGE_MAX + 1, 18.5]) {
        expect(applicantSchema.safeParse({ age }).success, `age ${age}`).toBe(false);
      }
    });
  });

  describe('monetary fields', () => {
    it('accepts zero and the cap', () => {
      expect(applicantSchema.safeParse({ annualIncome: 0 }).success).toBe(true);
      expect(
        applicantSchema.safeParse({ annualIncome: MAX_ANNUAL_INCOME_RUPEES }).success
      ).toBe(true);
      expect(
        applicantSchema.safeParse({ requestedLoanAmount: MAX_REQUESTED_LOAN_RUPEES }).success
      ).toBe(true);
    });

    it('rejects negatives and absurd values', () => {
      expect(applicantSchema.safeParse({ annualIncome: -1 }).success).toBe(false);
      expect(
        applicantSchema.safeParse({ annualIncome: MAX_ANNUAL_INCOME_RUPEES + 1 }).success
      ).toBe(false);
      expect(
        applicantSchema.safeParse({ requestedLoanAmount: MAX_REQUESTED_LOAN_RUPEES + 1 }).success
      ).toBe(false);
    });

    it('rejects non-finite numbers', () => {
      // These survive JSON.parse but must not become a silent eligibility input.
      for (const value of [Number.NaN, Number.POSITIVE_INFINITY]) {
        expect(applicantSchema.safeParse({ annualIncome: value }).success).toBe(false);
      }
    });

    it('rejects a numeric string', () => {
      // No coercion. "300000" is not a number the user typed deliberately.
      expect(applicantSchema.safeParse({ annualIncome: '300000' }).success).toBe(false);
    });
  });

  describe('text fields', () => {
    it('rejects empty and overlong strings', () => {
      expect(applicantSchema.safeParse({ occupation: '' }).success).toBe(false);
      expect(applicantSchema.safeParse({ occupation: '   ' }).success).toBe(false);
      expect(
        applicantSchema.safeParse({ occupation: 'a'.repeat(MAX_TEXT_LENGTH + 1) }).success
      ).toBe(false);
    });

    it('accepts a string at the cap', () => {
      expect(
        applicantSchema.safeParse({ occupation: 'a'.repeat(MAX_TEXT_LENGTH) }).success
      ).toBe(true);
    });

    it('rejects a number where a string is declared', () => {
      expect(applicantSchema.safeParse({ occupation: 42 }).success).toBe(false);
    });
  });

  describe('boolean field', () => {
    it('accepts real booleans only', () => {
      expect(applicantSchema.safeParse({ existingLoan: true }).success).toBe(true);
      expect(applicantSchema.safeParse({ existingLoan: 'true' }).success).toBe(false);
      expect(applicantSchema.safeParse({ existingLoan: 1 }).success).toBe(false);
    });
  });
});

describe('eligibilityRequestSchema', () => {
  it('accepts a whole-catalogue request', () => {
    expect(
      eligibilityRequestSchema.safeParse({ applicant: { age: 30 } }).success
    ).toBe(true);
  });

  it('accepts a targeted single-scheme request', () => {
    expect(
      eligibilityRequestSchema.safeParse({ schemeId: VALID_UUID, applicant: { age: 30 } })
        .success
    ).toBe(true);
  });

  it('rejects a malformed scheme id', () => {
    for (const id of ['not-a-uuid', '', '123', '../../etc/passwd']) {
      expect(
        eligibilityRequestSchema.safeParse({ schemeId: id, applicant: {} }).success,
        `schemeId ${id}`
      ).toBe(false);
    }
  });

  it('requires the applicant object', () => {
    expect(eligibilityRequestSchema.safeParse({}).success).toBe(false);
  });

  it('STRUCTURAL GUARD: a client cannot submit a verdict', () => {
    // The core security property. There is no field in this shape that can
    // carry a result, so eligibility can only be produced by the server.
    for (const key of ['verdict', 'eligible', 'status', 'result', 'isEligible', 'score']) {
      const result = eligibilityRequestSchema.safeParse({
        applicant: { age: 30 },
        [key]: 'eligible',
      });
      expect(result.success, `client must not be able to send "${key}"`).toBe(false);
    }
  });

  it('STRUCTURAL GUARD: unknown top-level keys are refused', () => {
    expect(eligibilityRequestSchema.safeParse({ applicant: {}, extra: 1 }).success).toBe(false);
  });
});

describe('formatValidationIssues', () => {
  it('reports the field path and message', () => {
    const parsed = applicantSchema.safeParse({ age: 999 });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;

    const issues = formatValidationIssues(parsed.error);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].path).toBe('age');
    expect(typeof issues[0].message).toBe('string');
  });

  it('never echoes the submitted value', () => {
    // A secret smuggled into a field must not come back out in the error.
    const parsed = applicantSchema.safeParse({ occupation: 'SUPER-SECRET-VALUE', age: -5 });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;

    const serialised = JSON.stringify(formatValidationIssues(parsed.error));
    expect(serialised).not.toContain('SUPER-SECRET-VALUE');
  });

  it('labels a root-level issue clearly', () => {
    const parsed = eligibilityRequestSchema.safeParse('not an object');
    expect(parsed.success).toBe(false);
    if (parsed.success) return;

    const issues = formatValidationIssues(parsed.error);
    expect(issues[0].path).toBe('(root)');
  });
});
