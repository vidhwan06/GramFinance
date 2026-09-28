-- ============================================================================
-- Migration 025: Fraud Checker RLS Policies
-- ============================================================================
-- Enables Row Level Security on the fraud checker tables and creates
-- least-privilege policies following the conventions established in
-- migration 008.
--
-- Security model:
--   * fraud_signals  = application-controlled reference data. Readable
--                      by everyone but writable ONLY by the server (via
--                      seed.sql / admin tooling). No client write path.
--   * fraud_checks   = per-check results. Created by the API route
--                      handler server-side. Clients cannot directly
--                      INSERT through the public anon interface.
--   * fraud_check_signals = join records, created server-side only.
--
-- The current POST /api/fraud/check implementation does NOT persist
-- results to the database -- it runs the deterministic engine and
-- returns the result directly. These policies protect the tables if
-- persistence is added in a future phase, and protect the signal
-- registry from client-side tampering now.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Enable RLS on all three fraud tables
-- ============================================================================

ALTER TABLE public.fraud_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_check_signals ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. Table-level grants
-- ============================================================================
-- Follows migration 008 convention: REVOKE first, then grant explicitly.
--
-- fraud_signals: Reference data. Read-only for anon+authenticated.
--   No INSERT/UPDATE/DELETE for anon or authenticated clients.
--   Seeded by service role via seed.sql.
--
-- fraud_checks: Created server-side if persistence is added.
--   No client write access.
--
-- fraud_check_signals: Created server-side. No client write access.

-- Revoke all write permissions from anon and authenticated on fraud tables
REVOKE INSERT, UPDATE, DELETE
  ON public.fraud_checks, public.fraud_signals, public.fraud_check_signals
FROM anon, authenticated;

-- Grant SELECT on fraud_signals (reference data) to everyone
-- This matches the convention for fraud_patterns in migration 008
GRANT SELECT ON public.fraud_signals TO anon, authenticated;

-- No SELECT grants on fraud_checks or fraud_check_signals by default.
-- These are operational tables whose access model depends on future
-- persistence requirements. Grant SELECT only when a specific
-- read path is needed.

-- ============================================================================
-- 3. Policies
-- ============================================================================

-- ============================================================================
-- fraud_signals: Read-only reference data
-- ============================================================================
-- Anyone can read the signal registry (it's a lookup table of known
-- fraud indicators). No one can modify it through the public API.

DROP POLICY IF EXISTS "fraud_signals_select_public" ON public.fraud_signals;
CREATE POLICY "fraud_signals_select_public" ON public.fraud_signals
  FOR SELECT TO anon, authenticated
  USING (true);

-- No INSERT, UPDATE, DELETE policies exist for fraud_signals.
-- The table is application-controlled and seeded by service role only.

-- ============================================================================
-- fraud_checks: Server-side operational data
-- ============================================================================
-- No SELECT policy by default. If future phases add a read path,
-- add an owner-scoped policy (auth.uid() = user_id) after adding
-- a user_id column.
--
-- No INSERT/UPDATE/DELETE policies exist for fraud_checks.
-- Data is written server-side if persistence is added.

-- ============================================================================
-- fraud_check_signals: Server-side operational data
-- ============================================================================
-- No SELECT policy by default.
-- No INSERT/UPDATE/DELETE policies exist.
-- Data is written server-side if persistence is added.

COMMIT;
