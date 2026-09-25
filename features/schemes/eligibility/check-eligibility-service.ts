import { evaluateEligibility, collectRequiredFields } from './eligibility-engine';
import type { SchemeApplicant, SchemeFieldName } from './field-registry';
import type {
  EligibilityStatus,
  SchemeEligibilityResult,
  SchemeRule,
  SchemeStatus,
} from '../types';
import { ELIGIBILITY_DISCLAIMER_EN, ELIGIBILITY_DISCLAIMER_KN } from '../types';

/**
 * Orchestration between the data layer and the eligibility engine.
 *
 * Pure: it takes already-loaded schemes and rules and returns a verdict. It does
 * no I/O, so it is unit-testable without a database, and it can be reused by a
 * later admin or batch job without going through HTTP.
 */

/** A scheme plus its rules, as loaded from the database. */
export interface SchemeForEvaluation {
  id: string;
  nameEn: string;
  nameKn: string;
  status: SchemeStatus;
  lastVerified: string;
  rules: SchemeRule[];
  /** Rule ids that could not be mapped faithfully. Never blocks the result. */
  ruleProblems: string[];
}

export interface SchemeOutcome {
  scheme: {
    id: string;
    nameEn: string;
    nameKn: string;
    status: SchemeStatus;
    /** Surface this to users. It is a trust signal, not a cosmetic date. */
    lastVerified: string;
  };
  eligibility: SchemeEligibilityResult;
  /**
   * The fields this scheme still needs from the applicant, in registry order.
   * Drives the dynamic eligibility form so users are never shown 25 questions.
   */
  requiredFields: SchemeFieldName[];
}

export interface EligibilitySummary {
  schemeCount: number;
  ruleCount: number;
  problemRuleCount: number;
  byStatus: Record<EligibilityStatus, number>;
}

export interface EligibilityCheckOutcome {
  results: SchemeOutcome[];
  summary: EligibilitySummary;
  /**
   * Returned by the API so a client cannot accidentally omit it. This tool is a
   * matching assistant and never an authority.
   */
  disclaimer: { en: string; kn: string };
}

function emptyStatusCounts(): Record<EligibilityStatus, number> {
  return { eligible: 0, potentially_eligible: 0, not_eligible: 0 };
}

/**
 * Evaluates an applicant against a set of schemes.
 *
 * Defence in depth on `status`: the database policy already hides anything that
 * is not `active`, but a caller that assembles schemes by hand (an admin tool, a
 * test) must not be able to evaluate an unpublished scheme by accident.
 */
export function runEligibilityCheck(
  schemes: readonly SchemeForEvaluation[],
  applicant: SchemeApplicant
): EligibilityCheckOutcome {
  const results: SchemeOutcome[] = [];
  const byStatus = emptyStatusCounts();
  let ruleCount = 0;
  let problemRuleCount = 0;

  for (const scheme of schemes) {
    ruleCount += scheme.rules.length;
    problemRuleCount += scheme.ruleProblems.length;

    if (scheme.status !== 'active') {
      // Not evaluated and not reported. Saying "this scheme exists but is not
      // available" would confirm the existence of an unpublished scheme.
      continue;
    }

    const eligibility = evaluateEligibility(scheme.id, scheme.rules, applicant);

    byStatus[eligibility.status] += 1;

    results.push({
      scheme: {
        id: scheme.id,
        nameEn: scheme.nameEn,
        nameKn: scheme.nameKn,
        status: scheme.status,
        lastVerified: scheme.lastVerified,
      },
      eligibility,
      requiredFields: collectRequiredFields(scheme.rules),
    });
  }

  return {
    results,
    summary: {
      schemeCount: results.length,
      ruleCount,
      problemRuleCount,
      byStatus,
    },
    disclaimer: {
      en: ELIGIBILITY_DISCLAIMER_EN,
      kn: ELIGIBILITY_DISCLAIMER_KN,
    },
  };
}
