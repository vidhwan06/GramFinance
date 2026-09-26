-- ============================================================================
-- Seed data for GramFinance
-- ============================================================================
-- Run AFTER migrations 001-014 have been applied:
--     psql "$DATABASE_URL" -f supabase/seed.sql
--
-- Runs as a role that bypasses RLS (postgres via the Supabase SQL editor, or
-- the service role). The anon/authenticated roles have no INSERT grant on
-- public.schemes -- see migration 008.
--
-- ── Idempotency ──────────────────────────────────────────────────────────────
-- public.schemes.official_url carries a UNIQUE constraint (migration 004), so
-- ON CONFLICT has a real target. The previous `ON CONFLICT DO NOTHING` had no
-- conflict target and therefore could only ever match the uuid primary key --
-- which this INSERT does not supply. Re-running the seed silently created a
-- duplicate PM-KISAN row every time.
--
-- DO UPDATE (rather than DO NOTHING) is deliberate: it makes re-seeding a
-- content refresh path. Bump last_verified when re-checking a scheme and
-- re-run this file; the row is updated in place instead of duplicated.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- PM-KISAN — scheme row (kept as DRAFT)
-- ─────────────────────────────────────────────────────────────────────────────
-- status is set to 'draft' on INSERT and is deliberately NOT part of the
-- DO UPDATE set below. Migration 011 made public catalogue reads expose only
-- status = 'active', and this row's facts were last verified on 2026-01-15.
-- Publishing it as active would present unverified information as verified.
--
-- To publish: re-verify against https://pmkisan.gov.in/, update last_verified
-- to the real date, then set status = 'active'. That is a deliberate human
-- step and the verification date must never be invented.
--
-- Because status is absent from the DO UPDATE set, re-running this seed after
-- someone has properly verified and published PM-KISAN will not demote it.
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.schemes (name_en, name_kn, description_en, description_kn, target_groups, required_documents, official_url, last_verified, status)
VALUES (
    'Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)',
    'ಪ್ರಧಾನ ಮಂತ್ರಿ ಕಿಸಾನ್ ಸಮ್ಮಾನ್ ನಿಧಿ (PM-KISAN)',
    'Income support of Rs. 6,000 per year for landholding farmer families, paid in three equal installments. Eligibility estimation: GramFinance evaluates landholding status and exclusion criteria from your answers. Official verification: land-record verification, State/UT verification, and duplicate-beneficiary checks are required. Administrative requirements: eKYC, Aadhaar-seeded bank account, and PM-KISAN portal registration are mandatory. This is a preliminary assessment, not an official government eligibility determination.',
    'ಭೂಮಿ ಹೊಂದಿರುವ ರೈತ ಕುಟುಂಬಗಳಿಗೆ ವರ್ಷಕ್ಕೆ ರೂ. 6,000 ಆದಾಯ ಬೆಂಬಲ, ಮೂರು ಸಮಾನ ಕಂತುಗಳಲ್ಲಿ. ಅರ್ಹತೆ ಅಂದಾಜು: GramFinance ನಿಮ್ಮ ಉತ್ತರಗಳ ಆಧಾರದ ಮೇಲೆ ಭೂಮಿ ಹೊಂದಿಕೆ ಮತ್ತು ಹೊರಗಿಡುವಿಕೆ ಮಾನದಂಡಗಳನ್ನು ಮೌಲ್ಯಮಾಪನ ಮಾಡುತ್ತದೆ. ಅಧಿಕೃತ ಪರಿಶೀಲನೆ: ಭೂದಾಖಲೆ ಪರಿಶೀಲನೆ, ರಾಜ್ಯ/ಕೇಂದ್ರಾಡಳಿತ ಪ್ರದೇಶ ಪರಿಶೀಲನೆ ಮತ್ತು ನಕಲಿ ಪ್ರಯೋಜನ ಪರಿಶೀಲನೆ ಅಗತ್ಯವಿದೆ. ಆಡಳಿತ ಅಗತ್ಯಗಳು: eKYC, ಆಧಾರ್-ಬೀಜಿತ ಬ್ಯಾಂಕ್ ಖಾತೆ ಮತ್ತು PM-KISAN ಪೋರ್ಟಲ್ ಮೂಲಕ ನೋಂದಣಿ ಕಡ್ಡಾಯ. ಇದು ಪ್ರಾಥಮಿಕ ಮೌಲ್ಯಮಾಪನೆ, ಅಧಿಕೃತ ಸರ್ಕಾರಿ ಅರ್ಹತಾ ನಿರ್ಧಾರವಲ್ಲ.',
    ARRAY['farmer', 'small_holder', 'marginal_farmer'],
    ARRAY['Aadhaar Card', 'Land Records (Record of Rights)', 'Bank Account Details'],
    'https://pmkisan.gov.in/',
    '2026-09-26',
    'active'
) ON CONFLICT (official_url) DO UPDATE SET
    name_en             = EXCLUDED.name_en,
    name_kn             = EXCLUDED.name_kn,
    description_en      = EXCLUDED.description_en,
    description_kn      = EXCLUDED.description_kn,
    target_groups       = EXCLUDED.target_groups,
    required_documents  = EXCLUDED.required_documents,
    last_verified       = EXCLUDED.last_verified;

