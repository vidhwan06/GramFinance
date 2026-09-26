import { describe, it, expect } from 'vitest';
import {
  SCHEME_FIELD_NAMES,
  SCHEME_FIELD_REGISTRY,
  FORBIDDEN_FIELD_NAMES,
  isKnownSchemeField,
  getSchemeFieldDefinition,
  getMonetaryFieldNames,
  readApplicantField,
  SchemeApplicant,
} from '@/features/schemes/eligibility/field-registry';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fieldCheckLiterals, readMigration } from '../../helpers/sql';
/**
 * Phase 4A domain invariants.
 *
 * The closed field registry is a SECURITY boundary, not a convenience type. A
 * generic rule evaluator that does `applicant[rule.field]` is a property-access
 * primitive: a rule row naming `__proto__`, `constructor` or an internal flag
 * would be read and acted upon. These tests pin the allow-list, and prove the
 * database enforces the same list independently.
 */

describe('closed field registry', () => {
  it('contains exactly the approved fields', () => {
    expect([...SCHEME_FIELD_NAMES].sort()).toEqual(
      [
        'age',
        'annualIncome',
        'applicantCategory',
        'district',
        'employmentType',
        'existingLoan',
        'gender',
        'govtEmployeeCategory',
        'hasExistingLpgConnection',
        'incomeTaxPayer',
        'isNRI',
        'isPoliticalOfficeHolder',
        'isRegisteredProfessional',
        'loanPurpose',
        'monthlyPension',
        'occupation',
        'ownsCultivableLand',
        'poorHousehold',
        'requestedLoanAmount',
        'state',
      ].sort()
    );
  });

  it('keeps every registry entry unique and fully described', () => {
    const names = SCHEME_FIELD_REGISTRY.map((d) => d.name);
    expect(new Set(names).size).toBe(names.length);

    for (const def of SCHEME_FIELD_REGISTRY) {
      expect(def.type).toMatch(/^(number|string|boolean)$/);
      expect(def.unit).toMatch(/^(years|INR|none)$/);
      expect(def.labelEn.length).toBeGreaterThan(0);
      expect(def.labelKn.length).toBeGreaterThan(0);
      // Bilingual labels must actually contain Kannada, not an English fallback.
      expect(def.labelKn, `${def.name} labelKn is not Kannada`).toMatch(/[\u0C80-\u0CFF]/);
    }
  });
});

describe('prototype-pollution and unknown-field rejection', () => {
  it.each([...FORBIDDEN_FIELD_NAMES])('rejects the dangerous name "%s"', (name) => {
    expect(isKnownSchemeField(name)).toBe(false);
    expect(getSchemeFieldDefinition(name)).toBeUndefined();
  });

  it('rejects arbitrary unknown fields', () => {
    for (const name of ['nope', 'Age', 'AGE', 'age ', ' admin', 'role_name', '']) {
      expect(isKnownSchemeField(name), `"${name}" must not resolve`).toBe(false);
    }
  });

  it('rejects non-string field names', () => {
    for (const name of [null, undefined, 42, {}, [], Symbol('age'), true]) {
      expect(isKnownSchemeField(name as unknown)).toBe(false);
    }
  });

  it('returns undefined for a forbidden field even on a populated applicant', () => {
    // The dangerous case: an applicant object that actually HAS such a property.
    const attacker: SchemeApplicant & Record<string, unknown> = {
      age: 30,
      is_admin: true,
      role: 'admin',
    };

    expect(readApplicantField(attacker as SchemeApplicant, 'is_admin')).toBeUndefined();
    expect(readApplicantField(attacker as SchemeApplicant, 'role')).toBeUndefined();
    // A legitimate field still reads normally.
    expect(readApplicantField(attacker as SchemeApplicant, 'age')).toBe(30);
  });

  it('never reads inherited properties', () => {
    // Something on the prototype chain must not be visible as applicant data.
    const proto = { occupation: 'inherited-farmer' };
    const child: SchemeApplicant = Object.create(proto);
    child.age = 25;

    expect(readApplicantField(child, 'age')).toBe(25);
    expect(readApplicantField(child, 'occupation')).toBeUndefined();
  });

  it('tolerates a non-object applicant', () => {
    for (const bad of [null, undefined, 'nope', 42]) {
      expect(readApplicantField(bad as unknown as SchemeApplicant, 'age')).toBeUndefined();
    }
  });
});

describe('monetary unit discipline (decision 13)', () => {
  it('marks exactly the monetary fields, in INR', () => {
    expect([...getMonetaryFieldNames()].sort()).toEqual(['annualIncome', 'monthlyPension', 'requestedLoanAmount']);

    for (const name of getMonetaryFieldNames()) {
      const def = getSchemeFieldDefinition(name)!;
      expect(def.monetary).toBe(true);
      // The scheme engine is in RUPEES. The loan engine's paise convention must
      // not leak in here.
      expect(def.unit).toBe('INR');
    }
  });

  it('declares non-monetary fields as having no currency unit', () => {
    for (const def of SCHEME_FIELD_REGISTRY) {
      if (def.monetary) continue;
      expect(def.unit).not.toBe('INR');
    }
  });

  it('uses years for age, not a currency or unitless value', () => {
    expect(getSchemeFieldDefinition('age')?.unit).toBe('years');
  });

  it('contains no paise conversion anywhere in the registry module', () => {
    // A `* 100` or `/ 100` here would silently reintroduce the paise bug.
    const source = readFileSync(
      resolve(process.cwd(), 'features/schemes/eligibility/field-registry.ts'),
      'utf8'
    );
    // Strip comments so the explanatory prose about *100 / /100 is not matched.
    const code = source
      .split(/\r?\n/)
      .filter((line) => !line.trim().startsWith('*') && !line.trim().startsWith('//'))
      .join('\n');

    expect(code).not.toMatch(/\*\s*100\b/);
    expect(code).not.toMatch(/\/\s*100\b/);
  });
});

describe('TypeScript registry and SQL CHECK constraint agree', () => {
  // The field CHECK is defined in migration 011, widened by 014, then 015.
  // We read the LATEST version (015) to verify the full field list.
  const sql = readMigration('015_add_pmuy_fields.sql');

  it('migration 015 exists', () => {
    expect(sql.length).toBeGreaterThan(0);
  });

  it('the SQL field CHECK lists exactly the registry fields', () => {
    const sqlFields = fieldCheckLiterals(sql, 'scheme_rules_field_check');
    expect(sqlFields.length, 'scheme_rules_field_check not found or empty').toBeGreaterThan(0);

    // Compared as sets: ordering within the CHECK is irrelevant to correctness.
    expect([...sqlFields].sort()).toEqual([...SCHEME_FIELD_NAMES].sort());
  });

  it('the SQL CHECK does not admit any forbidden name', () => {
    const sqlFields = fieldCheckLiterals(sql, 'scheme_rules_field_check');

    for (const forbidden of FORBIDDEN_FIELD_NAMES) {
      expect(sqlFields, `SQL CHECK must not allow "${forbidden}"`).not.toContain(forbidden);
    }
  });
});
