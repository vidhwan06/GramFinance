-- ============================================================================
-- Migration 028: Close the remaining default-privilege gaps (F6, F7, F8)
-- ============================================================================
-- Three related defects, all the same root cause, all found by re-reading the
-- migrations against what Supabase actually does on a hosted project.
--
-- ── The root cause ──────────────────────────────────────────────────────────
-- Supabase applies `ALTER DEFAULT PRIVILEGES ... GRANT ALL ON TABLES TO anon,
-- authenticated` for the public schema. Every table therefore arrives with ALL
-- privileges for both client roles, and migrations must take the privileges
-- away one by one. Three did not get taken away:
--
--   1. TRUNCATE (and REFERENCES, TRIGGER) on eleven tables. Migration 027
--      identified this exact class for two tables and fixed only those two.
--   2. GRANT SELECT on rule_groups / rule_nodes, which have SELECT *policies*
--      but were never explicitly granted.
--   3. EXECUTE on handle_new_user(), revoked from PUBLIC but not from the two
--      roles the default privileges hand it to.
--
-- ── Why TRUNCATE matters when RLS is on ─────────────────────────────────────
-- RLS does NOT cover TRUNCATE. Postgres applies it like a table-level command
-- with no policy to consult, so holding TRUNCATE means holding the ability to
-- empty the table outright. On `public.users` that is a total loss of every
-- profile in the database, reachable by any authenticated session and invisible
-- to every policy. The tables most exposed are `users` and `feedback`, because
-- migration 008 granted `SELECT, INSERT, UPDATE` to `authenticated` and revoked
-- nothing else, and because `anon` got `REVOKE ALL` on exactly those two - so
-- `anon` is clean while `authenticated` is not.
--
-- ── Scope and safety ────────────────────────────────────────────────────────
--   * Revokes are from `anon` and `authenticated` ONLY. `service_role` and the
--     table owner are untouched: they are the seed/admin path, and
--     `service_role` has BYPASSRLS anyway.
--   * No RLS policy is created, altered or dropped. This migration changes the
--     privilege layer only.
--   * No data is inserted, updated or deleted.
--   * REVOKE of a privilege a role does not hold is a no-op, so this is safe to
--     re-run and safe to apply to a project that is already partly fixed.
--   * No client write path exists for any of these tables, so nothing in the
--     application can be relying on TRUNCATE, REFERENCES or TRIGGER.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. F6: remove TRUNCATE / REFERENCES / TRIGGER from the client roles
-- ============================================================================
-- Stated as one statement over the whole table set rather than a subset, so a
-- table added later by another migration is covered by re-running this. The two
-- fraud tables named in 027 are included deliberately: restating an already
-- correct REVOKE is a no-op and keeps the invariant in one place.

REVOKE TRUNCATE, REFERENCES, TRIGGER
  ON public.users,
     public.lessons,
     public.quizzes,
     public.schemes,
     public.fraud_patterns,
     public.feedback,
     public.scheme_rules,
     public.user_roles,
     public.rule_groups,
     public.rule_nodes,
     public.fraud_checks,
     public.fraud_signals,
     public.fraud_check_signals
  FROM anon, authenticated;

-- The write privileges are restated for completeness on the two tables whose
-- grants came from migration 008 rather than from default privileges, so that
-- reading this file alone is enough to see the full client-side write surface
-- is nil. No-ops if already correct.
REVOKE INSERT, UPDATE, DELETE
  ON public.users, public.feedback
  FROM anon;

-- ============================================================================
-- 2. F7: make the rule_groups / rule_nodes SELECT grant explicit
-- ============================================================================
-- Both tables have a SELECT policy that is currently live only because of the
-- default privileges described above:
--
--     rule_groups_select_active   USING (scheme_id IN (active schemes))
--     rule_nodes_select_active    USING (group_id IN (active rule_groups))
--
-- `011_scheme_eligibility_foundation.sql` granted SELECT on the sibling table
-- `scheme_rules` explicitly but `016_nested_rule_groups.sql` only revoked
-- writes. The grant and the intent therefore disagree, and the SELECT policies
-- are relying on the same mechanism that migrations 010, 026 and 027 each had
-- to correct elsewhere.
--
-- This is NOT a widening. Both roles already hold SELECT through the default
-- privileges; making it explicit changes nothing about what is readable. If
-- the defaults were ever tightened these tables would silently return zero rows
-- with HTTP 200 - RLS filters silently - and every eligibility result would
-- quietly degrade to "not enough information". Granting explicitly removes that
-- dependency on an unrelated project setting.
--
-- The RLS policies are untouched, so anon still cannot see a draft scheme's
-- groups or nodes. The eligibility engine reads these tables through the anon
-- key server client, so the grant is required for the feature to work at all.
--
-- Mirrors the existing convention at 011:289 exactly.

