-- ============================================================================
-- Migration 019: PM Vishwakarma complete rule tree
-- ============================================================================
-- Creates the correct nested rule tree for PM Vishwakarma.
-- Idempotent: safe to run on fresh DB, malformed DB, or already-correct DB.
--
-- Tree structure:
--   ROOT AND (group_order=0)
--     ├── 8 rule nodes (priorities 0-7)
--     └── group node → Loan OR (priority 8)
--         LOAN OR (group_order=9)
--         ├── rule node: hasSimilarGovtLoanLast5Years = false (priority 0)
--         ├── group node → MUDRA AND (priority 1)
--         │   MUDRA AND (group_order=0)
--         │   ├── rule node: similarGovtLoanType = 'mudra' (priority 0)
--         │   └── rule node: similarGovtLoanFullyRepaid = true (priority 1)
--         └── group node → PM SVANidhi AND (priority 2)
--             PM SVANidhi AND (group_order=1)
--             ├── rule node: similarGovtLoanType = 'pm_svanidhi' (priority 0)
--             └── rule node: similarGovtLoanFullyRepaid = true (priority 1)
--
-- Totals: 4 rule_groups, 13 rule-type nodes, 3 group-type nodes, 16 total rule_nodes
-- ============================================================================

BEGIN;

DO $$
DECLARE
    v_scheme_id UUID;
    root_id UUID;
    loan_or_id UUID;
    mudra_id UUID;
    svanidhi_id UUID;
    rule_count INT;
