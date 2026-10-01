import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  loadSchemeForEvaluation,
  loadSchemesForEvaluation,
  loadAllActiveSchemesForEvaluation,
} from '@/features/schemes/eligibility/load-scheme-rules';
import { runEligibilityCheck } from '@/features/schemes/eligibility/check-eligibility-service';

/**
 * MED-04: the loader must issue a FIXED number of queries, join rules/groups/
 * nodes in memory, and produce exactly what the old per-scheme loader produced.
 *
 * The Supabase client is replaced by an in-memory fake that records every
 * table it is asked for, so the query count — the whole point of this finding —
 * is directly observable.
 */

type Row = Record<string, unknown>;

const db = vi.hoisted(() => {
  const state = {
    schemes: [] as Row[],
    scheme_rules: [] as Row[],
    rule_groups: [] as Row[],
    rule_nodes: [] as Row[],
    queries: [] as string[],
  };

  function reset() {
    state.schemes = [];
    state.scheme_rules = [];
    state.rule_groups = [];
    state.rule_nodes = [];
    state.queries = [];
  }

  function rowsFor(table: string): Row[] {
    switch (table) {
      case 'schemes':
        return state.schemes;
      case 'scheme_rules':
        return state.scheme_rules;
      case 'rule_groups':
        return state.rule_groups;
      case 'rule_nodes':
        return state.rule_nodes;
      default:
        throw new Error(`unexpected table: ${table}`);
    }
  }

  function from(table: string) {
    const filters: Array<(row: Row) => boolean> = [];
    const orders: Array<{ col: string; asc: boolean }> = [];

    const builder: Record<string, unknown> = {
      select() {
        return builder;
      },
      eq(col: string, value: unknown) {
        filters.push((row) => row[col] === value);
        return builder;
      },
      in(col: string, values: readonly unknown[]) {
        const allowed = new Set(values);
        filters.push((row) => allowed.has(row[col]));
        return builder;
      },
      order(col: string, opts?: { ascending?: boolean }) {
        orders.push({ col, asc: opts?.ascending !== false });
        return builder;
      },
      then(resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) {
        state.queries.push(table);

        let rows = rowsFor(table).filter((row) => filters.every((f) => f(row)));

        // Supabase applies `.order()` calls primary → secondary, so replay them
        // last → first over a stable sort.
        for (let i = orders.length - 1; i >= 0; i--) {
          const { col, asc } = orders[i];
          rows = rows.slice().sort((a, b) => {
            const av = a[col] as number | string;
            const bv = b[col] as number | string;
            if (av === bv) return 0;
            return (av < bv ? -1 : 1) * (asc ? 1 : -1);
          });
        }

        return Promise.resolve({ data: rows.map((row) => ({ ...row })), error: null }).then(
          resolve,
          reject
        );
      },
    };

    return builder;
  }

  return { state, reset, client: { from } };
});

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => db.client,
}));

// ─── fixtures ───────────────────────────────────────────────────────────────

function schemeRow(id: string, nameEn: string, status: string): Row {
  return {
    id,
    name_en: nameEn,
    name_kn: `kn-${nameEn}`,
    status,
    last_verified: '2026-01-01',
  };
}

function ruleRow(id: string, schemeId: string, minValue: number, priority: number): Row {
  return {
    id,
    scheme_id: schemeId,
    rule_group: 1,
    group_operator: 'AND',
    rule_type: 'eligibility',
    field: 'age',
    operator: '>=',
    value: minValue,
    required: true,
    description_en: null,
    description_kn: null,
    priority,
    created_at: '2026-01-01T00:00:00.000Z',
  };
}

function groupRow(
  id: string,
  schemeId: string,
  parentGroupId: string | null,
  operator: 'AND' | 'OR',
  order: number
): Row {
  return {
    id,
    scheme_id: schemeId,
    parent_group_id: parentGroupId,
    group_operator: operator,
    group_order: order,
    created_at: '2026-01-01T00:00:00.000Z',
  };
}

function nodeRow(
  id: string,
  groupId: string,
  nodeType: 'rule' | 'group',
  priority: number,
  minValue?: number,
  childGroupId: string | null = null
): Row {
  return {
    id,
    group_id: groupId,
    node_type: nodeType,
    field: nodeType === 'rule' ? 'age' : null,
    operator: nodeType === 'rule' ? '>=' : null,
    value: nodeType === 'rule' ? minValue ?? 0 : null,
    required: true,
    description_en: null,
    description_kn: null,
    priority,
    child_group_id: childGroupId,
    created_at: '2026-01-01T00:00:00.000Z',
  };
}

