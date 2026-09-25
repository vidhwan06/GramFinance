-- ============================================================================
-- Seed data for GramFinance
-- ============================================================================
-- Run AFTER migrations 001-009 have been applied:
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

-- Initial verified scheme
--
-- status is set to 'draft' on INSERT and is deliberately NOT part of the
-- DO UPDATE set below. Migration 011 made public catalogue reads expose only
-- status = 'active', and this row's facts were last verified on 2026-01-15 --
-- around eight months before that migration. Publishing it as active would
-- present unverified information as currently verified.
--
-- To publish it: re-verify against https://pmkisan.gov.in/, update
-- last_verified to the real date, then set status = 'active'. That is a
-- deliberate human step and the verification date must never be invented.
--
-- Because status is absent from the DO UPDATE set, re-running this seed after
-- someone has properly verified and published PM-KISAN will not demote it.
INSERT INTO public.schemes (name_en, name_kn, description_en, description_kn, target_groups, required_documents, official_url, last_verified, status)
VALUES (
    'Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)',
    'ಪ್ರಧಾನ ಮಂತ್ರಿ ಕಿಸಾನ್ ಸಮ್ಮಾನ್ ನಿಧಿ (PM-KISAN)',
    'Financial support of Rs. 6,000 per year for all landholding farmer families.',
    'ಎಲ್ಲಾ ಭೂಮಿ ಹೊಂದಿರುವ ರೈತ ಕುಟುಂಬಗಳಿಗೆ ವರ್ಷಕ್ಕೆ ರೂ. 6,000 ಹಣಕಾಸಿನ ನೆರವು.',
    ARRAY['farmer', 'small_holder'],
    ARRAY['Aadhaar Card', 'Land Records', 'Bank Account Details'],
    'https://pmkisan.gov.in/',
    '2026-01-15',
    'draft'
) ON CONFLICT (official_url) DO UPDATE SET
    name_en             = EXCLUDED.name_en,
    name_kn             = EXCLUDED.name_kn,
    description_en      = EXCLUDED.description_en,
    description_kn      = EXCLUDED.description_kn,
    target_groups       = EXCLUDED.target_groups,
    required_documents  = EXCLUDED.required_documents,
    last_verified       = EXCLUDED.last_verified;
