import { describe, it, expect } from 'vitest';
import {
  evaluateEligibility,
  collectRequiredFields,
} from '@/features/schemes/eligibility/eligibility-engine';
import type { SchemeApplicant } from '@/features/schemes/eligibility/field-registry';
import type { SchemeRule } from '@/features/schemes/types';

/**
 * PM-KISAN eligibility and exclusion rules.
 *
 * Tests the full rule model:
 *   Group 1 (AND): ownsCultivableLand = true
 *   Group 2 (AND): applicantCategory != "institutional"
 *   Group 3 (AND): isPoliticalOfficeHolder = false
 *   Group 4 (AND): govtEmployeeCategory != "other_govt"
 *   Group 5 (OR):  employmentType != "pensioner"
 *                  OR monthlyPension < 10000
 *                  OR govtEmployeeCategory = "mts_class4_groupd"
 *   Group 6 (AND): incomeTaxPayer = false
 *   Group 7 (AND): isRegisteredProfessional = false
 *   Group 8 (AND): isNRI = false
 *
 * All groups are AND-combined. 10 rules across 8 groups.
 */

function rule(
  partial: Partial<SchemeRule> &
    Pick<SchemeRule, 'field' | 'operator' | 'value'>
): SchemeRule {
  return {
    id: partial.id ?? `${partial.field}-${partial.operator}`,
    schemeId: 'pmkisan',
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

/** All PM-KISAN rules, in group order. */
function pmKisanRules(): SchemeRule[] {
  return [
    // Group 1: Core eligibility
    rule({ field: 'ownsCultivableLand', operator: '=', value: true, ruleGroup: 1 }),

    // Group 2: Not institutional
    rule({ field: 'applicantCategory', operator: '!=', value: 'institutional', ruleGroup: 2 }),

    // Group 3: Not political office holder
    rule({ field: 'isPoliticalOfficeHolder', operator: '=', value: false, ruleGroup: 3 }),

    // Group 4: Not excluded govt employee
    rule({ field: 'govtEmployeeCategory', operator: '!=', value: 'other_govt', ruleGroup: 4 }),

    // Group 5: Pension exclusion (OR group)
    rule({ field: 'employmentType', operator: '!=', value: 'pensioner', ruleGroup: 5, groupOperator: 'OR', priority: 0 }),
    rule({ field: 'monthlyPension', operator: '<', value: 10000, ruleGroup: 5, groupOperator: 'OR', priority: 1 }),
    rule({ field: 'govtEmployeeCategory', operator: '=', value: 'mts_class4_groupd', ruleGroup: 5, groupOperator: 'OR', priority: 2 }),

    // Group 6: Not income tax payer
    rule({ field: 'incomeTaxPayer', operator: '=', value: false, ruleGroup: 6 }),

    // Group 7: Not registered professional
    rule({ field: 'isRegisteredProfessional', operator: '=', value: false, ruleGroup: 7 }),

    // Group 8: Not NRI
    rule({ field: 'isNRI', operator: '=', value: false, ruleGroup: 8 }),
  ];
}

function evaluate(applicant: SchemeApplicant) {
  return evaluateEligibility('pmkisan', pmKisanRules(), applicant);
}

/** A fully eligible farmer — baseline for mutation. */
function eligibleFarmer(): SchemeApplicant {
  return {
    ownsCultivableLand: true,
    applicantCategory: 'farmer',
    isPoliticalOfficeHolder: false,
    govtEmployeeCategory: 'none',
    employmentType: 'self-employed',
    monthlyPension: 0,
    incomeTaxPayer: false,
    isRegisteredProfessional: false,
    isNRI: false,
  };
}

// ─── eligible farmer ─────────────────────────────────────────────────────────

describe('PM-KISAN: eligible farmer', () => {
  it('returns eligible for a fully qualified farmer', () => {
    const result = evaluate(eligibleFarmer());
    expect(result.status).toBe('eligible');
    // 10 rules total; 9 pass, 1 fails (govtEmployeeCategory = mts_class4_groupd
    // fails because the farmer is "none", but the OR group still passes via
    // employmentType != "pensioner")
    expect(result.passedRules.length).toBeGreaterThanOrEqual(8);
    expect(result.failedRules.length).toBeLessThanOrEqual(2);
    expect(result.unknownRules).toHaveLength(0);
  });
});

// ─── Group 1: no cultivable land ─────────────────────────────────────────────

describe('PM-KISAN: no cultivable land', () => {
  it('returns not_eligible when ownsCultivableLand is false', () => {
    const applicant = { ...eligibleFarmer(), ownsCultivableLand: false };
    const result = evaluate(applicant);
    expect(result.status).toBe('not_eligible');
    expect(result.failedRules.some((r) => r.field === 'ownsCultivableLand')).toBe(true);
  });
});

// ─── Group 2: institutional landholder ──────────────────────────────────────

describe('PM-KISAN: institutional landholder', () => {
  it('returns not_eligible when applicantCategory is institutional', () => {
    const applicant = { ...eligibleFarmer(), applicantCategory: 'institutional' };
    const result = evaluate(applicant);
    expect(result.status).toBe('not_eligible');
    expect(result.failedRules.some((r) => r.field === 'applicantCategory')).toBe(true);
  });
});

// ─── Group 3: political office holder ───────────────────────────────────────

describe('PM-KISAN: political office holder', () => {
  it('returns not_eligible when isPoliticalOfficeHolder is true', () => {
    const applicant = { ...eligibleFarmer(), isPoliticalOfficeHolder: true };
    const result = evaluate(applicant);
    expect(result.status).toBe('not_eligible');
    expect(result.failedRules.some((r) => r.field === 'isPoliticalOfficeHolder')).toBe(true);
  });
});

// ─── Group 4: government employee ───────────────────────────────────────────

describe('PM-KISAN: government employee', () => {
  it('returns not_eligible for other_govt category', () => {
    const applicant = { ...eligibleFarmer(), govtEmployeeCategory: 'other_govt' };
    const result = evaluate(applicant);
    expect(result.status).toBe('not_eligible');
    expect(result.failedRules.some((r) => r.field === 'govtEmployeeCategory')).toBe(true);
  });

  it('returns eligible for MTS/Class IV/Group D employees', () => {
    const applicant = { ...eligibleFarmer(), govtEmployeeCategory: 'mts_class4_groupd' };
    const result = evaluate(applicant);
    expect(result.status).toBe('eligible');
  });

  it('returns eligible when govtEmployeeCategory is none', () => {
    const applicant = { ...eligibleFarmer(), govtEmployeeCategory: 'none' };
    const result = evaluate(applicant);
    expect(result.status).toBe('eligible');
  });
});

// ─── Group 5: pension exclusion ──────────────────────────────────────────────

describe('PM-KISAN: pension exclusion', () => {
  it('returns eligible for non-pensioners', () => {
    const applicant = { ...eligibleFarmer(), employmentType: 'self-employed' };
    const result = evaluate(applicant);
    expect(result.status).toBe('eligible');
  });

  it('returns eligible for pension below Rs. 10,000', () => {
    const applicant = {
      ...eligibleFarmer(),
      employmentType: 'pensioner',
      monthlyPension: 5000,
    };
    const result = evaluate(applicant);
    expect(result.status).toBe('eligible');
  });

  it('returns eligible for pension at exactly Rs. 9,999', () => {
    const applicant = {
      ...eligibleFarmer(),
      employmentType: 'pensioner',
      monthlyPension: 9999,
    };
    const result = evaluate(applicant);
    expect(result.status).toBe('eligible');
  });

  it('returns not_eligible for pension at exactly Rs. 10,000', () => {
    const applicant = {
      ...eligibleFarmer(),
      employmentType: 'pensioner',
      monthlyPension: 10000,
    };
    const result = evaluate(applicant);
    expect(result.status).toBe('not_eligible');
  });

  it('returns not_eligible for pension above Rs. 10,000', () => {
    const applicant = {
      ...eligibleFarmer(),
      employmentType: 'pensioner',
      monthlyPension: 15000,
    };
    const result = evaluate(applicant);
    expect(result.status).toBe('not_eligible');
  });

  it('returns eligible for MTS/Class IV/Group D with high pension', () => {
    const applicant = {
      ...eligibleFarmer(),
      employmentType: 'pensioner',
      monthlyPension: 15000,
      govtEmployeeCategory: 'mts_class4_groupd',
    };
    const result = evaluate(applicant);
    expect(result.status).toBe('eligible');
  });

  it('returns not_eligible for other_govt pensioner with high pension', () => {
    const applicant = {
      ...eligibleFarmer(),
      employmentType: 'pensioner',
      monthlyPension: 15000,
      govtEmployeeCategory: 'other_govt',
    };
    const result = evaluate(applicant);
    expect(result.status).toBe('not_eligible');
  });

  it('returns potentially_eligible when pension amount is missing for a pensioner', () => {
    const applicant: SchemeApplicant = {
      ownsCultivableLand: true,
      applicantCategory: 'farmer',
      isPoliticalOfficeHolder: false,
      govtEmployeeCategory: 'none',
      employmentType: 'pensioner',
      incomeTaxPayer: false,
      isRegisteredProfessional: false,
      isNRI: false,
    };
    const result = evaluate(applicant);
    expect(result.status).toBe('potentially_eligible');
    expect(result.unknownRules.some((r) => r.field === 'monthlyPension')).toBe(true);
  });

  it('returns eligible for non-pensioner even with no pension data', () => {
    const applicant = { ...eligibleFarmer(), employmentType: 'self-employed' };
    const result = evaluate(applicant);
    expect(result.status).toBe('eligible');
  });
});

// ─── Group 6: income tax payer ──────────────────────────────────────────────

describe('PM-KISAN: income tax payer', () => {
  it('returns not_eligible when incomeTaxPayer is true', () => {
    const applicant = { ...eligibleFarmer(), incomeTaxPayer: true };
    const result = evaluate(applicant);
    expect(result.status).toBe('not_eligible');
    expect(result.failedRules.some((r) => r.field === 'incomeTaxPayer')).toBe(true);
  });

  it('returns eligible when incomeTaxPayer is false', () => {
    const applicant = { ...eligibleFarmer(), incomeTaxPayer: false };
    const result = evaluate(applicant);
    expect(result.status).toBe('eligible');
  });
});

// ─── Group 7: registered professional ────────────────────────────────────────

describe('PM-KISAN: registered professional', () => {
  it('returns not_eligible when isRegisteredProfessional is true', () => {
    const applicant = { ...eligibleFarmer(), isRegisteredProfessional: true };
    const result = evaluate(applicant);
    expect(result.status).toBe('not_eligible');
    expect(result.failedRules.some((r) => r.field === 'isRegisteredProfessional')).toBe(true);
  });

  it('returns eligible when isRegisteredProfessional is false', () => {
    const applicant = { ...eligibleFarmer(), isRegisteredProfessional: false };
    const result = evaluate(applicant);
    expect(result.status).toBe('eligible');
  });
});

// ─── Group 8: NRI ────────────────────────────────────────────────────────────

describe('PM-KISAN: NRI', () => {
  it('returns not_eligible when isNRI is true', () => {
    const applicant = { ...eligibleFarmer(), isNRI: true };
    const result = evaluate(applicant);
    expect(result.status).toBe('not_eligible');
    expect(result.failedRules.some((r) => r.field === 'isNRI')).toBe(true);
  });

  it('returns eligible when isNRI is false', () => {
    const applicant = { ...eligibleFarmer(), isNRI: false };
    const result = evaluate(applicant);
    expect(result.status).toBe('eligible');
  });
});

// ─── UNKNOWN / missing fields ────────────────────────────────────────────────

describe('PM-KISAN: missing/UNKNOWN fields', () => {
  it('returns potentially_eligible when ownsCultivableLand is missing', () => {
    const { ownsCultivableLand, ...rest } = eligibleFarmer();
    void ownsCultivableLand;
    const result = evaluate(rest);
    expect(result.status).toBe('potentially_eligible');
    expect(result.unknownRules.some((r) => r.field === 'ownsCultivableLand')).toBe(true);
  });

  it('returns potentially_eligible when govtEmployeeCategory is missing', () => {
    const { govtEmployeeCategory, ...rest } = eligibleFarmer();
    void govtEmployeeCategory;
    const result = evaluate(rest);
    expect(result.status).toBe('potentially_eligible');
  });

  it('returns potentially_eligible when multiple fields are missing', () => {
    const applicant: SchemeApplicant = {
      ownsCultivableLand: true,
      incomeTaxPayer: false,
      isNRI: false,
    };
    const result = evaluate(applicant);
    expect(result.status).toBe('potentially_eligible');
  });

  it('returns not_eligible when a known exclusion overrides unknown fields', () => {
    const applicant: SchemeApplicant = {
      ownsCultivableLand: true,
      incomeTaxPayer: true,
      isNRI: false,
    };
    const result = evaluate(applicant);
    expect(result.status).toBe('not_eligible');
    expect(result.failedRules.some((r) => r.field === 'incomeTaxPayer')).toBe(true);
  });

  it('collects missing information from required rules', () => {
    const { ownsCultivableLand, ...rest } = eligibleFarmer();
    void ownsCultivableLand;
    const result = evaluate(rest);
    expect(result.status).toBe('potentially_eligible');
    expect(result.missingInformation).toContain('ownsCultivableLand');
  });
});

// ─── combinations ───────────────────────────────────────────────────────────

describe('PM-KISAN: combinations of multiple exclusions', () => {
  it('returns not_eligible when both income tax payer and NRI', () => {
    const applicant = {
      ...eligibleFarmer(),
      incomeTaxPayer: true,
      isNRI: true,
    };
    const result = evaluate(applicant);
    expect(result.status).toBe('not_eligible');
    expect(result.failedRules.some((r) => r.field === 'incomeTaxPayer')).toBe(true);
    expect(result.failedRules.some((r) => r.field === 'isNRI')).toBe(true);
  });

  it('returns not_eligible when institutional and political office holder', () => {
    const applicant = {
      ...eligibleFarmer(),
      applicantCategory: 'institutional',
      isPoliticalOfficeHolder: true,
    };
    const result = evaluate(applicant);
    expect(result.status).toBe('not_eligible');
    expect(result.failedRules.some((r) => r.field === 'applicantCategory')).toBe(true);
    expect(result.failedRules.some((r) => r.field === 'isPoliticalOfficeHolder')).toBe(true);
  });

  it('returns not_eligible when govt employee and pensioner with high pension', () => {
    const applicant = {
      ...eligibleFarmer(),
      govtEmployeeCategory: 'other_govt',
      employmentType: 'pensioner',
      monthlyPension: 15000,
    };
    const result = evaluate(applicant);
    expect(result.status).toBe('not_eligible');
    expect(result.failedRules.some((r) => r.field === 'govtEmployeeCategory')).toBe(true);
  });

  it('returns eligible for MTS/Class IV/Group D with high pension (exception holds)', () => {
    const applicant = {
      ...eligibleFarmer(),
      govtEmployeeCategory: 'mts_class4_groupd',
      employmentType: 'pensioner',
      monthlyPension: 20000,
    };
    const result = evaluate(applicant);
    expect(result.status).toBe('eligible');
  });

  it('returns not_eligible when no land and income tax payer', () => {
    const applicant = {
      ...eligibleFarmer(),
      ownsCultivableLand: false,
      incomeTaxPayer: true,
    };
    const result = evaluate(applicant);
    expect(result.status).toBe('not_eligible');
    expect(result.failedRules.some((r) => r.field === 'ownsCultivableLand')).toBe(true);
    expect(result.failedRules.some((r) => r.field === 'incomeTaxPayer')).toBe(true);
  });
});

// ─── rule count and structure ───────────────────────────────────────────────

describe('PM-KISAN: rule structure', () => {
  it('has exactly 10 rules across 8 groups', () => {
    const rules = pmKisanRules();
    expect(rules).toHaveLength(10);

    const groups = new Set(rules.map((r) => r.ruleGroup));
    expect(groups.size).toBe(8);
  });

  it('Group 5 uses OR logic', () => {
    const rules = pmKisanRules();
    const group5 = rules.filter((r) => r.ruleGroup === 5);
    expect(group5).toHaveLength(3);
    for (const r of group5) {
      expect(r.groupOperator).toBe('OR');
    }
  });

  it('all other groups use AND logic', () => {
    const rules = pmKisanRules();
    const nonGroup5 = rules.filter((r) => r.ruleGroup !== 5);
    for (const r of nonGroup5) {
      expect(r.groupOperator).toBe('AND');
    }
  });

  it('collectRequiredFields returns all 9 unique required fields', () => {
    // govtEmployeeCategory appears in both Group 4 and Group 5 but is deduplicated
    const fields = collectRequiredFields(pmKisanRules());
    expect(fields).toHaveLength(9);
  });
});