/**
 * s1 Alpha  (active)  — 2 flat rules, tree AND(age>=18, age>=21)
 * s2 Beta   (active)  — 1 flat rule,  tree AND( group OR(age>=99) )
 * s3 Gamma  (active)  — no rules, no groups
 * s4 Delta  (draft)   — must never be returned
 * s5 Epsilon(inactive)— must never be returned
 */
function seedStandardFixtures() {
  db.reset();

  db.state.schemes = [
    schemeRow('s1', 'Alpha', 'active'),
    schemeRow('s2', 'Beta', 'active'),
    schemeRow('s3', 'Gamma', 'active'),
    schemeRow('s4', 'Delta', 'draft'),
    schemeRow('s5', 'Epsilon', 'inactive'),
  ];

  db.state.scheme_rules = [
    ruleRow('r1', 's1', 18, 1),
    ruleRow('r2', 's1', 21, 2),
    ruleRow('r3', 's2', 18, 1),
    // Rules belonging to schemes that are not active.
    ruleRow('r4', 's4', 18, 1),
    ruleRow('r5', 's5', 18, 1),
  ];

  db.state.rule_groups = [
    groupRow('g1', 's1', null, 'AND', 0),
    groupRow('g2', 's2', null, 'AND', 0),
    groupRow('g3', 's2', 'g2', 'OR', 1),
    groupRow('g4', 's4', null, 'AND', 0),
  ];

  db.state.rule_nodes = [
    nodeRow('n1', 'g1', 'rule', 1, 18),
    nodeRow('n2', 'g1', 'rule', 2, 21),
    nodeRow('n3', 'g2', 'group', 1, undefined, 'g3'),
    nodeRow('n4', 'g3', 'rule', 1, 99),
    nodeRow('n5', 'g4', 'rule', 1, 18),
  ];
}

beforeEach(seedStandardFixtures);

// ─── tests ──────────────────────────────────────────────────────────────────

describe('loadAllActiveSchemesForEvaluation', () => {
  it('loads every active scheme', async () => {
    const loaded = await loadAllActiveSchemesForEvaluation();
    expect(loaded.map((s) => s.id)).toEqual(['s1', 's2', 's3']);
    expect(loaded.map((s) => s.nameEn)).toEqual(['Alpha', 'Beta', 'Gamma']);
    expect(loaded.every((s) => s.status === 'active')).toBe(true);
  });

  it('excludes draft and inactive schemes', async () => {
    const loaded = await loadAllActiveSchemesForEvaluation();
    const ids = loaded.map((s) => s.id);
    expect(ids).not.toContain('s4');
    expect(ids).not.toContain('s5');
    // Their rules and trees are unreachable too, not just their headers.
    expect(loaded.flatMap((s) => s.rules.map((r) => r.id))).not.toContain('r4');
    expect(loaded.flatMap((s) => s.rules.map((r) => r.id))).not.toContain('r5');
  });

  it('issues a fixed number of queries regardless of how many schemes load', async () => {
    db.state.queries = [];
    await loadSchemeForEvaluation('s1');
    const single = db.state.queries.length;

    db.state.queries = [];
    await loadAllActiveSchemesForEvaluation();
    const all = db.state.queries.length;

    // 1 schemes + 1 rules + 1 groups + 1 nodes, never one round per scheme.
    expect(single).toBe(4);
    expect(all).toBe(single);
    expect(all).toBeLessThan(1 + 4 * 3);
    expect(db.state.queries).toEqual([
      'schemes',
      'scheme_rules',
      'rule_groups',
      'rule_nodes',
    ]);
  });

  it('skips the nodes query entirely when no scheme has a rule tree', async () => {
    db.state.rule_groups = [];
    db.state.rule_nodes = [];

    db.state.queries = [];
    await loadAllActiveSchemesForEvaluation();

    expect(db.state.queries).toEqual(['schemes', 'scheme_rules', 'rule_groups']);
  });
});

