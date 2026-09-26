-- ============================================================================
-- Migration 017: Widen scheme_rules field CHECK for PM Vishwakarma
-- ============================================================================
-- ADDITIVE in spirit: this widens the closed field registry to accommodate
-- PM Vishwakarma's eligibility criteria. No existing rows are modified or deleted.
--
-- The new fields are:
--   * trade                          — one of 18 notified traditional trades
--   * worksWithHandsAndTools         — works with hands and tools
--   * selfEmployed                   — self-employed basis
--   * worksInUnorganisedSector      — unorganised sector
--   * engagedInTrade                — currently engaged in trade
--   * familyMemberAlreadyBeneficiary — one family member restriction
--   * governmentServiceOrFamilyMember — government service exclusion
--   * hasSimilarGovtLoanLast5Years  — previous 5-year loan check
--   * similarGovtLoanType           — loan type enum
--   * similarGovtLoanFullyRepaid   — repayment status
--
-- The field list MUST stay identical to SCHEME_FIELD_NAMES in
-- features/schemes/eligibility/field-registry.ts. A test asserts this.
-- ============================================================================

BEGIN;

ALTER TABLE public.scheme_rules DROP CONSTRAINT IF EXISTS scheme_rules_field_check;

ALTER TABLE public.scheme_rules
    ADD CONSTRAINT scheme_rules_field_check CHECK (
        field IN (
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
            'selfEmployed',
            'similarGovtLoanFullyRepaid',
            'similarGovtLoanType',
            'state',
            'engagedInTrade',
            'familyMemberAlreadyBeneficiary',
            'governmentServiceOrFamilyMember',
            'hasSimilarGovtLoanLast5Years',
            'trade',
            'worksInUnorganisedSector',
            'worksWithHandsAndTools'
        )
    );

COMMIT;
