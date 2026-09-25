-- ============================================================================
-- Migration 010: Revoke SELECT on public.quizzes from anon
-- ============================================================================
-- ── Why this exists ─────────────────────────────────────────────────────────
-- Migration 008 granted anon SELECT on lessons, schemes and fraud_patterns,
-- and revoked INSERT/UPDATE/DELETE on all four reference tables -- but it never
-- revoked SELECT on `quizzes`. Supabase's default privileges grant ALL on new
-- tables in the public schema, so anon silently retained SELECT there.
--
-- This was caught by a live probe against the deployed project:
--
--     GET /rest/v1/users    -> 401  42501 insufficient_privilege   (expected)
--     GET /rest/v1/quizzes  -> 200  rows=0                         (UNEXPECTED)
--
-- The `users` result proves the privilege layer rejects anon. The `quizzes`
-- result proves anon still HOLDS the grant and is being filtered by the RLS
-- policy `quizzes_select_authenticated` (which is scoped TO authenticated),
-- so anon matches no policy and receives zero rows.
--
-- ── Actual impact: none today ───────────────────────────────────────────────
-- No quiz data is readable by anonymous callers. RLS is doing its job. This is
-- a defence-in-depth gap, not a live data leak: the privilege layer and the
-- policy layer disagree, and only the policy layer is currently correct.
--
-- ── Why it still matters ───────────────────────────────────────────────────
-- If RLS were ever disabled on `quizzes` by mistake, or a future migration adds
-- a permissive SELECT policy without thinking about `anon`, the answers in
-- questions_en / questions_kn become world-readable. The correct answer is to
-- make the privilege layer match the intent, so a policy mistake is not the
-- only thing standing between anon and the answers.
--
-- This migration STRENGTHENS access. It revokes a privilege and adds no policy.
-- It does not modify migration 008, which has already been applied to the live
-- project -- amending an applied migration would break migration history.
-- ============================================================================

BEGIN;

-- Belt-and-braces: include anon alongside authenticated, since both are
-- meant to lose INSERT/UPDATE/DELETE here. Idempotent.
REVOKE INSERT, UPDATE, DELETE ON public.quizzes FROM anon, authenticated;

-- The actual fix. anon must not hold SELECT on quizzes.
REVOKE SELECT ON public.quizzes FROM anon;

-- The intended access path, restated so it is obvious this is deliberate:
-- authenticated reads quizzes, and only authenticated.
GRANT SELECT ON public.quizzes TO authenticated;

-- Reference data still has no client write path. Writes go through the service
-- role (seed.sql / admin tooling), which bypasses RLS and holds its own grants.
REVOKE INSERT, UPDATE, DELETE ON public.lessons, public.schemes,
                              public.fraud_patterns FROM anon, authenticated;

GRANT SELECT ON public.lessons, public.schemes, public.fraud_patterns
    TO anon, authenticated;

COMMIT;