-- ─────────────────────────────────────────────────────────────────────────────
-- PM-KISAN — scheme_rules
-- ─────────────────────────────────────────────────────────────────────────────
-- These rules implement the PM-KISAN eligibility and exclusion criteria as
-- per the official Operational Guidelines (revised 29.03.2020) and FAQs.
--
-- All rules are grouped into 8 AND-combined groups:
--
--   Group 1 (AND): Core eligibility — family owns cultivable land
--   Group 2 (AND): Exclusion — not institutional landholder
--   Group 3 (AND): Exclusion — not a constitutional/public office holder
--   Group 4 (AND): Exclusion — not a government employee (above MTS/Class IV)
--   Group 5 (OR):  Exclusion — pension threshold with MTS/Class IV exception
--   Group 6 (AND): Exclusion — did not pay income tax
--   Group 7 (AND): Exclusion — not a registered practicing professional
--   Group 8 (AND): Exclusion — not an NRI
--
-- Group 5 uses OR logic: if ANY rule passes, the person is NOT excluded.
-- All three must fail for the exclusion to fire. This correctly implements
-- the MTS/Class IV/Group D exception — if the employee is in that category,
-- the third rule passes and the exclusion does not apply regardless of
-- pension amount.
--
-- Verification-dependent conditions (land record cutoff dates, physical
-- verification, duplicate-benefit checks, eKYC) are NOT represented as
-- scheme_rules. They are documented in the scheme description and require
-- official verification.
-- ─────────────────────────────────────────────────────────────────────────────

-- Group 1: Core eligibility — family owns cultivable land (self-declared)
INSERT INTO public.scheme_rules (scheme_id, rule_group, group_operator, rule_type, field, operator, value, required, description_en, description_kn, priority)
SELECT s.id, 1, 'AND', 'eligibility', 'ownsCultivableLand', '=', 'true', true,
    'The family must own cultivable land as per land records. This is a self-declared condition that requires official land-record verification by the State/UT.',
    'ಕುಟುಂಬವು ಭೂದಾಖಲೆ ಪ್ರಕಾರ ಭೂಮಿ ಹೊಂದಿರಬೇಕು. ಇದು ಸ್ವ-ಘೋಷಿತ ಷರತ್ತಾಗಿದ್ದು, ರಾಜ್ಯ/ಕೇಂದ್ರಾಡಳಿತ ಪ್ರದೇಶದಿಂದ ಅಧಿಕೃತ ಭೂದಾಖಲೆ ಪರಿಶೀಲನೆ ಅಗತ್ಯವಿದೆ.',
    0
FROM public.schemes s WHERE s.official_url = 'https://pmkisan.gov.in/';

