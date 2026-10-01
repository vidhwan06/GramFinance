-- ============================================================================
-- Migration 026: Revoke EXECUTE on public.is_admin() from anon
-- ============================================================================
-- ── Why this exists ─────────────────────────────────────────────────────────
-- Migration 011 intended exactly one client grant:
--
--     REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
--     GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
--
-- and its own comment states the goal: "EXECUTE revoked from PUBLIC, granted
-- only to authenticated, so an anonymous caller cannot even invoke it."
--
-- That goal is not met on the live project. Supabase sets
-- ALTER DEFAULT PRIVILEGES for the public schema, so CREATE FUNCTION
-- automatically hands EXECUTE to anon, authenticated AND service_role.
-- The REVOKE above removed the PUBLIC grant but left anon's explicit grant
-- in place. A live probe confirms it:
--
--     POST /rest/v1/rpc/is_admin   as anon   -> 200  false   (UNEXPECTED)
--
-- The probe returns `false` rather than an error, which is how we know anon
-- still holds the privilege.
--
-- ── Actual impact: none today ───────────────────────────────────────────────
-- The function is harmless: SECURITY DEFINER, search_path = '', no parameters,
-- STABLE, read-only, returns BOOLEAN. With no session auth.uid() is NULL, so it
-- can only ever answer `false` for anon. Nothing in the repository calls it —
-- no `.rpc()` anywhere, and no SQL policy references it.
--
-- ── Why it still matters ────────────────────────────────────────────────────
-- It is a SECURITY DEFINER function exposed to an unauthenticated role for no
-- benefit, and it contradicts the documented model in 011 and AGENTS.md. The
-- privilege layer should say what the migration says.
--
-- ── Scope ───────────────────────────────────────────────────────────────────
--   * anon      — revoked. An anonymous caller must not invoke server helpers.
--   * PUBLIC    — revoked again (already done in 011; restated, idempotent).
--   * authenticated — KEPT. 011 documents it as the sole intended grant and the
--     future admin policies are written against it. It can only report the
--     CALLER's own admin status, so it discloses nothing about other users.
--     Revoke it too if the team prefers strict grant-on-demand; that is a
--     one-line follow-up, not a design change.
--   * service_role / owner — untouched, server-side execution path.
--
-- The function itself is preserved: admin policies arrive in a later phase.
--
-- This migration only removes a privilege. It adds no policy, disables no RLS
-- and modifies no data. It does not amend 011, which is already applied.
-- ============================================================================

BEGIN;

-- The actual fix: anon must not be able to invoke is_admin().
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;

-- Restate the PUBLIC position from 011. REVOKE of a privilege the role does
-- not hold is a no-op, so this is safe to re-run.
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;

-- Intended state, written out so the grant set is unambiguous:
-- authenticated may execute; everyone else is denied by omission.
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

COMMIT;
