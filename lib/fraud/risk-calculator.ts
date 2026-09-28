/**
 * Risk calculator for fraud checking.
 *
 * Initial scoring: sum of matched signal weights, clamped 0-100.
 * Risk-level mapping:
 *   0-29   → low
 *   30-59  → medium
 *   60-100 → high
 */

import type { FraudRiskLevel } from './types';

export function calculateRiskScore(signalWeights: number[]): number {
  const total = signalWeights.reduce((sum, w) => sum + w, 0);
  return Math.min(100, Math.max(0, total));
}

export function mapRiskLevel(score: number): FraudRiskLevel {
  if (score <= 29) return 'low';
  if (score <= 59) return 'medium';
  return 'high';
}