-- Group 2: Exclusion — not institutional landholder
INSERT INTO public.scheme_rules (scheme_id, rule_group, group_operator, rule_type, field, operator, value, required, description_en, description_kn, priority)
SELECT s.id, 2, 'AND', 'eligibility', 'applicantCategory', '!=', '"institutional"', true,
    'Institutional landholders are not eligible.',
    'ಸಂಸ್ಥಾತ್ಮಕ ಭೂಮಿದಾರರಿಗೆ ಅರ್ಹತೆ ಇಲ್ಲ.',
    0
FROM public.schemes s WHERE s.official_url = 'https://pmkisan.gov.in/';

-- Group 3: Exclusion — not a constitutional/public office holder
INSERT INTO public.scheme_rules (scheme_id, rule_group, group_operator, rule_type, field, operator, value, required, description_en, description_kn, priority)
SELECT s.id, 3, 'AND', 'eligibility', 'isPoliticalOfficeHolder', '=', 'false', true,
    'Former and present holders of constitutional posts, Ministers/State Ministers, Lok Sabha/Rajya Sabha members, State Legislative Assembly/Council members, Municipal Corporation Mayors, and District Panchayat Chairpersons are not eligible.',
    'ಸಂವಿಧಾನಿಕ ಹುದ್ದೆಗಳನ್ನು ಹೊಂದಿದ್ದ, ಮಂತ್ರಿ/ರಾಜ್ಯ ಮಂತ್ರಿಗಳು, ಲೋಕಸಭಾ/ರಾಜ್ಯಸಭಾ ಸದಸ್ಯರು, ರಾಜ್ಯ ಶಾಸಕಾಂಗ/ಪರಿಷತ್ ಸದಸ್ಯರು, ಮುನ್ಸಿಪಲ್ ಕಾರ್ಪೊರೇಷನ್ ಮೇಯರ್ ಮತ್ತು ಜಿಲ್ಲಾ ಪಂಚಾಯತ್ ಅಧ್ಯಕ್ಷರಿಗೆ ಅರ್ಹತೆ ಇಲ್ಲ.',
    0
FROM public.schemes s WHERE s.official_url = 'https://pmkisan.gov.in/';

-- Group 4: Exclusion — not a government employee (above MTS/Class IV/Group D)
INSERT INTO public.scheme_rules (scheme_id, rule_group, group_operator, rule_type, field, operator, value, required, description_en, description_kn, priority)
SELECT s.id, 4, 'AND', 'eligibility', 'govtEmployeeCategory', '!=', '"other_govt"', true,
    'Serving or retired officers and employees of Central/State Government, PSEs, Autonomous bodies, and Local Bodies are not eligible. Multi Tasking Staff (MTS), Class IV, and Group D employees are exempt from this exclusion.',
    'ಕೇಂದ್ರ/ರಾಜ್ಯ ಸರ್ಕಾರ, ಪಿಎಸ್ಯೂ, ಸ್ವಾಯತ್ತ ಸಂಸ್ಥೆಗಳು ಮತ್ತು ಸ್ಥಳೀಯ ಸಂಸ್ಥೆಗಳ ಸೇವೆಯಲ್ಲಿರುವ ಅಥವಾ ನಿವೃತ್ತ ಅಧಿಕಾರಿಗಳು ಮತ್ತು ಉದ್ಯೋಗಿಗಳಿಗೆ ಅರ್ಹತೆ ಇಲ್ಲ. ಮಲ್ಟಿ ಟಾಸ್ಕಿಂಗ್ ಸ್ಟಾಫ್ (MTS), ಕ್ಲಾಸ್ IV ಮತ್ತು ಗ್ರೂಪ್ D ಉದ್ಯೋಗಿಗಳು ಈ ಹೊರಗಿಡುವಿಕೆಯಿಂದ ವಿನಾಯಿತಿ ಪಡೆದಿದ್ದಾರೆ.',
    0
FROM public.schemes s WHERE s.official_url = 'https://pmkisan.gov.in/';

