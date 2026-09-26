-- ============================================================================
-- Migration 014: Widen scheme_rules field CHECK for PM-KISAN
-- ============================================================================
-- ADDITIVE in spirit: this widens the closed field registry to accommodate
-- PM-KISAN's exclusion criteria. No existing rows are modified or deleted.
--
-- The new fields are:
--   * ownsCultivableLand     — self-declared landholding (boolean)
--   * govtEmployeeCategory   — govt employee category with MTS/Class IV exception
--   * monthlyPension          — monthly pension amount in INR
--   * incomeTaxPayer          — paid income tax last assessment year
--   * isNRI                   — Non-Resident Indian
--   * isPoliticalOfficeHolder — held constitutional/public office
--   * isRegisteredProfessional — registered practicing professional
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
            'incomeTaxPayer',
            'isNRI',
            'isPoliticalOfficeHolder',
            'isRegisteredProfessional',
            'loanPurpose',
            'monthlyPension',
            'occupation',
            'ownsCultivableLand',
            'requestedLoanAmount',
            'state'
        )
    );

COMMIT;
