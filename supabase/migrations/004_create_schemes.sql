-- ============================================================================
-- Migration 004: Create Schemes Table
-- ============================================================================
-- Public reference data. Readable by anon and authenticated (migration 008);
-- writable only via the service role (seed.sql / admin tooling).
--
-- `official_url` is the natural key for a government scheme: the same scheme is
-- always published at the same domain. The UNIQUE constraint makes the table
-- idempotent to seed, which the previous version was not -- `ON CONFLICT DO
-- NOTHING` with no conflict target could only ever match the uuid primary key,
-- so re-running the seed silently inserted duplicate rows.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.schemes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_en VARCHAR(255) NOT NULL,
    name_kn VARCHAR(255) NOT NULL,
    description_en TEXT NOT NULL,
    description_kn TEXT NOT NULL,
    target_groups TEXT[] NOT NULL,
    states TEXT[] DEFAULT '{"ALL"}',
    required_documents TEXT[] NOT NULL,
    official_url TEXT NOT NULL,
    last_verified DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    CONSTRAINT schemes_official_url_key UNIQUE (official_url)
);

-- Supports filtering schemes by target group (e.g. 'farmer', 'small_holder').
CREATE INDEX IF NOT EXISTS idx_schemes_targets ON public.schemes USING GIN(target_groups);
