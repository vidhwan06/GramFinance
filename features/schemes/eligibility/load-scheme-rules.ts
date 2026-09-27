import { createClient } from '@/lib/supabase/server';
import { toSchemeRules, reconstructRuleTree } from './rule-mapper';
import type { SchemeForEvaluation, SchemeRule, RuleGroupNode } from './check-eligibility-service';
import type { SchemeStatus } from '../types';

/**
 * Loads a single scheme with its flat rules and rule tree (if any).
 *
 * Used by both the eligibility API and the scheme detail page.
 * Pure server-side logic — no HTTP, no Next.js, no React.
 */
export async function loadSchemeForEvaluation(
  schemeId: string
): Promise<SchemeForEvaluation | null> {
  const supabase = await createClient();

  const { data: schemeData, error: schemeError } = await supabase
    .from('schemes')
    .select('id, name_en, name_kn, status, last_verified')
    .eq('id', schemeId)
    .eq('status', 'active')
    .maybeSingle();

  if (schemeError) {
    throw new Error(`Could not load scheme: ${schemeError.code ?? 'UNKNOWN'}`);
  }
  if (!schemeData) return null;

  // Load flat rules (legacy / fallback)
  const { data: ruleData, error: ruleError } = await supabase
    .from('scheme_rules')
    .select('*')
    .eq('scheme_id', schemeId)
    .order('rule_group', { ascending: true })
    .order('priority', { ascending: true });

  if (ruleError) {
    throw new Error(`Could not load scheme rules: ${ruleError.code ?? 'UNKNOWN'}`);
  }

  const { rules, problems } = toSchemeRules(ruleData ?? []);

  // Load rule tree (Phase 5B) — preferred for nested schemes
  const { data: groupData, error: groupError } = await supabase
    .from('rule_groups')
    .select('*')
    .eq('scheme_id', schemeId)
    .order('group_order', { ascending: true });

  if (groupError) {
    throw new Error(`Could not load rule groups: ${groupError.code ?? 'UNKNOWN'}`);
  }

  const { data: nodeData, error: nodeError } = await supabase
    .from('rule_nodes')
    .select('*')
    .in('group_id', groupData?.map(g => g.id) ?? [])
    .order('priority', { ascending: true });

  if (nodeError) {
    throw new Error(`Could not load rule nodes: ${nodeError.code ?? 'UNKNOWN'}`);
  }

  const rootGroup = reconstructRuleTree(groupData ?? [], nodeData ?? []);

  return {
    id: schemeData.id,
    nameEn: schemeData.name_en,
    nameKn: schemeData.name_kn,
    status: schemeData.status as SchemeStatus,
    lastVerified: schemeData.last_verified,
    rules,
    rootGroup,
    ruleProblems: problems,
  };
}

/**
 * Loads multiple schemes for evaluation (used by the eligibility API).
 */
export async function loadSchemesForEvaluation(
  schemeIds: readonly string[]
): Promise<SchemeForEvaluation[]> {
  const schemes: SchemeForEvaluation[] = [];

  for (const id of schemeIds) {
    const scheme = await loadSchemeForEvaluation(id);
    if (scheme) schemes.push(scheme);
  }

  return schemes;
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

  const schemeIds = (schemeRows ?? []).map(row => row.id);
  return loadSchemesForEvaluation(schemeIds);
}