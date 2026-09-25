import { createClient } from '@/lib/supabase/server';
import { toSchemeRules } from './eligibility/rule-mapper';
import { runEligibilityCheck } from './eligibility/check-eligibility-service';
import type { SchemeFieldName } from './eligibility/field-registry';
import type { SchemeRule, SchemeStatus } from './types';

/**
 * Server-side reads for the Schemes module.
 *
 * ── Server only ─────────────────────────────────────────────────────────────
 * This module reads through `lib/supabase/server`, which awaits `cookies()` and
 * therefore only works in a request scope. It is never imported by a client
 * component; an architecture test enforces that.
 *
 * It uses the ANON key plus the caller's session, so row-level security applies
 * to these queries exactly as it does in the browser. A draft, inactive or
 * expired scheme is invisible here, not merely filtered out afterwards.
 *
 * ── Shared by both entry points ─────────────────────────────────────────────
 * The Server Components and `GET /api/schemes` both call these functions, so
 * there is exactly one implementation of "read a published scheme".
 */

function assertServer(): void {
  if (typeof window !== 'undefined') {
    throw new Error(
      'schemes-service is server-only. It reads through lib/supabase/server, which ' +
        'requires a request scope and must never run in the browser.'
    );
  }
}

/**
 * A scheme as the catalogue needs it.
 *
 * There is deliberately no `shortDescription` column: Phase 4A kept the
 * original schema, so a short description is derived by truncating the existing
 * bilingual description rather than by inventing a column.
 */
export interface SchemeListItem {
  id: string;
  nameEn: string;
  nameKn: string;
  descriptionEn: string;
  descriptionKn: string;
  targetGroups: string[];
  states: string[];
  lastVerified: string;
  status: SchemeStatus;
}

export interface OfficialSource {
  url: string;
  host: string;
  /**
   * True when the host uses a reserved, non-resolving TLD (`.invalid`,
   * `.test`, `.example`, `.localhost`).
   *
   * This is a general property of the stored URL, not a check for any particular
   * scheme. It exists so the UI can warn that a "source" link does not point at
   * a real authority, which matters most for the fabricated demo fixtures and
   * equally for a mistyped production URL.
   */
  isResolving: boolean;
}

export interface SchemeDetail extends SchemeListItem {
  requiredDocuments: string[];
  officialSource: OfficialSource;
  /** Fields the eligibility form must collect, computed server-side. */
  requiredFields: SchemeFieldName[];
  rules: SchemeRule[];
}

const RESERVED_TLDS = ['.invalid', '.test', '.example', '.localhost'];

export function classifyOfficialSource(url: string): OfficialSource {
  const fallback: OfficialSource = { url, host: '', isResolving: false };
  if (typeof url !== 'string' || url.length === 0) return fallback;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const isResolving = !RESERVED_TLDS.some((tld) => host.endsWith(tld));
    return { url, host, isResolving };
  } catch {
    return fallback;
  }
}

/** The columns the catalogue and detail views need. Nothing internal. */
const SCHEME_COLUMNS =
  'id, name_en, name_kn, description_en, description_kn, target_groups, states, required_documents, official_url, last_verified, status';

type SchemeRow = {
  id: string;
  name_en: string;
  name_kn: string;
  description_en: string;
  description_kn: string;
  target_groups: string[] | null;
  states: string[] | null;
  required_documents: string[] | null;
  official_url: string;
  last_verified: string;
  status: SchemeStatus;
};

function toListItem(row: SchemeRow): SchemeListItem {
  return {
    id: row.id,
    nameEn: row.name_en,
    nameKn: row.name_kn,
    descriptionEn: row.description_en,
    descriptionKn: row.description_kn,
    targetGroups: row.target_groups ?? [],
    // A null or {"ALL"} states list means the scheme is not state-restricted.
    states: row.states ?? [],
    lastVerified: row.last_verified,
    status: row.status,
  };
}

/**
 * Every published scheme, alphabetically.
 *
 * `.eq('status', 'active')` is defence in depth: the RLS policy already filters
 * non-active rows out, so a row that is not active cannot reach this function
 * even if the policy were ever weakened.
 */
export async function listActiveSchemes(): Promise<SchemeListItem[]> {
  assertServer();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('schemes')
    .select(SCHEME_COLUMNS)
    .eq('status', 'active')
    .order('name_en', { ascending: true });

  if (error) {
    throw new Error(`Could not load schemes: ${error.code ?? 'UNKNOWN'}`);
  }

  return ((data ?? []) as SchemeRow[]).map(toListItem);
}

/**
 * One published scheme with its rules, or `null` when it does not exist or is
 * not published.
 *
 * The two cases are deliberately indistinguishable. Distinguishing "exists but is
 * draft" from "does not exist" would turn this into a probe for unpublished
 * schemes, which is exactly what the RLS policy exists to prevent.
 */
export async function getActiveSchemeWithDetails(
  schemeId: string
): Promise<SchemeDetail | null> {
  assertServer();
  const supabase = await createClient();

  const { data: schemeData, error: schemeError } = await supabase
    .from('schemes')
    .select(SCHEME_COLUMNS)
    .eq('id', schemeId)
    .eq('status', 'active')
    .maybeSingle();

  if (schemeError) {
    throw new Error(`Could not load scheme: ${schemeError.code ?? 'UNKNOWN'}`);
  }
  if (!schemeData) return null;

  const schemeRow = schemeData as SchemeRow;

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

  // Reuse the exact Phase 4C service to work out which fields the form needs.
  // With an empty applicant nothing can pass, so this cannot produce a verdict
  // the user ever sees; it only yields requiredFields. Doing it here means the
  // form and the API can never disagree about what to ask for.
  const outcome = runEligibilityCheck(
    [
      {
        id: schemeRow.id,
        nameEn: schemeRow.name_en,
        nameKn: schemeRow.name_kn,
        status: schemeRow.status,
        lastVerified: schemeRow.last_verified,
        rules,
        ruleProblems: problems,
      },
    ],
    {}
  );

  return {
    ...toListItem(schemeRow),
    requiredDocuments: schemeRow.required_documents ?? [],
    officialSource: classifyOfficialSource(schemeRow.official_url),
    requiredFields: outcome.results[0]?.requiredFields ?? [],
    rules,
  };
}
