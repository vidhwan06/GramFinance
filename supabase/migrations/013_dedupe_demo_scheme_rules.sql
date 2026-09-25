-- ============================================================================
-- Migration 013: Remove duplicate demo scheme_rules rows
-- ============================================================================
-- ── The problem ─────────────────────────────────────────────────────────────
-- public.scheme_rules holds three identical copies of every authored DEMO
-- fixture rule, so the scheme detail page rendered each condition three times.
--
-- Measured on the live project before this migration:
--     DEMO_SCHEME_001 -> 12 rows for 4 authored rules
--     3 x  age              >=  18
--     3 x  annualIncome     <=  500000
--     3 x  occupation       IN  ["student","farmer"]
--     3 x  applicantCategory NOT_IN ["unverified"]
--
-- ── Why they existed ───────────────────────────────────────────────────────
-- The original seed-demo.sql inserted rules with `ON CONFLICT DO NOTHING` and
-- no conflict target. scheme_rules has no unique constraint other than its `id`
-- primary key, and that id is `gen_random_uuid()` -- a fresh value on every
-- insert. So a re-run of the seed could never conflict: each execution appended
-- a fresh copy of every rule. The seed was run three times, so every rule
-- exists three times.
--
-- The seed has since been made idempotent (it clears the demo schemes' own
-- rules before re-inserting them), so this cannot recur. This migration cleans
-- up the rows that were already created.
--
-- ── Scope: DEMO FIXTURES ONLY ──────────────────────────────────────────────
-- The delete is restricted to schemes whose official_url is under
-- https://example.invalid/. That is the RFC 2606 reserved domain used by the
-- fabricated fixtures, and it is not a real programme.
--
-- Real scheme data is deliberately NOT deduplicated. A real scheme may
-- legitimately hold two rules that share a field, operator and value but
-- differ in their authored description, and collapsing those would destroy
-- information. Duplicates are a real data problem in exactly one place -- a
-- seed that was not idempotent -- so it is fixed at that source, not papered
-- over with a general dedupe rule.
--
-- PM-KISAN and every other real record are untouched by this statement.
--
-- ── Which copy is kept ─────────────────────────────────────────────────────
-- The row with the lowest id, i.e. the earliest inserted. That is arbitrary but
-- deterministic, so re-running the migration is a no-op and cannot oscillate.
--
-- This migration is idempotent: a second run matches nothing and deletes
-- nothing.
-- ============================================================================

BEGIN;

DELETE FROM public.scheme_rules AS duplicate
USING public.schemes AS scheme
WHERE duplicate.scheme_id = scheme.id
  -- Demo fixtures only. Never touches real scheme data.
  AND scheme.official_url LIKE 'https://example.invalid/%'
  -- Keep the earliest copy of each distinct authored rule.
  AND EXISTS (
      SELECT 1
      FROM public.scheme_rules AS kept
      WHERE kept.scheme_id = duplicate.scheme_id
        AND kept.rule_group = duplicate.rule_group
        AND kept.field = duplicate.field
        AND kept.operator = duplicate.operator
        AND kept.value = duplicate.value
        AND kept.required = duplicate.required
        AND kept.priority = duplicate.priority
        AND kept.id < duplicate.id
  );

COMMIT;
