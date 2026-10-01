-- ============================================================================
-- Migration 027: Revoke client access to fraud_checks / fraud_check_signals
-- ============================================================================
-- ── Why this exists ─────────────────────────────────────────────────────────
-- Migration 025 documented its intent in plain text:
--
--     -- No SELECT grants on fraud_checks or fraud_check_signals by default.
--
-- and revoked only INSERT, UPDATE and DELETE. Supabase's
-- ALTER DEFAULT PRIVILEGES hands ALL privileges on a new table to anon and
-- authenticated, so SELECT was never actually revoked. The comment and the
-- grant disagree.
--
-- Live probes against the deployed project, anon key:
--
--     GET /rest/v1/fraud_checks?select=id          -> 200  []   (grant HELD)
--     GET /rest/v1/fraud_check_signals?select=id   -> 200  []   (grant HELD)
--     GET /rest/v1/users?select=id                 -> 401  42501 (control)
--
-- The `users` control is the important one: a role WITHOUT the privilege is
-- rejected at the privilege layer. The two fraud tables answering 200 proves
-- anon still HOLDS SELECT and is being filtered only by the absence of an RLS
-- SELECT policy.
--
-- ── Actual impact: none today ───────────────────────────────────────────────
-- RLS is enabled on both tables and no SELECT policy exists, so anon receives
-- zero rows. This is a defence-in-depth gap, not a data leak. The tables are
-- also empty and the current POST /api/fraud/check never persists results.
--
-- ── Why it still matters ────────────────────────────────────────────────────
-- Only the policy layer is correct. If RLS were ever disabled by mistake, or a
-- later migration added a permissive SELECT policy without reconsidering anon,
-- every fraud check a user submitted would become world-readable — message
-- fragments, UPI identifiers, phone numbers. Grant and intent should agree
-- BEFORE someone depends on the omission.
--
-- ── Scope ───────────────────────────────────────────────────────────────────
--   * fraud_checks, fraud_check_signals — all client privileges removed.
--     Nothing in the repository reads or writes them: no `.from('fraud_checks')`
--     anywhere, and the fraud route runs the engine in memory. Server-side
--     code uses the anon key with the caller's session, so it would be subject
--     to these same revokes — there is no legitimate client access to preserve.
--   * fraud_signals — UNTOUCHED. It is reference data with a deliberate public
--     SELECT policy (025) and must stay readable.
--   * service_role — untouched. It is the seed/admin path and holds its own
--     grants.
--
-- RLS stays enabled; no policy is added; no data is modified. Applied after
-- 026. Does not amend 025, which is already applied.
-- ============================================================================

BEGIN;

-- The finding: anon still holds SELECT. Named explicitly so it is greppable
-- and so the fix for this migration is obvious at a glance.
REVOKE SELECT ON public.fraud_checks, public.fraud_check_signals
  FROM anon, authenticated;

-- Everything else default privileges handed out. 025 already removed
-- INSERT / UPDATE / DELETE; TRUNCATE, REFERENCES and TRIGGER were still
-- outstanding, and RLS does not cover TRUNCATE. REVOKE of a privilege a role
-- does not hold is a no-op, so this is safe to re-run.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.fraud_checks, public.fraud_check_signals
  FROM anon, authenticated;

COMMIT;
