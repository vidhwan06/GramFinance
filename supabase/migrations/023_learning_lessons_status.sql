-- ============================================================================
-- Migration 023: Add status to lessons & restrict public access to active only
-- ============================================================================
-- Strictly ADDITIVE and SECURITY-TIGHTENING.
--
-- Adds:
--   * public.lessons.status       -- lifecycle state ('draft', 'active', 'archived')
--   * idx_lessons_status          -- index for filtered lookups
--   * lessons_status_check        -- CHECK constraint
--   * Updates lessons RLS policy  -- anon & authenticated can only SELECT active lessons
--
-- Preserves:
--   * public.quizzes RLS policy (authenticated-only access from migrations 008 & 010)
-- ============================================================================

BEGIN;

-- ── 1. Add status column to lessons ───────────────────────────────────────────
ALTER TABLE public.lessons
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.lessons'::regclass
          AND conname = 'lessons_status_check'
    ) THEN
        ALTER TABLE public.lessons
            ADD CONSTRAINT lessons_status_check
            CHECK (status IN ('draft', 'active', 'archived'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_lessons_status
    ON public.lessons(status);

-- ── 2. Update RLS: Public reads expose ONLY active lessons ─────────────────────
-- Replaces previous open USING (true) policy with active-only filter.
DROP POLICY IF EXISTS "lessons_select_public" ON public.lessons;
CREATE POLICY "lessons_select_active" ON public.lessons
    FOR SELECT TO anon, authenticated
    USING ( status = 'active' );

COMMIT;