GRANT SELECT ON public.rule_groups TO anon, authenticated;
GRANT SELECT ON public.rule_nodes  TO anon, authenticated;

-- Writes remain revoked. Restated because the grant above sits next to it and
-- the pairing is what makes the intent readable.
REVOKE INSERT, UPDATE, DELETE ON public.rule_groups FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.rule_nodes  FROM anon, authenticated;

-- ============================================================================
-- 3. F8: revoke EXECUTE on handle_new_user() from anon and authenticated
-- ============================================================================
-- `009_auto_profile_trigger.sql` states the intent:
--
--     -- PostgREST exposes the public schema over RPC, so revoke EXECUTE
--     -- from PUBLIC as defence in depth.
--
-- and then revokes from PUBLIC only. That is the same gap migration 026 found
-- on `is_admin()` and fixed: revoking from PUBLIC does not remove the explicit
-- grant the default privileges handed `anon` and `authenticated` at CREATE
-- FUNCTION time. The documented intent and the actual privilege state disagreed,
-- so this states the same intent in a way that is actually true.
--
-- This is a SECURITY DEFINER function, so an unexpected EXECUTE grant is
-- exactly the case least privilege matters most. It is also, in practice,
-- inert: it is `RETURNS trigger`, so PostgREST cannot call it over RPC at all.
-- The point is that the privilege state should not depend on that remaining
-- true.
--
-- ── Why the trigger keeps working ───────────────────────────────────────────
-- Trigger EXECUTE privilege is checked when the TRIGGER is created, not when it
-- fires. PostgreSQL does not re-check it per row. The trigger
-- `on_auth_user_created` already exists, so revoking from these roles cannot
-- affect it, and the function is additionally SECURITY DEFINER: it runs as its
-- owner regardless of who inserted into `auth.users`. GoTrue connects as
-- `supabase_auth_admin`, which is neither `anon` nor `authenticated` and is
-- not touched here.
--
-- `service_role` keeps its grant from 009 for administrative use.

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

-- Restate the position from 009. Idempotent.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;

-- Unchanged: the administrative path and the documented intent in 009.
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

COMMIT;

-- ============================================================================
-- Post-apply verification (run as a privileged role, not as anon)
-- ============================================================================
-- 1. No client role may hold TRUNCATE anywhere:
--      SELECT table_name, grantee FROM information_schema.role_table_grants
--       WHERE privilege_type = 'TRUNCATE'
--         AND table_schema = 'public'
--         AND grantee IN ('anon', 'authenticated');
--    -> expect zero rows.
--
-- 2. rule_groups / rule_nodes SELECT granted, and RLS still filtering:
--      SELECT grantee, privilege_type FROM information_schema.role_table_grants
--       WHERE table_name IN ('rule_groups', 'rule_nodes')
--         AND grantee IN ('anon', 'authenticated');
--    -> expect SELECT for both roles.
--    Then, with the anon key:
--      GET /rest/v1/rule_groups   -> 200 with rows for ACTIVE schemes only
--      GET /rest/v1/rule_nodes    -> 200 with rows for ACTIVE schemes only
--    A draft scheme's group/node must never appear. If a draft fixture is
--    loaded from supabase/seed-demo.sql, confirm its id is absent from both.
--
-- 3. handle_new_user() must not be executable by a client role:
--      SELECT has_function_privilege('anon', 'public.handle_new_user()', 'EXECUTE');
--      SELECT has_function_privilege('authenticated', 'public.handle_new_user()', 'EXECUTE');
--    -> expect false, false.
--
-- 4. The trigger must still fire. Sign in anonymously via the app and confirm a
--    matching row appears in public.users (the F1 live integration test asserts
--    exactly this in "auto-creates the public.users profile via the migration 009
--    trigger").
-- ============================================================================