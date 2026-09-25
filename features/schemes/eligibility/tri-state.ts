import type { RuleGroupOperator, RuleOutcome } from '../types';

/**
 * Three-valued (Kleene) logic for eligibility outcomes.
 *
 * A boolean is not enough here. "We do not know" must stay distinguishable from
 * "no", otherwise a missing field silently becomes a rejection and the tool
 * tells a user they are ineligible when it simply never asked them a question.
 *
 *   AND:  any FAIL kills it, else any UNKNOWN makes it unknown, else PASS
 *   OR:   any PASS settles it, else any UNKNOWN makes it unknown, else FAIL
 */

/** Empty AND is vacuously true. Empty OR is vacuously false. */
export const IDENTITY: Record<RuleGroupOperator, RuleOutcome> = {
  AND: 'pass',
  OR: 'fail',
};

export function reduceAnd(outcomes: readonly RuleOutcome[]): RuleOutcome {
  if (outcomes.length === 0) return 'pass';
  if (outcomes.includes('fail')) return 'fail';
  if (outcomes.includes('unknown')) return 'unknown';
  return 'pass';
}

export function reduceOr(outcomes: readonly RuleOutcome[]): RuleOutcome {
  if (outcomes.length === 0) return 'fail';
  if (outcomes.includes('pass')) return 'pass';
  if (outcomes.includes('unknown')) return 'unknown';
  return 'fail';
}

/** Reduce with an explicit operator. Unknown operators fall back to `OR`. */
export function reduceOutcomes(
  outcomes: readonly RuleOutcome[],
  operator: RuleGroupOperator
): RuleOutcome {
  return operator === 'AND' ? reduceAnd(outcomes) : reduceOr(outcomes);
}
