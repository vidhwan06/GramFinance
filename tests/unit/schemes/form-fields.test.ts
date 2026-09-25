import { describe, it, expect } from 'vitest';
import {
  buildApplicantPayload,
  buildFieldControls,
  validateRawValues,
  booleanOptions,
  EN_MESSAGES,
  KN_MESSAGES,
  KNOWN_FIELDS,
  type RawFormValues,
} from '@/features/schemes/eligibility/form-fields';
import { SCHEME_FIELD_NAMES } from '@/features/schemes/eligibility/field-registry';

/**
 * The browser side of the eligibility flow.
 *
 * Two properties matter more than anything else here:
 *   1. the form asks for whatever the SERVER said, not a list of its own
 *   2. the payload it builds has no field in which a verdict could be smuggled
 */

describe('buildFieldControls', () => {
  it('renders exactly the fields the server asked for', () => {
    const controls = buildFieldControls(['age', 'occupation'], 'en');
    expect(controls.map((c) => c.field)).toEqual(['age', 'occupation']);
  });

  it('renders nothing when the scheme needs nothing', () => {
    expect(buildFieldControls([], 'en')).toEqual([]);
  });

  it('derives the control kind from the registry type, not the field name', () => {
    const controls = buildFieldControls(
      ['age', 'occupation', 'existingLoan'],
      'en'
    );
    expect(controls.map((c) => c.kind)).toEqual(['number', 'text', 'boolean']);
  });

  it('ignores a field that is not in the closed registry', () => {
    // Defence in depth: even a forged name from a bad response builds no control.
    const controls = buildFieldControls(
      ['age', 'is_admin', '__proto__'] as never,
      'en'
    );
    expect(controls.map((c) => c.field)).toEqual(['age']);
  });

  it('uses the bilingual label from the registry', () => {
    expect(buildFieldControls(['age'], 'en')[0].label).toBe('Age');
    expect(buildFieldControls(['age'], 'kn')[0].label).toBe('ವಯಸ್ಸು');
  });

  it('flags monetary fields so they can be labelled', () => {
    const controls = buildFieldControls(['annualIncome', 'occupation'], 'en');
    expect(controls[0].monetary).toBe(true);
    expect(controls[1].monetary).toBe(false);
  });

  it('covers the whole registry without inventing fields', () => {
    expect([...KNOWN_FIELDS].sort()).toEqual([...SCHEME_FIELD_NAMES].sort());
  });
});

describe('buildApplicantPayload', () => {
  const controls = buildFieldControls(['age', 'annualIncome', 'existingLoan', 'occupation'], 'en');

  it('converts values by the control kind', () => {
    const values: RawFormValues = {
      age: '30',
      annualIncome: '300000',
      existingLoan: 'false',
      occupation: 'farmer',
    };

    expect(buildApplicantPayload(controls, values)).toEqual({
      age: 30,
      annualIncome: 300000,
      existingLoan: false,
      occupation: 'farmer',
    });
  });

  it('omits fields the user left blank rather than sending an empty string', () => {
    const payload = buildApplicantPayload(controls, { age: '30', occupation: '   ' });
    expect(payload).toEqual({ age: 30 });
    expect('occupation' in payload).toBe(false);
  });

  it('never emits a verdict, a result or a status', () => {
    // The core security property. The payload is assembled by iterating the
    // server-supplied controls, all of which come from the closed registry, so
    // there is no code path that could add any of these.
    const payload = buildApplicantPayload(controls, {
      age: '30',
      annualIncome: '1',
      existingLoan: 'true',
      occupation: 'farmer',
    });

    for (const forbidden of [
      'verdict',
      'eligible',
      'isEligible',
      'status',
      'result',
      'score',
      'passedRules',
      'failedRules',
    ]) {
      expect(Object.keys(payload), `payload must not contain "${forbidden}"`).not.toContain(
        forbidden
      );
    }
  });

  it('cannot be tricked into emitting an unknown key', () => {
    const payload = buildApplicantPayload(controls, {
      age: '30',
      is_admin: 'true',
    } as RawFormValues);
    expect(Object.keys(payload)).toEqual(['age']);
  });

  it('skips a non-numeric entry for a number control instead of sending NaN', () => {
    const payload = buildApplicantPayload(controls, { age: 'abc' });
    expect('age' in payload).toBe(false);
  });
});

describe('validateRawValues', () => {
  const controls = buildFieldControls(['age', 'annualIncome', 'occupation'], 'en');

  it('requires an answer for every field the server asked for', () => {
    const errors = validateRawValues(controls, { age: '30' }, EN_MESSAGES);
    expect(errors.annualIncome).toBeDefined();
    expect(errors.occupation).toBeDefined();
    expect(errors.age).toBeUndefined();
  });

  it('rejects a non-number for a number control', () => {
    const errors = validateRawValues(controls, { age: 'abc', annualIncome: '1', occupation: 'x' }, EN_MESSAGES);
    expect(errors.age).toBe(EN_MESSAGES.invalidNumber);
  });

  it('rejects a negative money amount', () => {
    const errors = validateRawValues(controls, { age: '30', annualIncome: '-1', occupation: 'x' }, EN_MESSAGES);
    expect(errors.annualIncome).toBe(EN_MESSAGES.negative);
  });

  it('rejects an out-of-range or fractional age', () => {
    for (const age of ['-1', '500', '18.5']) {
      const errors = validateRawValues(controls, { age, annualIncome: '1', occupation: 'x' }, EN_MESSAGES);
      expect(errors.age, `age ${age}`).toBe(EN_MESSAGES.ageRange);
    }
    expect(
      validateRawValues(controls, { age: '0', annualIncome: '1', occupation: 'x' }, EN_MESSAGES)
        .age
    ).toBeUndefined();
    expect(
      validateRawValues(controls, { age: '120', annualIncome: '1', occupation: 'x' }, EN_MESSAGES)
        .age
    ).toBeUndefined();
  });

  it('does not invent an option list for text fields', () => {
    // Any non-empty string is acceptable; the server decides what it means.
    const errors = validateRawValues(controls, { age: '30', annualIncome: '1', occupation: 'anything at all' }, EN_MESSAGES);
    expect(errors.occupation).toBeUndefined();
  });

  it('accepts a valid payload with no errors', () => {
    const errors = validateRawValues(
      controls,
      { age: '30', annualIncome: '300000', occupation: 'farmer' },
      EN_MESSAGES
    );
    expect(errors).toEqual({});
  });

  it('has distinct Kannada messages', () => {
    expect(KN_MESSAGES.required).not.toBe(EN_MESSAGES.required);
    expect(KN_MESSAGES.required).toMatch(/[\u0C80-\u0CFF]/);
  });
});

describe('booleanOptions', () => {
  it('offers exactly two answers, in both languages', () => {
    expect(booleanOptions('en').map((o) => o.value)).toEqual(['true', 'false']);
    expect(booleanOptions('kn')).toHaveLength(2);
    expect(booleanOptions('kn')[0].label).toMatch(/[\u0C80-\u0CFF]/);
  });
});
