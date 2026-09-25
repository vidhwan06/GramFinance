-- ============================================================================
-- Migration 011: Scheme eligibility foundation (Phase 4A)
-- ============================================================================
-- Strictly ADDITIVE. This migration contains no DROP TABLE, no DROP COLUMN, no
-- TRUNCATE and no DELETE. tests/unit/schemes/migration-guard.test.ts asserts
-- that mechanically, because "additive" is a safety property, not a promise.
--
-- Adds:
--   * public.schemes.status          -- lifecycle state, drives public RLS
--   * public.scheme_rules            -- deterministic eligibility rules
--   * public.user_roles              -- authorization foundation for future admin
--   * public.is_admin()              -- SECURITY DEFINER helper for those policies
--
-- Deliberately NOT added (see Phase 4A decisions 2 and 6):
--   * slug           -- the existing route is [schemeId]; not needed yet
--   * updated_at     -- no update strategy or trigger exists to maintain it
--   * scheme_documents / scheme_sources -- required_documents, official_url and
--     last_verified already exist and a second source of truth is worse than
--     mild denormalisation
--
-- Does NOT implement the eligibility evaluator. It only guarantees that rule
-- rows are structurally valid so a bad row cannot be inserted at all.
-- ============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. schemes.status
-- ─────────────────────────────────────────────────────────────────────────────
-- A lifecycle state, distinct from scheme_sources.last_verified in the future:
--   status         = is this scheme published?
--   last_verified  = when were its facts last checked?
-- Both are needed. A scheme can be active but overdue for re-verification.
--
-- DEFAULT 'draft' is deliberate: any row inserted without an explicit status is
-- HIDDEN from the public catalogue until someone deliberately publishes it.
-- ADD COLUMN with a non-volatile default is metadata-only in PostgreSQL 11+,
-- so this is instant regardless of table size.
ALTER TABLE public.schemes
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.schemes'::regclass
          AND conname = 'schemes_status_check'
    ) THEN
        ALTER TABLE public.schemes
            ADD CONSTRAINT schemes_status_check
            CHECK (status IN ('draft', 'active', 'inactive', 'expired'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_schemes_status
    ON public.schemes(status);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Existing data: PM-KISAN stays DRAFT
-- ─────────────────────────────────────────────────────────────────────────────
-- The row added by migration 004 has last_verified = 2026-01-15, roughly eight
-- months before this migration. It is a real scheme, but its facts have not
-- been re-checked, and publishing it as `active` would present unverified
-- information as currently verified to the exact users least able to spot the
-- difference.
--
-- The row is therefore left at the 'draft' default deliberately. It is NOT
-- deleted, NOT edited, and its last_verified date is NOT touched. No
-- verification date is fabricated.
--
-- To publish it later: re-verify against https://pmkisan.gov.in/, update
-- last_verified, then set status = 'active'. That is a deliberate human step.
--
-- No UPDATE statement is required or issued here: the ADD COLUMN default
-- already placed the existing row at 'draft'. This is noted explicitly so a
-- future reader does not assume the status was set by an UPDATE that is
-- missing.

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. public.scheme_rules
-- ─────────────────────────────────────────────────────────────────────────────
-- The source of truth for eligibility. `schemes.target_groups` remains coarse
-- browse/filter metadata and MUST NOT be evaluated as a rule -- keeping the two
-- apart is what stops them becoming competing eligibility systems.
--
-- The `field` CHECK constraint below is the DATABASE half of the closed field
-- registry in features/schemes/eligibility/field-registry.ts. Enforcing it here
-- means a row referencing __proto__, constructor, prototype or is_admin cannot
-- be stored at all, even if application-side validation were bypassed.
-- The two lists are asserted identical by a unit test.
CREATE TABLE IF NOT EXISTS public.scheme_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ON DELETE CASCADE: deleting a scheme must not orphan its rules.
    scheme_id UUID NOT NULL REFERENCES public.schemes(id) ON DELETE CASCADE,

    -- Rule groups. Group 1 AND Group 1, or Group 1 OR Group 2, etc.
    rule_group SMALLINT NOT NULL DEFAULT 1,
    group_operator TEXT NOT NULL DEFAULT 'AND',

    rule_type TEXT NOT NULL DEFAULT 'eligibility',

    -- Closed field registry. Must stay identical to SCHEME_FIELD_NAMES.
    field TEXT NOT NULL,

    -- Fixed operator set. No executable expressions, ever.
    operator TEXT NOT NULL,

    -- JSONB rather than TEXT: IN / NOT_IN / CONTAINS need a real array, and
    -- delimited strings invite fragile, injection-prone parsing.
    --   scalar operators  -> number | string | boolean
    --   array operators   -> array of scalars
    value JSONB NOT NULL,

    -- A required rule that FAILS makes the scheme NOT_ELIGIBLE.
    -- A required rule that is UNKNOWN makes it POTENTIALLY_ELIGIBLE.
    required BOOLEAN NOT NULL DEFAULT TRUE,

    description_en TEXT,
    description_kn TEXT,

    -- Display / evaluation order within a group.
    priority SMALLINT NOT NULL DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()) NOT NULL,

    CONSTRAINT scheme_rules_field_check CHECK (
        field IN (
            'age',
            'annualIncome',
            'applicantCategory',
            'district',
            'employmentType',
            'existingLoan',
            'gender',
            'loanPurpose',
            'occupation',
            'requestedLoanAmount',
            'state'
        )
    ),

    CONSTRAINT scheme_rules_operator_check CHECK (
        operator IN ('=', '!=', '>', '>=', '<', '<=', 'IN', 'NOT_IN', 'CONTAINS')
    ),

    CONSTRAINT scheme_rules_group_operator_check CHECK (
        group_operator IN ('AND', 'OR')
    ),

    CONSTRAINT scheme_rules_rule_type_check CHECK (
        rule_type IN ('eligibility', 'loan_terms')
    ),

    CONSTRAINT scheme_rules_group_positive_check CHECK (rule_group >= 1),

    -- Only allow a JSONB type the operator set can actually consume.
    CONSTRAINT scheme_rules_value_type_check CHECK (
        jsonb_typeof(value) IN ('number', 'string', 'boolean', 'array')
    ),

    -- Array operators require an array; scalar operators must not receive one.
    -- Without this, `IN` against a scalar would silently evaluate to a
    -- meaningless result instead of being rejected.
    CONSTRAINT scheme_rules_value_shape_check CHECK (
        (operator IN ('IN', 'NOT_IN', 'CONTAINS') AND jsonb_typeof(value) = 'array')
        OR
        (operator IN ('=', '!=', '>', '>=', '<', '<=') AND jsonb_typeof(value) <> 'array')
    )
);

