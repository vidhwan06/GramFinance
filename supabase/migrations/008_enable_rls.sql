-- ============================================================================
-- Migration 008: Enable Row Level Security + least-privilege policies
-- ============================================================================
-- APPLY IMMEDIATELY AFTER 007, BEFORE ANY APPLICATION CODE QUERIES THESE
-- TABLES. Enabling RLS on a table that application code already reads will
-- break that code, because every query must be covered by a policy.
--
-- ── How the two layers interact (read this before debugging) ─────────────────
--   * Missing GRANT  -> "permission denied for table ..."  (hard error)
--   * Missing POLICY -> zero rows returned, HTTP 200       (SILENT)
-- RLS filters silently. An empty list from Supabase is far more often a
-- missing policy than a broken query. Check pg_policies first.
--
-- ── Deliberately NOT enabled: FORCE ROW LEVEL SECURITY ──────────────────────
-- Without FORCE, the table owner (postgres / supabase_admin) and any role with
-- BYPASSRLS (service_role) bypass these policies. That is required so that
-- migrations and seed.sql can still run. The consequence, stated plainly:
-- these policies defend against the anon key -- which is public and ships in
-- the browser bundle -- and against clients generally. They do NOT defend
-- against a leaked service_role key, which can read and write everything.
-- Treat the service role key as a root credential.
--
-- ── Policy matrix ───────────────────────────────────────────────────────────
--   lessons         SELECT              anon + authenticated
--   schemes         SELECT              anon + authenticated
--   fraud_patterns  SELECT              anon + authenticated
--   quizzes         SELECT              authenticated only
--   users           SELECT/INSERT/UPDATE own row only, authenticated
--   feedback        INSERT/SELECT       own rows only, authenticated
-- Everything not listed is denied. Nine policies total.
-- ============================================================================

BEGIN;

-- ── 1. Enable RLS on all six tables ──────────────────────────────────────────
ALTER TABLE public.users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schemes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback       ENABLE ROW LEVEL SECURITY;

-- ── 2. Table-level grants ────────────────────────────────────────────────────
-- Stated explicitly rather than relying on Supabase's default privileges.
-- Grants are checked BEFORE RLS, so this is a second and independent lock:
-- RLS alone would not stop a write to a table the role still holds INSERT on.
REVOKE ALL ON public.users, public.feedback FROM anon;

REVOKE INSERT, UPDATE, DELETE
  ON public.lessons, public.quizzes, public.schemes, public.fraud_patterns
  FROM anon, authenticated;

GRANT SELECT
  ON public.lessons, public.schemes, public.fraud_patterns
  TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON public.users   TO authenticated;
GRANT SELECT, INSERT            ON public.feedback TO authenticated;

-- Reference data (lessons, quizzes, schemes, fraud_patterns) is written only by
-- the service role via seed.sql or admin tooling. No client write path exists.

-- ── 3. Public reference data ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "lessons_select_public" ON public.lessons;
CREATE POLICY "lessons_select_public" ON public.lessons
  FOR SELECT TO anon, authenticated
  USING ( true );

DROP POLICY IF EXISTS "schemes_select_public" ON public.schemes;
CREATE POLICY "schemes_select_public" ON public.schemes
  FOR SELECT TO anon, authenticated
  USING ( true );

DROP POLICY IF EXISTS "fraud_patterns_select_public" ON public.fraud_patterns;
CREATE POLICY "fraud_patterns_select_public" ON public.fraud_patterns
  FOR SELECT TO anon, authenticated
  USING ( true );

-- ── 4. quizzes: authenticated read only ─────────────────────────────────────
-- Not public, because questions_en / questions_kn JSONB embeds the correct
-- answers. This raises the bar to "must be signed in" but does NOT prevent
-- cheating: if quizzes are graded client-side the answers reach the browser
-- regardless. Real fix is server-side grading via a route handler.
DROP POLICY IF EXISTS "quizzes_select_authenticated" ON public.quizzes;
CREATE POLICY "quizzes_select_authenticated" ON public.quizzes
  FOR SELECT TO authenticated
  USING ( true );

-- ── 5. users: strictly self-service ─────────────────────────────────────────
-- `(SELECT auth.uid())` rather than bare `auth.uid()`: the subquery form is
-- evaluated once per query as a cached InitPlan instead of once per row.
DROP POLICY IF EXISTS "users_select_own" ON public.users;
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT TO authenticated
  USING ( ( SELECT auth.uid() ) = id );

-- WITH CHECK on INSERT is what forces a client to claim only its own id.
-- A user cannot create a profile row belonging to somebody else.
DROP POLICY IF EXISTS "users_insert_own" ON public.users;
CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT TO authenticated
  WITH CHECK ( ( SELECT auth.uid() ) = id );

-- USING restricts which existing rows may be updated; WITH CHECK prevents
-- reassigning a row to a different owner mid-update.
DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE TO authenticated
  USING      ( ( SELECT auth.uid() ) = id )
  WITH CHECK ( ( SELECT auth.uid() ) = id );

-- No DELETE policy, by design. Account removal goes through Supabase Auth; the
-- ON DELETE CASCADE in migration 001 then removes the profile. Granting users
-- DELETE on their own row would let them orphan a live auth account.

-- ── 6. feedback: submit and read your own, append-only ──────────────────────
-- Because user_id is nullable, `auth.uid() = NULL` evaluates to NULL, which
-- fails the policy. A client therefore cannot INSERT an unattributed row to
-- escape the ownership check.
DROP POLICY IF EXISTS "feedback_insert_own" ON public.feedback;
CREATE POLICY "feedback_insert_own" ON public.feedback
  FOR INSERT TO authenticated
  WITH CHECK ( ( SELECT auth.uid() ) = user_id );

DROP POLICY IF EXISTS "feedback_select_own" ON public.feedback;
CREATE POLICY "feedback_select_own" ON public.feedback
  FOR SELECT TO authenticated
  USING ( ( SELECT auth.uid() ) = user_id );

-- No UPDATE or DELETE: feedback is an immutable record. This also stops a user
-- editing or removing what they previously submitted. Moderation and deletion
-- of feedback happen via the service role.

COMMIT;