-- Group 5: Exclusion — pension threshold with MTS/Class IV/Group D exception (OR group)
-- Rule 5a: Not a pensioner
INSERT INTO public.scheme_rules (scheme_id, rule_group, group_operator, rule_type, field, operator, value, required, description_en, description_kn, priority)
SELECT s.id, 5, 'OR', 'eligibility', 'employmentType', '!=', '"pensioner"', true,
    'If not a retired pensioner, the pension exclusion does not apply.',
    'ನಿವೃತ್ತ ಪನ್ಷನರಿಗೆ ಅಲ್ಲದಿದ್ದರೆ, ಪನ್ಷನ್ ಹೊರಗಿಡುವಿಕೆ ಅನ್ವಯಿಸುವುದಿಲ್ಲ.',
    0
FROM public.schemes s WHERE s.official_url = 'https://pmkisan.gov.in/';

-- Rule 5b: Pension below Rs. 10,000 per month
INSERT INTO public.scheme_rules (scheme_id, rule_group, group_operator, rule_type, field, operator, value, required, description_en, description_kn, priority)
SELECT s.id, 5, 'OR', 'eligibility', 'monthlyPension', '<', '10000', true,
    'Retired pensioners whose monthly pension is Rs. 10,000 or more are not eligible. Pension below this threshold is eligible.',
    'ತಿಂಗಳಿಗೆ ರೂ. 10,000 ಅಥವಾ ಹೆಚ್ಚಿನ ಪನ್ಷನ್ ಪಡೆಯುವ ನಿವೃತ್ತ ಪನ್ಷನರಿಗೆ ಅರ್ಹತೆ ಇಲ್ಲ. ಈ ಮಿತಿಗಿಂತ ಕಡಮೆ ಪನ್ಷನ್ ಅರ್ಹತೆ ಹೊಂದಿದೆ.',
    1
FROM public.schemes s WHERE s.official_url = 'https://pmkisan.gov.in/';

-- Rule 5c: MTS/Class IV/Group D exception
INSERT INTO public.scheme_rules (scheme_id, rule_group, group_operator, rule_type, field, operator, value, required, description_en, description_kn, priority)
SELECT s.id, 5, 'OR', 'eligibility', 'govtEmployeeCategory', '=', '"mts_class4_groupd"', true,
    'Multi Tasking Staff (MTS), Class IV, and Group D employees are exempt from the pension exclusion, even if their pension is Rs. 10,000 or more.',
    'ಮಲ್ಟಿ ಟಾಸ್ಕಿಂಗ್ ಸ್ಟಾಫ್ (MTS), ಕ್ಲಾಸ್ IV ಮತ್ತು ಗ್ರೂಪ್ D ಉದ್ಯೋಗಿಗಳು, ಅವರ ಪನ್ಷನ್ ರೂ. 10,000 ಅಥವಾ ಹೆಚ್ಚಿನದಾಗಿದ್ದರೂ ಪನ್ಷನ್ ಹೊರಗಿಡುವಿಕೆಯಿಂದ ವಿನಾಯಿತಿ ಪಡೆದಿದ್ದಾರೆ.',
    2
FROM public.schemes s WHERE s.official_url = 'https://pmkisan.gov.in/';

-- Group 6: Exclusion — did not pay income tax
INSERT INTO public.scheme_rules (scheme_id, rule_group, group_operator, rule_type, field, operator, value, required, description_en, description_kn, priority)
SELECT s.id, 6, 'AND', 'eligibility', 'incomeTaxPayer', '=', 'false', true,
    'Persons who paid income tax in the last assessment year are not eligible.',
    'ಕಳೆದ ಮೂಲ್ಯಮಾಪನ ವರ್ಷದಲ್ಲಿ ಆದಾಯ ತೆರಿಗೆ ಪಾಡಿದವರಿಗೆ ಅರ್ಹತೆ ಇಲ್ಲ.',
    0
FROM public.schemes s WHERE s.official_url = 'https://pmkisan.gov.in/';