-- Covers loading a scheme's rules in group/priority order.
-- PostgreSQL does not index the referencing side of a foreign key, so this is
-- required rather than optional.
CREATE INDEX IF NOT EXISTS idx_scheme_rules_scheme_group
    ON public.scheme_rules(scheme_id, rule_group, priority);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. public.user_roles
-- ─────────────────────────────────────────────────────────────────────────────
-- Authorization foundation ONLY. There is no authentication UI in this project
-- yet, so nothing can read or write this table through the app today.
--
-- ── Why this is a separate table and not a column on public.users ───────────
-- Migration 008 grants authenticated users UPDATE on their OWN public.users row
-- (policy users_update_own, USING (auth.uid()) = id). Row-level security is
-- row-scoped, not column-scoped, so a `role` column on public.users would mean
-- any signed-in user could run:
--     UPDATE public.users SET role = 'admin' WHERE id = auth.uid()
-- and promote themselves. A separate table with no client policies makes that
-- structurally impossible rather than merely discouraged.
--
-- Role records are created only by a trusted Supabase SQL / admin operation
-- (the first-admin bootstrap, which happens after authentication exists).
CREATE TABLE IF NOT EXISTS public.user_roles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()) NOT NULL,

    CONSTRAINT user_roles_role_check CHECK (role IN ('admin'))
);

-- RLS enabled with ZERO policies.
-- Zero policies on an RLS-enabled table is deny-all: there is no permissive
-- policy for any role to match. Combined with the REVOKE below, no client --
-- anon or authenticated -- can read, insert, update or delete a role record.
-- Self-promotion has no code path at all, not even an incorrect one.
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.user_roles FROM anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. public.is_admin()
-- ─────────────────────────────────────────────────────────────────────────────
-- SECURITY DEFINER is REQUIRED here: without it the function would be subject to
-- user_roles' RLS, which denies everything, and the function would always
-- return false. Running as the owner lets it see the role rows.
--
-- Recursion: none. It reads user_roles, a table with no policies, and under
-- SECURITY DEFINER RLS does not apply to it. No policy will be written that
-- both calls is_admin() and is evaluated on user_roles.
--
-- Safety:
--   * STABLE          -- safe to call from an RLS policy, evaluated once/query
--   * search_path = '' -- nothing is resolvable from an attacker-influenced
--                        schema; public.user_roles and auth.uid() are both
--                        schema-qualified so nothing needs resolving at all
--   * no parameters   -- cannot be used to pass or modify anything
--   * returns BOOLEAN -- read-only by construction
--   * EXECUTE revoked from PUBLIC, granted only to authenticated, so an
--     anonymous caller cannot even invoke it
--
-- No policy currently USES this function. Admin read/write policies arrive in a
-- later phase, once authentication exists and the first admin has been
-- bootstrapped. It is created now so the authorization foundation is complete
-- and reviewable.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = (SELECT auth.uid())
          AND role = 'admin'
    );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. RLS: public scheme reads expose ONLY active schemes
-- ─────────────────────────────────────────────────────────────────────────────
-- This REPLACES the migration 008 policy. That is a TIGHTENING, not a weakening:
--   before: USING (true)                        -- every scheme, any status
--   after:  USING (status = 'active')            -- published schemes only
-- Draft, inactive and expired schemes become invisible to anon and to
-- authenticated non-admins. Future admin policies will read all statuses.
ALTER TABLE public.scheme_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "schemes_select_public" ON public.schemes;
CREATE POLICY "schemes_select_active" ON public.schemes
    FOR SELECT TO anon, authenticated
    USING ( status = 'active' );

-- Rules of a non-active scheme are not publicly readable, even though the rules
-- themselves are not secret. The EXISTENCE of an unreleased scheme stays
-- private.
--
-- The sub-select is a semi-join, so it is evaluated once rather than per row.
-- It also inherits schemes' own RLS, which is a simple status check and never
-- references scheme_rules, so there is no recursion.
DROP POLICY IF EXISTS "scheme_rules_select_active" ON public.scheme_rules;
CREATE POLICY "scheme_rules_select_active" ON public.scheme_rules
    FOR SELECT TO anon, authenticated
    USING (
        scheme_id IN (
            SELECT s.id FROM public.schemes s WHERE s.status = 'active'
        )
    );

-- Reference data is written only by the service role (seed.sql, admin tooling),
-- which bypasses RLS. No client write path exists.
REVOKE INSERT, UPDATE, DELETE ON public.scheme_rules FROM anon, authenticated;
GRANT SELECT ON public.scheme_rules TO anon, authenticated;

COMMIT;
