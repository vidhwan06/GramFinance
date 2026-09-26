-- ============================================================================
-- Migration 015: Widen scheme_rules field CHECK for PMUY
-- ============================================================================
-- ADDITIVE in spirit: this widens the closed field registry to accommodate
-- PMUY's eligibility criteria. No existing rows are modified or deleted.
--
-- The new fields are:
--   * hasExistingLpgConnection — household already has an LPG connection (boolean)
--   * poorHousehold            — belongs to a poor household (boolean)
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
            'state'
        )
    );

COMMIT;
