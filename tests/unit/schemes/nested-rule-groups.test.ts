import { describe, it, expect } from 'vitest';
import { readMigration, readSqlFile } from '../../helpers/sql';

/**
 * Phase 5A: Nested rule groups — database infrastructure tests.
 *
 * Verifies:
 * 1. New tables exist in the migration
 * 2. Existing scheme_rules is preserved
 * 3. Constraints prevent invalid node structures
 * 4. RLS policies are in place
 * 5. Indexes exist
 * 6. Data migration preserves all existing rules
 */

const MIGRATION = readMigration('016_nested_rule_groups.sql');

describe('migration 016: nested rule groups', () => {
  it('exists and is non-empty', () => {
    expect(MIGRATION.length).toBeGreaterThan(0);
  });

  it('creates rule_groups table', () => {
    expect(MIGRATION).toMatch(/CREATE TABLE IF NOT EXISTS public\.rule_groups/);
  });

  it('creates rule_nodes table', () => {
    expect(MIGRATION).toMatch(/CREATE TABLE IF NOT EXISTS public\.rule_nodes/);
  });

  it('does not drop or rename scheme_rules', () => {
    expect(MIGRATION).not.toMatch(/DROP TABLE.*scheme_rules/i);
    expect(MIGRATION).not.toMatch(/ALTER TABLE.*scheme_rules.*RENAME/i);
  });

  it('preserves existing scheme_rules data', () => {
    // The migration should only INSERT into new tables, not modify scheme_rules
    expect(MIGRATION).not.toMatch(/DELETE\s+FROM\s+public\.scheme_rules/i);
    expect(MIGRATION).not.toMatch(/UPDATE\s+public\.scheme_rules/i);
  });
});

describe('rule_groups constraints', () => {
  it('has group_operator check constraint', () => {
    expect(MIGRATION).toMatch(/rule_groups_operator_check/);
    expect(MIGRATION).toMatch(/group_operator\s+IN\s+\('AND',\s*'OR'\)/);
  });

  it('has self-referencing parent_group_id', () => {
    expect(MIGRATION).toMatch(/parent_group_id.*REFERENCES.*public\.rule_groups/i);
  });

  it('has ON DELETE CASCADE for parent_group_id', () => {
    expect(MIGRATION).toMatch(/parent_group_id.*ON DELETE CASCADE/i);
  });
});

describe('rule_nodes constraints', () => {
  it('has node_type check constraint', () => {
    expect(MIGRATION).toMatch(/rule_nodes_type_check/);
    expect(MIGRATION).toMatch(/node_type\s+IN\s+\('rule',\s*'group'\)/);
  });

  it('has operator check constraint', () => {
    expect(MIGRATION).toMatch(/rule_nodes_operator_check/);
    expect(MIGRATION).toMatch(/operator\s+IN/);
  });

  it('has field check constraint', () => {
    expect(MIGRATION).toMatch(/rule_nodes_field_check/);
  });

  it('has rule node validation (field + operator required, no child_group_id)', () => {
    expect(MIGRATION).toMatch(/rule_nodes_rule_check/);
  });

  it('has group node validation (child_group_id required, no rule fields)', () => {
    expect(MIGRATION).toMatch(/rule_nodes_group_check/);
  });

  it('has value type check', () => {
    expect(MIGRATION).toMatch(/rule_nodes_value_type_check/);
  });

  it('has value shape check', () => {
    expect(MIGRATION).toMatch(/rule_nodes_value_shape_check/);
  });
});

describe('indexes', () => {
  it('has index on rule_groups.scheme_id', () => {
    expect(MIGRATION).toMatch(/idx_rule_groups_scheme_id/);
  });

  it('has index on rule_groups.parent_group_id', () => {
    expect(MIGRATION).toMatch(/idx_rule_groups_parent_group_id/);
  });

  it('has index on rule_nodes.group_id', () => {
    expect(MIGRATION).toMatch(/idx_rule_nodes_group_id/);
  });

  it('has index on rule_nodes.child_group_id', () => {
    expect(MIGRATION).toMatch(/idx_rule_nodes_child_group_id/);
  });
});

describe('RLS', () => {
  it('enables RLS on rule_groups', () => {
    expect(MIGRATION).toMatch(/ALTER TABLE public\.rule_groups ENABLE ROW LEVEL SECURITY/);
  });

  it('enables RLS on rule_nodes', () => {
    expect(MIGRATION).toMatch(/ALTER TABLE public\.rule_nodes ENABLE ROW LEVEL SECURITY/);
  });

  it('has SELECT policy for active schemes on rule_groups', () => {
    expect(MIGRATION).toMatch(/rule_groups_select_active/);
    expect(MIGRATION).toMatch(/status\s*=\s*'active'/);
  });

  it('has SELECT policy for active schemes on rule_nodes', () => {
    expect(MIGRATION).toMatch(/rule_nodes_select_active/);
  });

  it('revokes write access from anon/authenticated', () => {
    expect(MIGRATION).toMatch(/REVOKE INSERT, UPDATE, DELETE ON public\.rule_groups FROM anon, authenticated/);
    expect(MIGRATION).toMatch(/REVOKE INSERT, UPDATE, DELETE ON public\.rule_nodes FROM anon, authenticated/);
  });
});

describe('data migration', () => {
  it('creates root groups for each scheme', () => {
    expect(MIGRATION).toMatch(/INSERT INTO public\.rule_groups[\s\S]*SELECT[\s\S]*FROM public\.schemes/);
  });

  it('creates child groups for each existing rule_group', () => {
    expect(MIGRATION).toMatch(/INSERT INTO public\.rule_groups[\s\S]*SELECT DISTINCT scheme_id, rule_group/);
  });

  it('creates rule nodes for each existing rule', () => {
    expect(MIGRATION).toMatch(/INSERT INTO public\.rule_nodes[\s\S]*SELECT[\s\S]*FROM public\.scheme_rules/);
  });

  it('preserves original rule IDs', () => {
    expect(MIGRATION).toMatch(/r\.id/);
  });

  it('preserves field, operator, value, required, descriptions, priority', () => {
    expect(MIGRATION).toMatch(/r\.field/);
    expect(MIGRATION).toMatch(/r\.operator/);
    expect(MIGRATION).toMatch(/r\.value/);
    expect(MIGRATION).toMatch(/r\.required/);
    expect(MIGRATION).toMatch(/r\.description_en/);
    expect(MIGRATION).toMatch(/r\.description_kn/);
    expect(MIGRATION).toMatch(/r\.priority/);
  });
});