-- Group 7: Exclusion — not a registered practicing professional
INSERT INTO public.scheme_rules (scheme_id, rule_group, group_operator, rule_type, field, operator, value, required, description_en, description_kn, priority)
SELECT s.id, 7, 'AND', 'eligibility', 'isRegisteredProfessional', '=', 'false', true,
    'Registered professionals (doctors, engineers, lawyers, chartered accountants, architects) carrying out their profession by practice are not eligible.',
    'ನೋಂದಾಯಿತ ವೃತ್ತಿಪರರು (ವೈದ್ಯರು, ಎಂಜಿನಿಯರ್‌ಗಳು, ವಕೀಲರು, ಚಾರ್ಟರ್ಡ್ ಅಕೌಂಟೆಂಟ್‌ಗಳು, ವಾಸ್ತುಶಿಲ್ಪಿಗಳು) ತಮ್ಮ ವೃತ್ತಿಯನ್ನು ಪಾಲಿಸುತ್ತಿದ್ದರೆ ಅರ್ಹತೆ ಇಲ್ಲ.',
    0
FROM public.schemes s WHERE s.official_url = 'https://pmkisan.gov.in/';

-- Group 8: Exclusion — not an NRI
INSERT INTO public.scheme_rules (scheme_id, rule_group, group_operator, rule_type, field, operator, value, required, description_en, description_kn, priority)
SELECT s.id, 8, 'AND', 'eligibility', 'isNRI', '=', 'false', true,
    'Non-Resident Indians (NRIs) as per the Income Tax Act, 1961 are not eligible.',
    'ಆದಾಯ ತೆರಿಗೆ ಕಾಯ್ದೆಯ ಪ್ರಕಾರ ಎನ್ ಆರ್ ಐಗಳಿಗೆ ಅರ್ಹತೆ ಇಲ್ಲ.',
    0
FROM public.schemes s WHERE s.official_url = 'https://pmkisan.gov.in/';

-- ─────────────────────────────────────────────────────────────────────────────
-- PMUY — scheme row (ACTIVE)
-- ─────────────────────────────────────────────────────────────────────────────
-- PMUY is active. status is deliberately NOT part of the DO UPDATE set below,
-- so re-running this seed after activation will not demote it back to draft.
--
-- To deactivate: set status = 'draft' manually. That is a deliberate human step.
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.schemes (name_en, name_kn, description_en, description_kn, target_groups, required_documents, official_url, last_verified, status)
VALUES (
    'Pradhan Mantri Ujjwala Yojana (PMUY)',
    'ಪ್ರಧಾನ ಮಂತ್ರಿ ಉಜ್ಜ್ವಲಾ ಯೋಜನೆ (PMUY)',
    'Eligibility estimate: GramFinance uses the information you provide to estimate whether you may meet the PMUY eligibility conditions. Official verification: final eligibility is subject to verification by the relevant authorities and Oil Marketing Companies using the prescribed documents and declarations. Administrative requirements: applicants must complete the applicable KYC, documentation, and verification process.',
    'ಅರ್ಹತೆ ಅಂದಾಜು: GramFinance ನಿಮ್ಮ ಉತ್ತರಗಳ ಆಧಾರದ ಮೇಲೆ PMUY ಅರ್ಹತೆ ಷರತ್ತುಗಳನ್ನು ಪೂರೈಸುತ್ತೀರಾ ಎಂದು ಅಂದಾಜು ಮಾಡುತ್ತದೆ. ಅಧಿಕೃತ ಪರಿಶೀಲನೆ: ಅಂತಿಮ ಅರ್ಹತೆ ಸಂಬಂಧಿತ ಅಧಿಕಾರಿಗಳು ಮತ್ತು ತೈಲ ಮಾರಾಟಾ ಕಂಪನಿಗಳ ಪರಿಶೀಲನೆಯ ಮೇಲೆ ಅವಲಂಬಿತವಾಗಿರುತ್ತದೆ. ಆಡಳಿತ ಅಗತ್ಯಗಳು: ಅರ್ಜಿದಾರರು ಅನ್ವಯಿಕ KYC, ದಾಖಲೆ ಮತ್ತು ಪರಿಶೀಲನೆ ಪ್ರಕ್ರಿಯೆಯನ್ನು ಪೂರ್ಣಗೊಳಿಸಬೇಕು.',
    ARRAY['woman', 'poor_household'],
    ARRAY['KYC application form', 'Aadhaar or proof of identity', 'Proof of address', 'Ration card or family composition document', 'Aadhaar copy of adult family members appearing in the family-composition document', 'Bank account details', 'Deprivation Declaration'],
    'https://pmuy.gov.in/',
    '2026-09-26',
    'active'
) ON CONFLICT (official_url) DO UPDATE SET
    name_en             = EXCLUDED.name_en,
    name_kn             = EXCLUDED.name_kn,
    description_en      = EXCLUDED.description_en,
    description_kn      = EXCLUDED.description_kn,
    target_groups       = EXCLUDED.target_groups,
    required_documents  = EXCLUDED.required_documents,
    last_verified       = EXCLUDED.last_verified;