describe('loadSchemesForEvaluation / loadSchemeForEvaluation', () => {
  it('returns nothing for an empty id list', async () => {
    db.state.queries = [];
    expect(await loadSchemesForEvaluation([])).toEqual([]);
    expect(db.state.queries).toEqual([]);
  });

  it('omits requested ids that are missing or not active', async () => {
    const loaded = await loadSchemesForEvaluation(['s1', 's4', 's5', 'nope']);
    expect(loaded.map((s) => s.id)).toEqual(['s1']);
  });

  it('returns null for a single missing scheme', async () => {
    expect(await loadSchemeForEvaluation('s4')).toBeNull();
    expect(await loadSchemeForEvaluation('does-not-exist')).toBeNull();
  });

  it('returns null rather than throwing when nothing matches', async () => {
    db.state.schemes = [];
    expect(await loadSchemeForEvaluation('s1')).toBeNull();
  });
});

describe('rule trees stay associated with their own scheme', () => {
  it('builds each scheme from only its own groups and nodes', async () => {
    const loaded = await loadAllActiveSchemesForEvaluation();
    const [s1, s2, s3] = loaded;

    // s1: flat rules AND a tree, both intact.
    expect(s1.rules.map((r) => r.id)).toEqual(['r1', 'r2']);
    expect(s1.rootGroup?.id).toBe('g1');
    expect(s1.rootGroup?.groupOperator).toBe('AND');
    expect(s1.rootGroup?.children).toHaveLength(2);
    expect(s1.ruleProblems).toEqual([]);

    // s2: nested — an AND root whose only child is an OR group.
    expect(s2.rules.map((r) => r.id)).toEqual(['r3']);
    expect(s2.rootGroup?.id).toBe('g2');
    expect(s2.rootGroup?.children).toHaveLength(1);
    const nested = s2.rootGroup?.children[0];
    expect(nested?.kind).toBe('group');
    if (nested?.kind === 'group') {
      expect(nested.group.id).toBe('g3');
      expect(nested.group.groupOperator).toBe('OR');
      expect(nested.group.children).toHaveLength(1);
    }

    // s3: no rules and no tree at all.
    expect(s3.rules).toEqual([]);
    expect(s3.rootGroup).toBeNull();
    expect(s3.ruleProblems).toEqual([]);
  });

  it('preserves rule ordering within a scheme', async () => {
    const loaded = await loadAllActiveSchemesForEvaluation();
    const s1 = loaded.find((s) => s.id === 's1');

    // Flat rules: rule_group then priority (r1 priority 1, r2 priority 2).
    expect(s1?.rules.map((r) => r.priority)).toEqual([1, 2]);

    // Tree children: priority order.
    expect(s1?.rootGroup?.children.map((c) => (c.kind === 'rule' ? c.rule.priority : -1))).toEqual([
      1,
      2,
    ]);
  });

  it('produces the same structures as a per-scheme load would', async () => {
    const batched = await loadAllActiveSchemesForEvaluation();

    // Load each scheme through the single-scheme entry point and compare: the
    // batching must be an optimisation, not a behaviour change.
    const individually: typeof batched = [];
    for (const id of ['s1', 's2', 's3']) {
      const scheme = await loadSchemeForEvaluation(id);
      if (scheme) individually.push(scheme);
    }

    expect(batched).toEqual(individually);
  });
});

describe('eligibility results are unchanged by the batching', () => {
  it('returns the same three-state verdicts for every scheme', async () => {
    const loaded = await loadAllActiveSchemesForEvaluation();

    // age 25: s1 AND(18,21) passes; s2 AND(OR(99)) fails; s3 has no rules.
    const outcome = runEligibilityCheck(loaded, { age: 25 });

    expect(outcome.summary.schemeCount).toBe(3);
    expect(outcome.summary.ruleCount).toBe(3);
    expect(outcome.summary.problemRuleCount).toBe(0);
    expect(outcome.summary.byStatus).toEqual({
      eligible: 1,
      not_eligible: 1,
      potentially_eligible: 1,
    });

    const verdicts = Object.fromEntries(
      outcome.results.map((r) => [r.scheme.id, r.eligibility.status])
    );
    expect(verdicts).toEqual({
      s1: 'eligible',
      s2: 'not_eligible',
      s3: 'potentially_eligible',
    });
  });

  it('never evaluates a draft scheme even if one is handed in directly', async () => {
    const loaded = await loadSchemesForEvaluation(['s1', 's4']);
    expect(loaded.map((s) => s.id)).toEqual(['s1']);
  });
});
