-- ============================================================================
-- Admin bootstrap — OPERATOR RUNBOOK, NOT A MIGRATION
-- ============================================================================
-- This file lives outside supabase/migrations/ on purpose.
--
-- `supabase db push` applies everything in that directory and records each file
-- in the migration ledger, keyed by its numeric prefix. Putting a data
-- operation there would (a) permanently consume a migration number for
-- environment-specific data, and (b) commit one specific user id to the
-- repository. Migration 011 states the intended method directly:
--
--   "Role records are created only by a trusted Supabase SQL / admin operation
--    (the first-admin bootstrap, which happens after authentication exists)."
--
-- So: run this in the Supabase dashboard SQL editor (or `psql`), substituting
-- your own value. It is idempotent.
--
-- ── Step 1. Find the auth user id ────────────────────────────────────────────
-- Sign in through the app (the header "Continue" button), then read the id from
-- the session endpoint in the browser console:
--
--     fetch('/api/auth/session').then(r => r.json()).then(console.log)
--
-- ── Step 2. Promote them ────────────────────────────────────────────────────
-- Run the statement below with that id.
--
-- ── Step 3. Remove access ────────────────────────────────────────────────────
-- To revoke an administrator, delete the row. There is no "demote" state:
--     DELETE FROM public.user_roles WHERE user_id = '<uuid>';
--
-- ── Why this cannot be done from the application ─────────────────────────────
-- public.user_roles has RLS enabled with ZERO policies and holds
-- `REVOKE ALL ... FROM anon, authenticated` (migration 011). There is no code
-- path — client, server or admin UI — by which a session can insert a role. That
-- is deliberate: it makes self-promotion structurally impossible rather than
-- merely discouraged, which is why the admin UI in this project contains no
-- "grant someone admin" control. Use the service role or the SQL editor only.
-- ============================================================================

-- Idempotent: ON CONFLICT DO NOTHING makes a repeat run a no-op.
INSERT INTO public.user_roles (user_id, role)
VALUES ('00000000-0000-0000-0000-000000000000', 'admin')
ON CONFLICT (user_id) DO NOTHING;

-- Verify. Expect exactly one row for the id you promoted.
SELECT user_id, role, created_at
FROM public.user_roles
ORDER BY created_at DESC;


-- ── Who currently holds the admin role ──────────────────────────────────────
-- Run this to audit the list. It is safe: it reads a table the application
-- cannot read at all.
--
-- SELECT user_id, role, created_at
-- FROM public.user_roles
-- WHERE role = 'admin';


-- ── Optional: promote by email, if you later add real authentication ────────
-- GramFinance has anonymous sign-in only, so there is no email to match on. The
-- statement below is the shape to use once real auth exists, and it is left here
-- deliberately commented out rather than silently unavailable:
--
-- INSERT INTO public.user_roles (user_id, role)
-- SELECT id, 'admin' FROM auth.users WHERE email = 'you@example.com'
-- ON CONFLICT (user_id) DO NOTHING;