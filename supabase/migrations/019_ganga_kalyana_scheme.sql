-- ============================================================================
-- Migration 019: Ganga Kalyana Scheme (Individual Irrigation Component)
-- ============================================================================
-- Karnataka government scheme for SC small/marginal farmers.
-- Official source: https://adcl.karnataka.gov.in/27/ganga-kalyana-scheme/en
--
-- Eligibility (ROOT AND):
--   ├── caste = SC
--   ├── isFarmer = true
--   ├── landHoldingAcres >= 1.5
--   └── landHoldingAcres <= 5
--
-- Benefit information (district-dependent):
--   Bengaluru Urban, Bengaluru Rural, Kolar, Chikkaballapura,
--   Tumakuru and Ramanagara:
--     - Unit cost: ₹4.5 lakh
--     - Subsidy: ₹4 lakh
--     - Term loan: ₹50,000
--   Other districts:
--     - Unit cost: ₹3.5 lakh
--     - Subsidy: ₹3 lakh
--     - Term loan: ₹50,000
-- ============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Insert scheme row
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.schemes (
    name_en,
    name_kn,
    description_en,
    description_kn,
    target_groups,
    states,
    required_documents,
    official_url,
    last_verified,
    status
) VALUES (
    'Ganga Kalyana Scheme (Individual Irrigation)',
    'ಗಂಗಾ ಕಲ್ಯಾಣ ಯೋಜನೆ (ವ್ಯತ್ಯಾಸತ್ಮಕ ನೀರಾವರಿ)',
    'Individual irrigation scheme for SC small and marginal farmers in Karnataka. Provides assistance for borewell, pump set/accessories and electrification. Eligibility: SC farmer with 1.5 to 5 acres land holding. Benefit varies by district: 6 districts get ₹4.5L unit cost (₹4L subsidy + ₹50k loan), other districts get ₹3.5L unit cost (₹3L subsidy + ₹50k loan). This is a preliminary assessment, not an official eligibility determination.',
    'ಕರ್ನಾಟಕದ ಎಸ್‌ಸಿ ಸಣ್ಣ ಮತ್ತು ವರ್ಗಿಕೆ ರೈತರಿಗೆ ವ್ಯತ್ಯಾಸತ್ಮಕ ನೀರಾವರಿ ಯೋಜನೆ. ಬೋರ್ವೆಲ್, ಪಂಪ್ ಸೆಟ್/ಅunutर್ಯುಪಕರಣಗಳು ಮತ್ತು ವൈದ್ಯುತೀಕರಣದತ್ತಿ ಸಹಾಯ. ಅರ್ಹತೆ: 1.5ರಿಂದ 5 ಎಕರ್ ಭೂಮಿ ಹೊಂದಿರುವ ಎಸ್‌ಸಿ ರೈತ. ಲಾಭ ಜಿಲ್ಲೆಗನುಸಾರ ಅಲ graft款: 6 ಜಿಲ್ಲೆಗಳಿಗೆ ₹4.5ಲಕ್ಷ युनಿಟ್ ಕೊಸ್ಟ್ (₹4ಲಕ್ಷ ಸಬ್ಸಿಡಿ + ₹50,000 ಸಾಲ), ఇతర ಜಿಲ್ಲೆಗಳಿಗೆ ₹3.5ಲಕ್ಷ युनಿಟ್ ಕೊಸ್ಟ್ (₹3ಲಕ್ಷ ಸಬ್ಸಿಡಿ + ₹50,000 ಸಾಲ). ಇದು ಪ್ರಾಥಮಿಕ ಮೌಲ್ಯಮಾಪನೆ, ಅಧಿಕೃತ ಅರ್ಹತಾ ನಿರ್ಧಾರವಲ್ಲ.',
    ARRAY['farmer', 'small_holder', 'marginal_farmer'],
    ARRAY['Karnataka'],
    ARRAY[]::TEXT[],
    'https://adcl.karnataka.gov.in/27/ganga-kalyana-scheme/en',
    '2026-09-27',
    'active'
) ON CONFLICT (official_url) DO UPDATE SET
    name_en             = EXCLUDED.name_en,
    name_kn             = EXCLUDED.name_kn,
    description_en      = EXCLUDED.description_en,
    description_kn      = EXCLUDED.description_kn,
    target_groups       = EXCLUDED.target_groups,
    states              = EXCLUDED.states,
    required_documents  = EXCLUDED.required_documents,
    last_verified       = EXCLUDED.last_verified;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Create rule tree using rule_groups + rule_nodes (Phase 5B architecture)
