-- ============================================================================
-- Migration 007: Index foreign key columns
-- ============================================================================
-- PostgreSQL does NOT automatically create an index on the referencing side of
-- a foreign key (only on the referenced primary key). Both columns indexed here
-- are evaluated on every row by the row-level security policies added in
-- migration 008:
--
--   * quizzes.lesson_id   -- "show me the quiz for this lesson"
--   * feedback.user_id    -- "show me my own feedback"  (users_select_own,
--                            feedback_select_own, feedback_insert_own)
--
-- Without these indexes every policy check degrades to a sequential scan.
--
-- This migration is a pure performance change: it grants no privileges, enables
-- no policies and alters no data, so it is safe to apply at any point in the
-- sequence. Keeping it separate from 001-006 preserves those files as the
-- authored table definitions.
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_quizzes_lesson_id
    ON public.quizzes(lesson_id);

CREATE INDEX IF NOT EXISTS idx_feedback_user_id
    ON public.feedback(user_id);
