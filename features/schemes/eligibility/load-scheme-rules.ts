import { createClient } from '@/lib/supabase/server';
import { toSchemeRules, reconstructRuleTree } from './rule-mapper';
import type { SchemeForEvaluation, SchemeRule, RuleGroupNode } from './check-eligibility-service';
import type { SchemeStatus } from '../types';
import type { DbSchemeRule, DbRuleGroup, DbRuleNode } from '@/types/database';

/**
 * Loads schemes and their rules from the database.
 *
 * Pure server-side logic — no HTTP, no Next.js, no React.
 *
 * ── Query shape (MED-04) ────────────────────────────────────────────────────
 * Loading N schemes costs a FIXED number of round trips, not one set of
 * queries per scheme:
 *
 *   1. schemes            (status = 'active', filtered here as well as by RLS)
 *   2. scheme_rules  ┐    ─┐
 *   3. rule_groups   ┘     │ run concurrently: neither depends on the other
 *   4. rule_nodes          ┘ needs the group ids from (3)
 *
 * The rows are then joined in memory. Everything the evaluator relies on —
 * active-only visibility, per-scheme rule ordering, nested AND/OR structure,
 * the three-state verdict — is unchanged.
 */

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

/** The scheme columns the evaluator and the detail page both surface. */
interface SchemeRow {
  id: string;
  name_en: string;
  name_kn: string;
  status: string;
  last_verified: string;
}

/**
 * Loads a single scheme with its flat rules and rule tree (if any).
 *
 * Used by both the eligibility API and the scheme detail page.
 */
export async function loadSchemeForEvaluation(
  schemeId: string
): Promise<SchemeForEvaluation | null> {
  const schemes = await loadSchemesForEvaluation([schemeId]);
  return schemes[0] ?? null;
}

/**
 * Loads the given schemes with their rules and rule trees.
 *
 * Schemes that are missing, or exist but are not `active`, are silently
 * omitted — RLS already hides them, and the caller treats "absent" and
 * "not active" identically so an unpublished scheme cannot be discovered.
 */
export async function loadSchemesForEvaluation(
  schemeIds: readonly string[]
): Promise<SchemeForEvaluation[]> {
  if (schemeIds.length === 0) return [];

  const supabase = await createClient();

  const { data: schemeRows, error: schemeError } = await supabase
    .from('schemes')
    .select('id, name_en, name_kn, status, last_verified')
    .in('id', [...schemeIds])
    .eq('status', 'active')
    .order('name_en', { ascending: true });

  if (schemeError) {
    throw new Error(`Could not load schemes: ${schemeError.code ?? 'UNKNOWN'}`);
  }

  return loadRulesForSchemeRows(supabase, (schemeRows ?? []) as SchemeRow[]);
}

/**
 * Loads all active schemes for evaluation (used when no schemeId is specified).
 */
export async function loadAllActiveSchemesForEvaluation(): Promise<SchemeForEvaluation[]> {
  const supabase = await createClient();

  const { data: schemeRows, error: schemeError } = await supabase
    .from('schemes')
    .select('id, name_en, name_kn, status, last_verified')
    .eq('status', 'active')
    .order('name_en', { ascending: true });

  if (schemeError) {
    throw new Error(`Could not load schemes: ${schemeError.code ?? 'UNKNOWN'}`);
  }

  return loadRulesForSchemeRows(supabase, (schemeRows ?? []) as SchemeRow[]);
}

/**
 * Attaches flat rules and rule trees to already-loaded scheme rows.
 *
 * This is the part that used to run once per scheme. Flat rules and groups are
 * fetched together (neither depends on the other), and the nodes query — which
 * needs the group ids — follows. Three round trips for any number of schemes.
 */
async function loadRulesForSchemeRows(
  supabase: SupabaseClient,
  schemeRows: SchemeRow[]
): Promise<SchemeForEvaluation[]> {
  if (schemeRows.length === 0) return [];

  const schemeIds = schemeRows.map((row) => row.id);

  const [rulesResult, groupsResult] = await Promise.all([
    supabase
      .from('scheme_rules')
      .select('*')
      .in('scheme_id', schemeIds)
      // Global ordering; filtering per scheme below keeps each scheme's rows
      // in the same order the previous per-scheme query produced.
      .order('rule_group', { ascending: true })
      .order('priority', { ascending: true }),
    supabase
      .from('rule_groups')
      .select('*')
      .in('scheme_id', schemeIds)
      .order('group_order', { ascending: true }),
  ]);

  if (rulesResult.error) {
    throw new Error(`Could not load scheme rules: ${rulesResult.error.code ?? 'UNKNOWN'}`);
  }
  if (groupsResult.error) {
    throw new Error(`Could not load rule groups: ${groupsResult.error.code ?? 'UNKNOWN'}`);
  }

  const ruleRows = (rulesResult.data ?? []) as DbSchemeRule[];
  const groupRows = (groupsResult.data ?? []) as DbRuleGroup[];

  // A scheme with no rule tree contributes no groups, so there is nothing to
  // fetch — skipping it avoids a query that can only return zero rows.
  let nodeRows: DbRuleNode[] = [];
  if (groupRows.length > 0) {
    const { data, error } = await supabase
      .from('rule_nodes')
      .select('*')
      .in(
        'group_id',
        groupRows.map((group) => group.id)
      )
      .order('priority', { ascending: true });

    if (error) {
      throw new Error(`Could not load rule nodes: ${error.code ?? 'UNKNOWN'}`);
    }
    nodeRows = (data ?? []) as DbRuleNode[];
  }

  return schemeRows.map((schemeRow) => {
    const rulesForScheme = ruleRows.filter((row) => row.scheme_id === schemeRow.id);
    const groupsForScheme = groupRows.filter((row) => row.scheme_id === schemeRow.id);
    const nodesForScheme = nodeRows.filter((node) =>
      groupsForScheme.some((group) => group.id === node.group_id)
    );

    const { rules, problems } = toSchemeRules(rulesForScheme);
    const rootGroup = reconstructRuleTree(groupsForScheme, nodesForScheme);

    return {
      id: schemeRow.id,
      nameEn: schemeRow.name_en,
      nameKn: schemeRow.name_kn,
      status: schemeRow.status as SchemeStatus,
      lastVerified: schemeRow.last_verified,
      rules,
      rootGroup,
      ruleProblems: problems,
    };
  });
}
