-- ============================================================================
-- DEMO seed data — NOT REAL GOVERNMENT SCHEMES
-- ============================================================================
-- Every row below is fabricated test data, clearly labelled DEMO / NON-REAL so
-- it can never be mistaken for a real government scheme. Do not present these to
-- users, and do not copy their rules into real scheme records.
--
-- ── Why this file exists and why it is separate from seed.sql ────────────────
-- After migration 011, public scheme reads only expose status = 'active', and
-- the real PM-KISAN row is intentionally left at 'draft' because its facts were
-- last verified 2026-01-15 and have not been re-checked. That means the public
-- catalogue is legitimately EMPTY until a real scheme is verified and
-- published. This file provides the active/draft pair the RLS tests need,
-- without contaminating the real catalogue.
--
--   DEMO_SCHEME_001  status = active   -> publicly readable (with its rules)
--   DEMO_SCHEME_002  status = draft    -> NOT publicly readable, and neither
--                                        are its rules
--
-- Run AFTER migrations, and AFTER seed.sql:
--     psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/seed.sql
--     psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/seed-demo.sql
--
-- Idempotent: both schemes carry a UNIQUE official_url, used as the conflict
-- target, so re-running updates in place instead of duplicating.
-- ============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- DEMO_SCHEME_001 — active
-- ─────────────────────────────────────────────────────────────────────────────
-- Exercises every V1 operator across the registry: scalar comparisons, a
-- two-element IN list, and a NOT_IN list.
INSERT INTO public.schemes (
    name_en, name_kn,
    description_en, description_kn,
    target_groups, states, required_documents,
    official_url, last_verified, status
)
VALUES (
    'DEMO_SCHEME_001 — Education Loan (DEMO, NOT A REAL SCHEME)',
    'DEMO_SCHEME_001 — ಶಿಕ್ಷಣ ಸಾಲ (ಡೆಮೊ, ನಿಜವಾದ ಯೋಜನೆ ಅಲ್ಲ)',
    'DEMO DATA — synthetic eligibility fixture used to test the rule engine. Not a real government scheme and not advice.',
    'ಡೆಮೊ ಡೇಟಾ — ನಿಯಮದ ಸರ್ಕಾರಿ ಯೋಜನೆ ಅಲ್ಲ.',
    ARRAY['student', 'farmer'],
    ARRAY['Karnataka'],
    ARRAY['Aadhaar Card (DEMO)', 'Income Certificate (DEMO)'],
    'https://example.invalid/demo/education-loan',
    '2026-09-25',
    'active'
)
ON CONFLICT (official_url) DO UPDATE SET
    name_en            = EXCLUDED.name_en,
    name_kn            = EXCLUDED.name_kn,
    description_en     = EXCLUDED.description_en,
    description_kn     = EXCLUDED.description_kn,
    target_groups      = EXCLUDED.target_groups,
    states             = EXCLUDED.states,
    required_documents = EXCLUDED.required_documents,
    last_verified      = EXCLUDED.last_verified,
    status             = EXCLUDED.status;

-- ─────────────────────────────────────────────────────────────────────────────
-- DEMO_SCHEME_002 — draft (must NOT be publicly readable)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.schemes (
    name_en, name_kn,
    description_en, description_kn,
    target_groups, states, required_documents,
    official_url, last_verified, status
)
VALUES (
    'DEMO_SCHEME_002 — Farm Credit (DEMO, NOT A REAL SCHEME)',
    'DEMO_SCHEME_002 — ಕೃಷಿ ಸಾಲ (ಡೆಮೊ, ನಿಜವಾದ ಯೋಜನೆ ಅಲ್ಲ)',
    'DEMO DATA — unpublished fixture used to prove draft schemes are hidden from the public catalogue.',
    'ಡೆಮೊ ಡೇಟಾ — ಪ್ರಕಟಿಸದ ಯೋಜನೆ.',
    ARRAY['farmer'],
    ARRAY['Karnataka', 'Tamil Nadu'],
    ARRAY['Land Records (DEMO)'],
    'https://example.invalid/demo/farm-credit',
    '2026-09-25',
    'draft'
)
ON CONFLICT (official_url) DO UPDATE SET
    name_en            = EXCLUDED.name_en,
    name_kn            = EXCLUDED.name_kn,
    description_en     = EXCLUDED.description_en,
    description_kn     = EXCLUDED.description_kn,
    target_groups      = EXCLUDED.target_groups,
    states             = EXCLUDED.states,
    required_documents = EXCLUDED.required_documents,
    last_verified      = EXCLUDED.last_verified,
    status             = EXCLUDED.status;

