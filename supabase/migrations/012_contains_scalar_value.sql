-- ============================================================================
-- Migration 012: Allow CONTAINS to take a scalar value
-- ============================================================================
-- Why this is needed
-- ------------------
-- Migration 011 added `scheme_rules_value_shape_check`, which required
-- IN / NOT_IN / CONTAINS to carry a JSONB ARRAY. That makes CONTAINS
-- unimplementable, for two independent reasons:
--
--   1. No applicant field in the closed registry is an array type. The registry
--      (features/schemes/eligibility/field-registry.ts) declares only number,
--      string and boolean. So the array branch of CONTAINS could never match an
--      applicant value, and the rule would resolve to UNKNOWN forever.
--   2. With a scalar applicant value and an array rule value there is no
--      sensible containment relation, so the engine correctly refuses.
--
-- Substring containment is the only meaningful CONTAINS for a text field such
-- as occupation, loanPurpose or state, and the Phase 4B specification lists
-- CONTAINS among the nine mandatory V1 operators. Shipping it as dead
-- capability would be worse than widening the constraint.
--
-- What changes
-- ------------
-- IN and NOT_IN still require an array, exactly as before. Scalar operators
-- still refuse an array. CONTAINS now accepts either:
--   * an array  -> list membership, forward compatible with a future
--                  array-typed applicant field
--   * a scalar  -> substring containment for text (or equality for a future
--                  scalar use)
--
-- This is a WIDENING of a CHECK constraint. It is strictly less restrictive,
-- touches no rows, and cannot invalidate anything already stored. No DROP TABLE,
-- no data modification.
--
-- The engine's behaviour for both shapes lives in
-- features/schemes/eligibility/rule-evaluator.ts and is covered by unit tests.
-- ============================================================================

BEGIN;

ALTER TABLE public.scheme_rules
    DROP CONSTRAINT IF EXISTS scheme_rules_value_shape_check;

ALTER TABLE public.scheme_rules
    ADD CONSTRAINT scheme_rules_value_shape_check CHECK (
        -- List operators: array required.
        (operator IN ('IN', 'NOT_IN') AND jsonb_typeof(value) = 'array')
        -- CONTAINS: array (list membership) or scalar (substring) both allowed.
        OR (operator = 'CONTAINS')
        -- Scalar operators: array refused.
        OR (operator IN ('=', '!=', '>', '>=', '<', '<=') AND jsonb_typeof(value) <> 'array')
    );

COMMIT;
