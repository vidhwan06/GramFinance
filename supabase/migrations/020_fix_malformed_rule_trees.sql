-- ============================================================================
-- Migration 018: Fix malformed rule trees for PM-KISAN, PMUY, PM Vishwakarma
-- ============================================================================
-- The live database has malformed rule_groups/rule_nodes for PM-KISAN and PMUY
-- (root groups empty, child groups orphaned) and for PM Vishwakarma
-- (missing link to loan OR group, duplicate MUDRA rules in root).
--
-- PM-KISAN and PMUY have correct flat rules in scheme_rules and should use
-- those. Their malformed trees cause empty-root evaluation = eligible (wrong).
--
-- PM Vishwakarma uses tree only (no flat rules). Its tree needs:
--   1. Remove 2 duplicate MUDRA rules from root group
--   2. Add missing group node linking root to loan OR group
-- ============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- PM-KISAN: Remove malformed rule tree (use flat scheme_rules instead)
-- ─────────────────────────────────────────────────────────────────────────────
DELETE FROM public.rule_nodes
WHERE group_id IN (
    SELECT id FROM public.rule_groups WHERE scheme_id = (
        SELECT id FROM public.schemes WHERE official_url = 'https://pmkisan.gov.in/'
    )
);

DELETE FROM public.rule_groups
WHERE scheme_id = (
    SELECT id FROM public.schemes WHERE official_url = 'https://pmkisan.gov.in/'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- PMUY: Remove malformed rule tree (use flat scheme_rules instead)
-- ─────────────────────────────────────────────────────────────────────────────
DELETE FROM public.rule_nodes
WHERE group_id IN (
    SELECT id FROM public.rule_groups WHERE scheme_id = (
        SELECT id FROM public.schemes WHERE official_url = 'https://pmuy.gov.in/'
    )
);

DELETE FROM public.rule_groups
WHERE scheme_id = (
    SELECT id FROM public.schemes WHERE official_url = 'https://pmuy.gov.in/'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- PM Vishwakarma: Fix tree (idempotent)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    v_scheme_id UUID;
    root_id UUID;
    loan_or_id UUID;
BEGIN
    -- Get scheme ID
    SELECT id INTO v_scheme_id 
    FROM public.schemes s 
    WHERE official_url = 'https://www.pmvishwakarma.gov.in/';
    
    IF v_scheme_id IS NULL THEN
        RAISE NOTICE 'PM Vishwakarma scheme not found, skipping tree fix';
        RETURN;
    END IF;

    -- Get root group
    SELECT id INTO root_id
    FROM public.rule_groups rg
    WHERE rg.scheme_id = v_scheme_id AND rg.parent_group_id IS NULL;

    IF root_id IS NULL THEN
        RAISE NOTICE 'PM Vishwakarma root group not found, skipping tree fix';
        RETURN;
    END IF;

    -- Get loan OR child group
    SELECT id INTO loan_or_id
    FROM public.rule_groups rg
    WHERE rg.scheme_id = v_scheme_id AND rg.parent_group_id = root_id AND rg.group_operator = 'OR';

    IF loan_or_id IS NULL THEN
        RAISE NOTICE 'PM Vishwakarma loan OR group not found, skipping tree fix';
        RETURN;
    END IF;

    -- Step 1: Remove 2 duplicate MUDRA rules from root group
    DELETE FROM public.rule_nodes
    WHERE group_id = root_id
      AND field IN ('similarGovtLoanType', 'similarGovtLoanFullyRepaid')
      AND value IN ('"mudra"'::jsonb, 'true'::jsonb);

    -- Step 2: Add missing root -> loan OR group node (idempotent)
    IF NOT EXISTS (
        SELECT 1 FROM public.rule_nodes
        WHERE group_id = root_id
          AND node_type = 'group'
          AND child_group_id = loan_or_id
    ) THEN
        INSERT INTO public.rule_nodes (group_id, node_type, child_group_id, priority)
        VALUES (root_id, 'group', loan_or_id, 8);
    END IF;

    RAISE NOTICE 'PM Vishwakarma tree fix completed';
END $$;

COMMIT;