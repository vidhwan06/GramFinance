/**
 * Input normalizer for fraud checking.
 *
 * Performs only safe, deterministic transformations:
 *   - trim whitespace
 *   - normalize repeated whitespace
 *   - normalize case for matching
 *   - preserve the original input separately
 *
 * The original text is never destroyed.
 */

import type { NormalizedInput } from './types';

export function normalizeInput(text: string): NormalizedInput {
  const original = text;
  const normalized = text
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

  return { original, normalized };
}
