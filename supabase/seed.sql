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
INSERT INTO public.schemes (name_en, name_kn, description_en, description_kn, target_groups, required_documents, official_url, last_verified)
VALUES (
    'Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)',
    'ಪ್ರಧಾನ ಮಂತ್ರಿ ಕಿಸಾನ್ ಸಮ್ಮಾನ್ ನಿಧಿ (PM-KISAN)',
    'Financial support of Rs. 6,000 per year for all landholding farmer families.',
    'ಎಲ್ಲಾ ಭೂಮಿ ಹೊಂದಿರುವ ರೈತ ಕುಟುಂಬಗಳಿಗೆ ವರ್ಷಕ್ಕೆ ರೂ. 6,000 ಹಣಕಾಸಿನ ನೆರವು.',
    ARRAY['farmer', 'small_holder'],
    ARRAY['Aadhaar Card', 'Land Records', 'Bank Account Details'],
    'https://pmkisan.gov.in/',
    '2026-01-15'
) ON CONFLICT (official_url) DO UPDATE SET
    name_en             = EXCLUDED.name_en,
    name_kn             = EXCLUDED.name_kn,
    description_en      = EXCLUDED.description_en,
    description_kn      = EXCLUDED.description_kn,
    target_groups       = EXCLUDED.target_groups,
    required_documents  = EXCLUDED.required_documents,
    last_verified       = EXCLUDED.last_verified;
