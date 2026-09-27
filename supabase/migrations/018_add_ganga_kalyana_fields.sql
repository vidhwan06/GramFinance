-- ============================================================================
-- Migration 018: Widen scheme_rules field CHECK for Ganga Kalyana
-- ============================================================================
-- ADDITIVE in spirit: this widens the closed field registry to accommodate
-- Ganga Kalyana's eligibility criteria. No existing rows are modified or deleted.
--
-- The new fields are:
--   * caste                    — caste category (SC, ST, OBC, General, etc.)
--   * isFarmer                 — whether the applicant is a farmer
--   * landHoldingAcres         — land holding in acres
--
-- The field list MUST stay identical to SCHEME_FIELD_NAMES in
-- features/schemes/eligibility/field-registry.ts. A test asserts this.
-- ============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. public.scheme_rules field CHECK
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.scheme_rules DROP CONSTRAINT IF EXISTS scheme_rules_field_check;

ALTER TABLE public.scheme_rules
    ADD CONSTRAINT scheme_rules_field_check CHECK (
        field IN (
            'age',
            'annualIncome',
            'applicantCategory',
            'caste',
            'district',
            'employmentType',
            'existingLoan',
            'gender',
            'govtEmployeeCategory',
            'hasExistingLpgConnection',
            'incomeTaxPayer',
            'isFarmer',
            'isNRI',
            'isPoliticalOfficeHolder',
            'isRegisteredProfessional',
            'landHoldingAcres',
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

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. public.rule_nodes field CHECK
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.rule_nodes DROP CONSTRAINT IF EXISTS rule_nodes_field_check;

ALTER TABLE public.rule_nodes
    ADD CONSTRAINT rule_nodes_field_check CHECK (
        field IN (
            'age',
            'annualIncome',
            'applicantCategory',
            'caste',
            'district',
            'employmentType',
            'existingLoan',
            'gender',
            'govtEmployeeCategory',
            'hasExistingLpgConnection',
            'incomeTaxPayer',
            'isFarmer',
            'isNRI',
            'isPoliticalOfficeHolder',
            'isRegisteredProfessional',
            'landHoldingAcres',
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