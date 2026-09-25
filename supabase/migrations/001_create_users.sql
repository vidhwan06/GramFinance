-- ============================================================================
-- Migration 001: Create Users Table (profile table extending Supabase Auth)
-- ============================================================================
-- public.users is NOT a standalone user table. It is a profile that extends an
-- existing Supabase Auth account:
--
--   * `id` is a foreign key to auth.users(id), so a profile row cannot exist
--     without a real authenticated user behind it.
--   * There is deliberately NO DEFAULT on `id`. Letting Postgres generate a
--     random UUID would (a) create orphan profiles that no auth user can ever
--     own, and (b) make the `auth.uid() = id` row-level-security policies in
--     migration 008 impossible to satisfy. Profile rows are created either by
--     the signup trigger (migration 009) or by the client passing its own
--     auth.uid() as `id`.
--   * ON DELETE CASCADE: deleting an auth user removes the profile. Note this
--     also fires public.feedback.user_id ... ON DELETE SET NULL (migration
--     006), so feedback submitted by a deleted account becomes unattributed.
--     That is intentional: the alternative is retaining personal data for an
--     account that no longer exists.
--
-- This table holds personal data (occupation, district). Row-level security in
-- migration 008 restricts every operation to the owning user.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    language VARCHAR(10) DEFAULT 'en' NOT NULL,
    state VARCHAR(100),
    district VARCHAR(100),
    occupation VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- Mirrors `export type Language = 'en' | 'kn'` in types/common.ts so the
    -- database cannot store a value the application cannot render.
    CONSTRAINT users_language_check CHECK (language IN ('en', 'kn'))
);