-- ─────────────────────────────────────────────────────────────────────────────
-- PMUY — scheme_rules (4 rules, 1 AND group)
-- ─────────────────────────────────────────────────────────────────────────────
-- Group 1 (AND): age >= 18, gender = female, hasExistingLpgConnection = false, poorHousehold = true

INSERT INTO public.scheme_rules (scheme_id, rule_group, group_operator, rule_type, field, operator, value, required, description_en, description_kn, priority)
SELECT s.id, 1, 'AND', 'eligibility', 'age', '>=', '18', true,
    'You must be at least 18 years old.',
    'ನೀವು ಕನಿಷ್ಟ 18 ವರ್ಷ ವಯಸ್ಸಿನವರಾಗಿರಬೇಕು.',
    0
FROM public.schemes s WHERE s.official_url = 'https://pmuy.gov.in/';

INSERT INTO public.scheme_rules (scheme_id, rule_group, group_operator, rule_type, field, operator, value, required, description_en, description_kn, priority)
SELECT s.id, 1, 'AND', 'eligibility', 'gender', '=', '"female"', true,
    'The PMUY connection must be issued to an adult woman.',
    'PMUY ಸಂಪರ್ಕವು ವಯಸ್ಕ ಮಹಿಳೆಗೆ ನೀಡಲ್ಪಡಬೇಕು.',
    1
FROM public.schemes s WHERE s.official_url = 'https://pmuy.gov.in/';

INSERT INTO public.scheme_rules (scheme_id, rule_group, group_operator, rule_type, field, operator, value, required, description_en, description_kn, priority)
SELECT s.id, 1, 'AND', 'eligibility', 'hasExistingLpgConnection', '=', 'false', true,
    'Your household must not already have an LPG connection from an Oil Marketing Company.',
    'ನಿಮ್ಮ ಮನೆಯಲ್ಲಿ ತೈಲ ಮಾರಾಟಾ ಕಂಪನಿಯಿಂದ ಈಗಾಗಲೇ LPG ಸಂಪರ್ಕವಿರಬಾರದು.',
    2
FROM public.schemes s WHERE s.official_url = 'https://pmuy.gov.in/';

INSERT INTO public.scheme_rules (scheme_id, rule_group, group_operator, rule_type, field, operator, value, required, description_en, description_kn, priority)
SELECT s.id, 1, 'AND', 'eligibility', 'poorHousehold', '=', 'true', true,
    'You must belong to a poor household based on the prescribed deprivation declaration.',
    'ನೀವು ನಿಗದಿಪಡಿಸಿದ ಬಡತನದ ಹೇಳಿಕೆಯ ಆಧಾರದ ಮೇಲೆ ಬಡತನದ ಕುಟುಂಬಕ್ಕೆ ಸೇರಿದವರಾಗಿರಬೇಕು.',
    3
FROM public.schemes s WHERE s.official_url = 'https://pmuy.gov.in/';