-- ─────────────────────────────────────────────────────────────────────────────
-- Rules for DEMO_SCHEME_001
-- ─────────────────────────────────────────────────────────────────────────────
-- All monetary values are INR RUPEES, never paise. The loan engine's paise
-- convention does not apply here (see features/schemes/eligibility/
-- field-registry.ts). 500000 = ₹5,00,000.
--
-- Rules have no natural unique key, so ON CONFLICT cannot dedupe them. Each
-- block therefore clears the demo schemes' own rules first, which keeps this
-- file safely re-runnable. Scoped strictly to the example.invalid fixtures.
DELETE FROM public.scheme_rules
WHERE scheme_id IN (
    SELECT id FROM public.schemes WHERE official_url LIKE 'https://example.invalid/%'
);

-- Group 1 (AND): all must pass for the group to pass.
INSERT INTO public.scheme_rules (
    scheme_id, rule_group, group_operator, rule_type,
    field, operator, value, required, priority, description_en
)
SELECT s.id, 1, 'AND', 'eligibility', r.field, r.operator, r.value, TRUE, r.priority, r.description
FROM public.schemes s
CROSS JOIN (VALUES
    ('age',              '>=',  '18'::jsonb,  1, 'DEMO: applicant must be 18 or older'),
    ('annualIncome',     '<=',  '500000'::jsonb, 2, 'DEMO: annual income at or below 5 lakh rupees'),
    ('occupation',       'IN',  '["student","farmer"]'::jsonb, 3, 'DEMO: occupation must be student or farmer'),
    ('applicantCategory','NOT_IN', '["unverified"]'::jsonb, 4, 'DEMO: applicant category must not be unverified')
) AS r(field, operator, value, priority, description)
WHERE s.official_url = 'https://example.invalid/demo/education-loan';

-- ─────────────────────────────────────────────────────────────────────────────
-- Rules for DEMO_SCHEME_002 (draft)
-- ─────────────────────────────────────────────────────────────────────────────
-- Group 1 (AND): loan purpose and amount.
-- Group 2 (OR):  either an existing-loan exemption OR a state match.
-- The OR group is what makes this a genuine multi-group fixture.
--
-- BOTH branches of group 2 are `required`. An earlier version marked the
-- `state` branch optional, which was an authoring error: it is a real
-- alternative condition, so an applicant with an existing loan and no state
-- would leave the group UNKNOWN permanently, reporting potentially_eligible
-- with nothing left to ask for.
INSERT INTO public.scheme_rules (
    scheme_id, rule_group, group_operator, rule_type,
    field, operator, value, required, priority, description_en
)
SELECT s.id, 1, 'AND', 'eligibility', r.field, r.operator, r.value, TRUE, r.priority, r.description
FROM public.schemes s
CROSS JOIN (VALUES
    ('loanPurpose',        '=',  '"agriculture"'::jsonb, 1, 'DEMO: loan purpose must be agriculture'),
    ('requestedLoanAmount','<=', '250000'::jsonb, 2, 'DEMO: requested amount at or below 2.5 lakh rupees')
) AS r(field, operator, value, priority, description)
WHERE s.official_url = 'https://example.invalid/demo/farm-credit';

INSERT INTO public.scheme_rules (
    scheme_id, rule_group, group_operator, rule_type,
    field, operator, value, required, priority, description_en
)
SELECT s.id, 2, 'OR', 'eligibility', r.field, r.operator, r.value, r.required, r.priority, r.description
FROM public.schemes s
CROSS JOIN (VALUES
    ('existingLoan', '=',   'false'::jsonb, TRUE, 1, 'DEMO: no existing loan, OR ...'),
    ('state',        'IN',  '["Karnataka"]'::jsonb, TRUE, 2, 'DEMO: ... OR applicant is in Karnataka')
) AS r(field, operator, value, required, priority, description)
WHERE s.official_url = 'https://example.invalid/demo/farm-credit';

COMMIT;