-- ─────────────────────────────────────────────────────────────────────────────
-- Tree structure:
--   ROOT AND (group_order=0)
--     ├── caste = SC
--     ├── isFarmer = true
--     ├── landHoldingAcres >= 1.5
--     └── landHoldingAcres <= 5

-- Step 1: Create root group
INSERT INTO public.rule_groups (scheme_id, parent_group_id, group_operator, group_order)
SELECT s.id, NULL, 'AND', 0
FROM public.schemes s WHERE s.official_url = 'https://adcl.karnataka.gov.in/27/ganga-kalyana-scheme/en';

-- Step 2: Add 4 rule nodes to root group
-- 2.1 caste = SC (priority 0)
INSERT INTO public.rule_nodes (group_id, node_type, field, operator, value, required, description_en, description_kn, priority)
SELECT rg.id, 'rule', 'caste', '=', '"SC"', true,
    'Applicant must belong to Scheduled Caste (SC).',
    'ಅರ್ಜಿದಾರರು ಅನಯಕಾರ್ಯ ಜಾತಿ (SC) ಕುರಿತವರು ಆಗಿರಬೇಕು.',
    0
FROM public.rule_groups rg
JOIN public.schemes s ON s.id = rg.scheme_id
WHERE s.official_url = 'https://adcl.karnataka.gov.in/27/ganga-kalyana-scheme/en' AND rg.parent_group_id IS NULL;

-- 2.2 isFarmer = true (priority 1)
INSERT INTO public.rule_nodes (group_id, node_type, field, operator, value, required, description_en, description_kn, priority)
SELECT rg.id, 'rule', 'isFarmer', '=', 'true', true,
    'Applicant must be a farmer.',
    'ಅರ್ಜಿದಾರರು ರೈತನಾಗಿರಬೇಕು.',
    1
FROM public.rule_groups rg
JOIN public.schemes s ON s.id = rg.scheme_id
WHERE s.official_url = 'https://adcl.karnataka.gov.in/27/ganga-kalyana-scheme/en' AND rg.parent_group_id IS NULL;

-- 2.3 landHoldingAcres >= 1.5 (priority 2)
INSERT INTO public.rule_nodes (group_id, node_type, field, operator, value, required, description_en, description_kn, priority)
SELECT rg.id, 'rule', 'landHoldingAcres', '>=', '1.5', true,
    'Applicant must have at least 1.5 acres of land.',
    'ಅರ್ಜಿದಾರರಿಗೆ ಕನಿಷ್ಟ 1.5 ಎಕರ್ ಭೂಮಿ இருக்கಬೇಕು.',
    2
FROM public.rule_groups rg
JOIN public.schemes s ON s.id = rg.scheme_id
WHERE s.official_url = 'https://adcl.karnataka.gov.in/27/ganga-kalyana-scheme/en' AND rg.parent_group_id IS NULL;

-- 2.4 landHoldingAcres <= 5 (priority 3)
INSERT INTO public.rule_nodes (group_id, node_type, field, operator, value, required, description_en, description_kn, priority)
SELECT rg.id, 'rule', 'landHoldingAcres', '<=', '5', true,
    'Applicant must have at most 5 acres of land.',
    'ಅರ್ಜಿದಾರರಿಗೆ ಗ متعددة 5 ಎಕರ್ ಭೂಮಿ இருக்கಬೇಕು.',
    3
FROM public.rule_groups rg
JOIN public.schemes s ON s.id = rg.scheme_id
WHERE s.official_url = 'https://adcl.karnataka.gov.in/27/ganga-kalyana-scheme/en' AND rg.parent_group_id IS NULL;

COMMIT;