-- ============================================================================
-- Migration 016: Nested rule groups (Phase 5A — database only)
-- ============================================================================
-- ADDITIVE: creates rule_groups and rule_nodes alongside the existing
-- scheme_rules table. No existing rows are modified, renamed, or dropped.
--
-- Design A: self-referencing rule_groups + rule_nodes.
--   rule_groups: tree structure (parent_group_id allows arbitrary nesting)
--   rule_nodes:  leaf rules and group references within a group
--
-- Existing scheme_rules data is migrated into the new structure:
--   1. One root group per scheme (parent_group_id = NULL, AND, order 0)
--   2. One child group per existing rule_group (preserving group_operator)
--   3. One rule_node per existing scheme_rules row (preserving all fields)
--
-- The application continues reading from scheme_rules until Phase 5B.
-- ============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. public.rule_groups
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rule_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scheme_id UUID NOT NULL REFERENCES public.schemes(id) ON DELETE CASCADE,
    parent_group_id UUID REFERENCES public.rule_groups(id) ON DELETE CASCADE,
    group_operator TEXT NOT NULL DEFAULT 'AND',
    group_order SMALLINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT rule_groups_operator_check CHECK (group_operator IN ('AND', 'OR'))
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. public.rule_nodes
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rule_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.rule_groups(id) ON DELETE CASCADE,
    node_type TEXT NOT NULL,

    -- Rule-specific (NULL for group nodes)
    field TEXT,
    operator TEXT,
    value JSONB,
    required BOOLEAN DEFAULT TRUE,
    description_en TEXT,
    description_kn TEXT,
    priority SMALLINT DEFAULT 0,

    -- Group-specific (NULL for rule nodes)
    child_group_id UUID REFERENCES public.rule_groups(id) ON DELETE CASCADE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT rule_nodes_type_check CHECK (node_type IN ('rule', 'group')),

    CONSTRAINT rule_nodes_operator_check CHECK (
        operator IN ('=', '!=', '>', '>=', '<', '<=', 'IN', 'NOT_IN', 'CONTAINS')
    ),

    CONSTRAINT rule_nodes_field_check CHECK (
        field IN (
            'age',
            'annualIncome',
            'applicantCategory',
            'district',
            'employmentType',
            'existingLoan',
            'gender',
            'govtEmployeeCategory',
            'hasExistingLpgConnection',
            'incomeTaxPayer',
            'isNRI',
            'isPoliticalOfficeHolder',
            'isRegisteredProfessional',
            'loanPurpose',
            'monthlyPension',
            'occupation',
            'ownsCultivableLand',
            'poorHousehold',
            'requestedLoanAmount',
            'state'
        )
    ),

    -- Rule nodes: must have field + operator, must NOT have child_group_id
    CONSTRAINT rule_nodes_rule_check CHECK (
        (node_type = 'rule' AND field IS NOT NULL AND operator IS NOT NULL AND child_group_id IS NULL)
        OR node_type = 'group'
    ),

    -- Group nodes: must have child_group_id, must NOT have rule-specific fields
    CONSTRAINT rule_nodes_group_check CHECK (
        (node_type = 'group' AND child_group_id IS NOT NULL AND field IS NULL AND operator IS NULL AND value IS NULL)
        OR node_type = 'rule'
    ),

    -- Value type check (mirrors scheme_rules)
    CONSTRAINT rule_nodes_value_type_check CHECK (
        value IS NULL OR jsonb_typeof(value) IN ('number', 'string', 'boolean', 'array')
    ),

    -- Value shape check (mirrors scheme_rules)
    CONSTRAINT rule_nodes_value_shape_check CHECK (
        value IS NULL
        OR (operator IN ('IN', 'NOT_IN') AND jsonb_typeof(value) = 'array')
        OR (operator = 'CONTAINS')
        OR (operator IN ('=', '!=', '>', '>=', '<', '<=') AND jsonb_typeof(value) <> 'array')
    )
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Indexes
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_rule_groups_scheme_id
    ON public.rule_groups(scheme_id);

CREATE INDEX IF NOT EXISTS idx_rule_groups_parent_group_id
    ON public.rule_groups(parent_group_id);

CREATE INDEX IF NOT EXISTS idx_rule_nodes_group_id
    ON public.rule_nodes(group_id);

CREATE INDEX IF NOT EXISTS idx_rule_nodes_child_group_id
    ON public.rule_nodes(child_group_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. RLS
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.rule_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rule_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rule_groups_select_active" ON public.rule_groups
    FOR SELECT TO anon, authenticated
    USING (
        scheme_id IN (
            SELECT s.id FROM public.schemes s WHERE s.status = 'active'
        )
    );

CREATE POLICY "rule_nodes_select_active" ON public.rule_nodes
    FOR SELECT TO anon, authenticated
    USING (
        group_id IN (
            SELECT rg.id FROM public.rule_groups rg
            WHERE rg.scheme_id IN (
                SELECT s.id FROM public.schemes s WHERE s.status = 'active'
            )
        )
    );

-- No client write path
REVOKE INSERT, UPDATE, DELETE ON public.rule_groups FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.rule_nodes FROM anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Data migration: scheme_rules → rule_groups + rule_nodes
-- ─────────────────────────────────────────────────────────────────────────────

-- Step 5.1: Create root group for each scheme
INSERT INTO public.rule_groups (scheme_id, parent_group_id, group_operator, group_order)
SELECT
    s.id,
    NULL,
    'AND',
    0
FROM public.schemes s;

-- Step 5.2: Create child groups for each existing rule_group
INSERT INTO public.rule_groups (scheme_id, parent_group_id, group_operator, group_order)
SELECT
    r.scheme_id,
    rg.id,
    r.group_operator,
    r.rule_group
FROM (
    SELECT DISTINCT scheme_id, rule_group, group_operator
    FROM public.scheme_rules
) r
JOIN public.rule_groups rg
    ON rg.scheme_id = r.scheme_id
    AND rg.parent_group_id IS NULL;

-- Step 5.3: Create rule nodes for each existing rule
INSERT INTO public.rule_nodes (
    id, group_id, node_type,
    field, operator, value, required,
    description_en, description_kn, priority
)
SELECT
    r.id,
    rg.id,
    'rule',
    r.field,
    r.operator,
    r.value,
    r.required,
    r.description_en,
    r.description_kn,
    r.priority
FROM public.scheme_rules r
JOIN public.rule_groups rg
    ON rg.scheme_id = r.scheme_id
    AND rg.parent_group_id IS NOT NULL
    AND rg.group_order = r.rule_group;

COMMIT;
