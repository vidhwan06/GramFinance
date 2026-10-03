-- ============================================================================
-- Migration 031: Allow administrators to read submitted feedback
-- ============================================================================
-- STRICTLY ADDITIVE. No table is altered, no grant is changed, no existing
-- policy is modified or dropped.
--
-- Adds exactly one policy:
--   * feedback_select_admin  -- SELECT on public.feedback, TO authenticated,
--                               USING (is_admin())
--
-- ── Why this is the "later phase" migration 011 promised ──────────────────────
-- Migration 011 created public.user_roles and public.is_admin() and said so in
-- its own comments:
--
--   "No policy currently USES this function. Admin read/write policies arrive
--    in a later phase, once authentication exists and the first admin has been
--    bootstrapped."
--
-- Authentication now exists (anonymous sign-in, migration-era F1) and this is
-- that phase. The admin feedback dashboard is the first consumer, so this is the
-- first admin-scoped read policy in the project.
--
-- ── Why this cannot let an ordinary user read all feedback ───────────────────
-- PostgreSQL combines PERMISSIVE policies for a command with OR. `feedback` has
-- exactly two SELECT policies after this migration:
--
--     feedback_select_own     USING (auth.uid() = user_id)
--     feedback_select_admin   USING (is_admin())
--
-- Both must be satisfied for the new one to matter, and `is_admin()` returns
-- false for anyone without a row in user_roles. The evaluated result for a
-- non-admin is therefore unchanged: `auth.uid() = user_id`. A signed-in
-- non-admin sees exactly the rows they already saw, and cannot widen that by
-- supplying any query parameter — this policy is in the database, not in the
-- request.
--
-- ── Why submission is untouched ──────────────────────────────────────────────
-- INSERT is governed by `feedback_insert_own` (migration 008), whose WITH CHECK
-- still requires `auth.uid() = user_id`. This migration adds FOR SELECT only, so
-- it cannot affect POST /api/feedback at all — including for an administrator,
-- who still cannot insert a row attributed to somebody else.
--
-- No UPDATE or DELETE policy is added, so feedback stays an immutable record.
-- Migration 008's reasoning for that still holds: a user must not be able to
-- edit or delete what they submitted.
--
-- ── No grant changes needed ──────────────────────────────────────────────────
-- `authenticated` already holds SELECT on public.feedback (migration 008), and
-- `anon` holds none (migration 008 REVOKEd it). This policy is `TO
-- authenticated`, so it is never evaluated for an anonymous caller. Migration 026
-- additionally revoked EXECUTE on is_admin() from anon and from PUBLIC, so an
-- unauthenticated client cannot even invoke the helper to probe whether it is
-- an admin — it cannot distinguish "no feedback" from "not an admin" by asking.
--
-- The application still performs an explicit is_admin() check before querying
-- (lib/admin/require-admin.ts). That is not redundant: without it, RLS would
-- answer a non-admin's request with HTTP 200 and an EMPTY list, which is
-- indistinguishable from "there is no feedback yet". The explicit check turns
-- that silent failure into an honest 403.
--
-- ── Index note ───────────────────────────────────────────────────────────────
-- The rating counts behind the dashboard's distribution run as filtered counts.
-- There is no index on feedback.rating, so each is a scan of a table that is
-- small by design (one row per submission, capped by the 5/min per-user
-- submission limit). An index is deliberately NOT added here: this migration
-- exists to grant one narrowly-scoped read, and an unused index is not part of
-- that.
-- ============================================================================

BEGIN;

DROP POLICY IF EXISTS "feedback_select_admin" ON public.feedback;
CREATE POLICY "feedback_select_admin" ON public.feedback
    FOR SELECT TO authenticated
    USING ( ( SELECT public.is_admin() ) );

COMMIT;