BEGIN
    -- ──────────────────────────────────────────────────────────────────────────
    -- 1. FIND OR CREATE SCHEME
    -- ──────────────────────────────────────────────────────────────────────────
    SELECT id INTO v_scheme_id
    FROM public.schemes AS s
    WHERE s.official_url = 'https://www.pmvishwakarma.gov.in/';

    IF v_scheme_id IS NULL THEN
        RAISE NOTICE 'PM Vishwakarma scheme not found, skipping tree creation';
        RETURN;
    END IF;

    -- ──────────────────────────────────────────────────────────────────────────
    -- 2. FIND OR CREATE ROOT GROUP (AND, group_order=0, parent_group_id=NULL)
    -- ──────────────────────────────────────────────────────────────────────────
    SELECT id INTO root_id
    FROM public.rule_groups AS rg
    WHERE rg.scheme_id = v_scheme_id AND rg.parent_group_id IS NULL;

    IF root_id IS NULL THEN
        INSERT INTO public.rule_groups (scheme_id, parent_group_id, group_operator, group_order)
        VALUES (v_scheme_id, NULL, 'AND', 0)
        RETURNING id INTO root_id;
    END IF;

    -- ──────────────────────────────────────────────────────────────────────────
    -- 3. FIND OR CREATE LOAN OR GROUP (OR, group_order=9, parent=root)
    -- ──────────────────────────────────────────────────────────────────────────
    SELECT id INTO loan_or_id
    FROM public.rule_groups AS rg
    WHERE rg.scheme_id = v_scheme_id AND rg.parent_group_id = root_id AND rg.group_operator = 'OR';

    IF loan_or_id IS NULL THEN
        INSERT INTO public.rule_groups (scheme_id, parent_group_id, group_operator, group_order)
        VALUES (v_scheme_id, root_id, 'OR', 9)
        RETURNING id INTO loan_or_id;
    END IF;

    -- ──────────────────────────────────────────────────────────────────────────
    -- 4. FIND OR CREATE MUDRA AND GROUP (AND, group_order=0, parent=loan_or)
    -- ──────────────────────────────────────────────────────────────────────────
    SELECT id INTO mudra_id
    FROM public.rule_groups AS rg
    WHERE rg.scheme_id = v_scheme_id AND rg.parent_group_id = loan_or_id AND rg.group_order = 0;

    IF mudra_id IS NULL THEN
        INSERT INTO public.rule_groups (scheme_id, parent_group_id, group_operator, group_order)
        VALUES (v_scheme_id, loan_or_id, 'AND', 0)
        RETURNING id INTO mudra_id;
    END IF;

    -- ──────────────────────────────────────────────────────────────────────────
    -- 5. FIND OR CREATE PM SVANIDHI AND GROUP (AND, group_order=1, parent=loan_or)
    -- ──────────────────────────────────────────────────────────────────────────
    SELECT id INTO svanidhi_id
    FROM public.rule_groups AS rg
    WHERE rg.scheme_id = v_scheme_id AND rg.parent_group_id = loan_or_id AND rg.group_order = 1;

    IF svanidhi_id IS NULL THEN
        INSERT INTO public.rule_groups (scheme_id, parent_group_id, group_operator, group_order)
        VALUES (v_scheme_id, loan_or_id, 'AND', 1)
        RETURNING id INTO svanidhi_id;
    END IF;

    -- ──────────────────────────────────────────────────────────────────────────
    -- 6. ENSURE ROOT -> LOAN OR GROUP NODE EXISTS (priority 8)
    -- ──────────────────────────────────────────────────────────────────────────
    IF NOT EXISTS (
        SELECT 1 FROM public.rule_nodes
        WHERE group_id = root_id
          AND node_type = 'group'
          AND child_group_id = loan_or_id
    ) THEN
        INSERT INTO public.rule_nodes (group_id, node_type, child_group_id, priority)
        VALUES (root_id, 'group', loan_or_id, 8);
    END IF;

    -- ──────────────────────────────────────────────────────────────────────────
    -- 7. ENSURE 8 ROOT RULE NODES EXIST (priorities 0-7)
    -- ──────────────────────────────────────────────────────────────────────────

    -- 7.1 age >= 18 (priority 0)
    IF NOT EXISTS (SELECT 1 FROM public.rule_nodes WHERE group_id = root_id AND node_type = 'rule' AND field = 'age' AND operator = '>=' AND value = '18'::jsonb) THEN
        INSERT INTO public.rule_nodes (group_id, node_type, field, operator, value, required, description_en, description_kn, priority)
        VALUES (root_id, 'rule', 'age', '>=', '18'::jsonb, TRUE,
            'You must be at least 18 years old.',
            'ನೀವು ಕನಿಷ್ಟ 18 ವರ್ಷ ವಯಸ್ಸಿನವರಾಗಿರಬೇಕು.',
            0);
    END IF;

    -- 7.2 trade IN [18 trades] (priority 1)
    IF NOT EXISTS (SELECT 1 FROM public.rule_nodes WHERE group_id = root_id AND node_type = 'rule' AND field = 'trade' AND operator = 'IN' AND value = '["carpenter","boat_maker","armourer","blacksmith","hammer_tool_kit_maker","locksmith","goldsmith","potter","sculptor_stone_worker","cobbler_footwear_artisan","mason","basket_mat_broom_coir_weaver","doll_toy_maker","barber","garland_maker","washerman","tailor","fishing_net_maker"]'::jsonb) THEN
        INSERT INTO public.rule_nodes (group_id, node_type, field, operator, value, required, description_en, description_kn, priority)
        VALUES (root_id, 'rule', 'trade', 'IN',
            '["carpenter","boat_maker","armourer","blacksmith","hammer_tool_kit_maker","locksmith","goldsmith","potter","sculptor_stone_worker","cobbler_footwear_artisan","mason","basket_mat_broom_coir_weaver","doll_toy_maker","barber","garland_maker","washerman","tailor","fishing_net_maker"]'::jsonb,
            TRUE,
            'Your occupation must be one of the 18 traditional trades covered by PM Vishwakarma.',
            'ನಿಮ್ಮ ವೃತ್ತಿಯು PM Vishwakarma ಅಡಿಯಲ್ಲಿರುವ 18 ಸಾಂಪ್ರದಾಯಿಕ ವೃತ್ತಿಗಳಲ್ಲಿ ಒಂದಾಗಿರಬೇಕು.',
            1);
    END IF;

    -- 7.3 worksWithHandsAndTools = true (priority 2)
    IF NOT EXISTS (SELECT 1 FROM public.rule_nodes WHERE group_id = root_id AND node_type = 'rule' AND field = 'worksWithHandsAndTools' AND operator = '=' AND value = 'true'::jsonb) THEN
        INSERT INTO public.rule_nodes (group_id, node_type, field, operator, value, required, description_en, description_kn, priority)
        VALUES (root_id, 'rule', 'worksWithHandsAndTools', '=', 'true'::jsonb, TRUE,
            'You must work with your hands and tools in the relevant trade.',
            'ನೀವು ಸಂಬಂಧಿತ ವೃತ್ತಿಯಲ್ಲಿ ನಿಮ್ಮ ಕೈ ಮತ್ತು ಉಪಕರಣಗಳಿಂದ ಕೆಲಸ ಮಾಡಬೇಕು.',
            2);
    END IF;

    -- 7.4 selfEmployed = true (priority 3)
    IF NOT EXISTS (SELECT 1 FROM public.rule_nodes WHERE group_id = root_id AND node_type = 'rule' AND field = 'selfEmployed' AND operator = '=' AND value = 'true'::jsonb) THEN
        INSERT INTO public.rule_nodes (group_id, node_type, field, operator, value, required, description_en, description_kn, priority)
        VALUES (root_id, 'rule', 'selfEmployed', '=', 'true'::jsonb, TRUE,
            'You must work on a self-employed basis.',
            'ನೀವು ಸ್ವಾಯತ್ತ ಉದ್ಯೋಗದ ಆಧಾರದ ಮೇಲೆ ಕೆಲಸ ಮಾಡಬೇಕು.',
            3);
    END IF;

    -- 7.5 worksInUnorganisedSector = true (priority 4)
    IF NOT EXISTS (SELECT 1 FROM public.rule_nodes WHERE group_id = root_id AND node_type = 'rule' AND field = 'worksInUnorganisedSector' AND operator = '=' AND value = 'true'::jsonb) THEN
        INSERT INTO public.rule_nodes (group_id, node_type, field, operator, value, required, description_en, description_kn, priority)
        VALUES (root_id, 'rule', 'worksInUnorganisedSector', '=', 'true'::jsonb, TRUE,
            'Your work must be in the unorganised sector.',
            'ನಿಮ್ಮ ಕೆಲಸವು ಅಸಂಘಟಿತ ಕ್ಷೇತ್ರದಲ್ಲಿರಬೇಕು.',
            4);
    END IF;

    -- 7.6 engagedInTrade = true (priority 5)
    IF NOT EXISTS (SELECT 1 FROM public.rule_nodes WHERE group_id = root_id AND node_type = 'rule' AND field = 'engagedInTrade' AND operator = '=' AND value = 'true'::jsonb) THEN
        INSERT INTO public.rule_nodes (group_id, node_type, field, operator, value, required, description_en, description_kn, priority)
        VALUES (root_id, 'rule', 'engagedInTrade', '=', 'true'::jsonb, TRUE,
            'You must be engaged in the trade when you register.',
            'ನೀವು ನೋಂದಣಿ ಮಾಡುವಾಗ ವೃತ್ತಿಯಲ್ಲಿ ತೊಡಗಿರಬೇಕು.',
            5);
    END IF;

    -- 7.7 familyMemberAlreadyBeneficiary = false (priority 6)
    IF NOT EXISTS (SELECT 1 FROM public.rule_nodes WHERE group_id = root_id AND node_type = 'rule' AND field = 'familyMemberAlreadyBeneficiary' AND operator = '=' AND value = 'false'::jsonb) THEN
        INSERT INTO public.rule_nodes (group_id, node_type, field, operator, value, required, description_en, description_kn, priority)
        VALUES (root_id, 'rule', 'familyMemberAlreadyBeneficiary', '=', 'false'::jsonb, TRUE,
            'Only one member of a family can receive benefits under PM Vishwakarma.',
            'ಕುಟುಂಬದ ಒಬ್ಬ ಸದಸ್ಯರು ಮಾತ್ರ PM Vishwakarma ಅಡಿಯಲ್ಲಿ ಪ್ರಯೋಜನ ಪಡೆಯಬಲ್ಲರು.',
            6);
    END IF;

    -- 7.8 governmentServiceOrFamilyMember = false (priority 7)
    IF NOT EXISTS (SELECT 1 FROM public.rule_nodes WHERE group_id = root_id AND node_type = 'rule' AND field = 'governmentServiceOrFamilyMember' AND operator = '=' AND value = 'false'::jsonb) THEN
        INSERT INTO public.rule_nodes (group_id, node_type, field, operator, value, required, description_en, description_kn, priority)
        VALUES (root_id, 'rule', 'governmentServiceOrFamilyMember', '=', 'false'::jsonb, TRUE,
            'People in government service and their family members are not eligible.',
            'ಸರ್ಕಾರಿ ಸೇವೆಯಲ್ಲಿರುವವರು ಮತ್ತು ಅವರ ಕುಟುಂಬದ ಸದಸ್ಯರಿಗೆ ಅರ್ಹತೆ ಇಲ್ಲ.',
            7);
    END IF;

    -- ──────────────────────────────────────────────────────────────────────────
    -- 8. ENSURE LOAN OR GROUP NODES EXIST
    -- ──────────────────────────────────────────────────────────────────────────

    -- 8.1 hasSimilarGovtLoanLast5Years = false (priority 0)
    IF NOT EXISTS (SELECT 1 FROM public.rule_nodes WHERE group_id = loan_or_id AND node_type = 'rule' AND field = 'hasSimilarGovtLoanLast5Years' AND operator = '=' AND value = 'false'::jsonb) THEN
        INSERT INTO public.rule_nodes (group_id, node_type, field, operator, value, required, description_en, description_kn, priority)
        VALUES (loan_or_id, 'rule', 'hasSimilarGovtLoanLast5Years', '=', 'false'::jsonb, TRUE,
            'You must meet the scheme rules for similar government loans taken during the previous five years.',
            'ನೀವು ಕಳೆದ ಐದು ವರ್ಷಗಳಲ್ಲಿ ತೆಗೆದುಕೊಂಡ ಹೋಲಿಕೆಯ ಸರ್ಕಾರಿ ಸಾಲಗಳ ಬಗ್ಗೆ ಯೋಜನೆಯ ನಿಯಮಗಳನ್ನು ಪೂರೈಸಬೇಕು.',
            0);
    END IF;

    -- 8.2 Loan OR -> MUDRA group node (priority 1)
    IF NOT EXISTS (
        SELECT 1 FROM public.rule_nodes
        WHERE group_id = loan_or_id
          AND node_type = 'group'
          AND child_group_id = mudra_id
    ) THEN
        INSERT INTO public.rule_nodes (group_id, node_type, child_group_id, priority)
        VALUES (loan_or_id, 'group', mudra_id, 1);
    END IF;

    -- 8.3 Loan OR -> PM SVANidhi group node (priority 2)
    IF NOT EXISTS (
        SELECT 1 FROM public.rule_nodes
        WHERE group_id = loan_or_id
          AND node_type = 'group'
          AND child_group_id = svanidhi_id
    ) THEN
        INSERT INTO public.rule_nodes (group_id, node_type, child_group_id, priority)
        VALUES (loan_or_id, 'group', svanidhi_id, 2);
    END IF;

    -- ──────────────────────────────────────────────────────────────────────────
    -- 9. ENSURE MUDRA AND GROUP RULE NODES EXIST
    -- ──────────────────────────────────────────────────────────────────────────

    -- 9.1 similarGovtLoanType = 'mudra' (priority 0)
    IF NOT EXISTS (SELECT 1 FROM public.rule_nodes WHERE group_id = mudra_id AND node_type = 'rule' AND field = 'similarGovtLoanType' AND operator = '=' AND value = '"mudra"'::jsonb) THEN
        INSERT INTO public.rule_nodes (group_id, node_type, field, operator, value, required, description_en, description_kn, priority)
        VALUES (mudra_id, 'rule', 'similarGovtLoanType', '=', '"mudra"'::jsonb, TRUE,
            'Fully repaid MUDRA loans are covered by the scheme eligibility exception.',
            'ಪೂರ್ತಿ ಮರುಪಾವತಿ ಮಾಡಿದ MUDRA ಸಾಲಗಳು ಯೋಜನೆಯ ಅರ್ಹತೆ ವಿನಾಯಿತಿಯಡಿಯಲ್ಲಿವೆ.',
            0);
    END IF;

    -- 9.2 similarGovtLoanFullyRepaid = true (priority 1)
    IF NOT EXISTS (SELECT 1 FROM public.rule_nodes WHERE group_id = mudra_id AND node_type = 'rule' AND field = 'similarGovtLoanFullyRepaid' AND operator = '=' AND value = 'true'::jsonb) THEN
        INSERT INTO public.rule_nodes (group_id, node_type, field, operator, value, required, description_en, description_kn, priority)
        VALUES (mudra_id, 'rule', 'similarGovtLoanFullyRepaid', '=', 'true'::jsonb, TRUE,
            'The MUDRA loan must have been fully repaid.',
            'MUDRA ಸಾಲವು ಪೂರ್ತಿ ಮರುಪಾವತಿ ಮಾಡಲ್ಪಟ್ಟಿರಬೇಕು.',
            1);
    END IF;

    -- ──────────────────────────────────────────────────────────────────────────
    -- 10. ENSURE PM SVANIDHI AND GROUP RULE NODES EXIST
    -- ──────────────────────────────────────────────────────────────────────────

    -- 10.1 similarGovtLoanType = 'pm_svanidhi' (priority 0)
    IF NOT EXISTS (SELECT 1 FROM public.rule_nodes WHERE group_id = svanidhi_id AND node_type = 'rule' AND field = 'similarGovtLoanType' AND operator = '=' AND value = '"pm_svanidhi"'::jsonb) THEN
        INSERT INTO public.rule_nodes (group_id, node_type, field, operator, value, required, description_en, description_kn, priority)
        VALUES (svanidhi_id, 'rule', 'similarGovtLoanType', '=', '"pm_svanidhi"'::jsonb, TRUE,
            'Fully repaid PM SVANidhi loans are covered by the scheme eligibility exception.',
            'ಪೂರ್ತಿ ಮರುಪಾವತಿ ಮಾಡಿದ PM SVANidhi ಸಾಲಗಳು ಯೋಜನೆಯ ಅರ್ಹತೆ ವಿನಾಯಿತಿಯಡಿಯಲ್ಲಿವೆ.',
            0);
    END IF;

    -- 10.2 similarGovtLoanFullyRepaid = true (priority 1)
    IF NOT EXISTS (SELECT 1 FROM public.rule_nodes WHERE group_id = svanidhi_id AND node_type = 'rule' AND field = 'similarGovtLoanFullyRepaid' AND operator = '=' AND value = 'true'::jsonb) THEN
        INSERT INTO public.rule_nodes (group_id, node_type, field, operator, value, required, description_en, description_kn, priority)
        VALUES (svanidhi_id, 'rule', 'similarGovtLoanFullyRepaid', '=', 'true'::jsonb, TRUE,
            'The PM SVANidhi loan must have been fully repaid.',
            'PM SVANidhi ಸಾಲವು ಪೂರ್ತಿ ಮರುಪಾವತಿ ಮಾಡಲ್ಪಟ್ಟಿರಬೇಕು.',
            1);
    END IF;

    RAISE NOTICE 'PM Vishwakarma complete rule tree created/verified';
END $$;

COMMIT;