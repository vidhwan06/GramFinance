-- ============================================================================
-- Migration 024: Add sort_order to lessons for deterministic chapter ordering
-- ============================================================================
-- Strictly ADDITIVE.
--
-- Adds:
--   * public.lessons.sort_order  -- integer for ordering chapters within a module
--
-- Preserves:
--   * All existing columns and data
--   * All existing RLS policies
-- ============================================================================

BEGIN;

ALTER TABLE public.lessons
    ADD COLUMN IF NOT EXISTS sort_order INTEGER;

COMMENT ON COLUMN public.lessons.sort_order IS 'Chapter order within a module (1-5). NULL for legacy rows.';

COMMIT;
