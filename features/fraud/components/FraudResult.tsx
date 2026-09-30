'use client';

import React from 'react';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { FraudRiskSummary, FraudExplanation, EmptyResult } from './';
import type { FraudCheckResult } from '@/lib/fraud/types';

/**
 * Result section shown after a successful fraud check.
 *
 * Renders:
 *   - Risk summary (low / medium / high)
 *   - Explanation section combining:
 *       * What this message says / is trying to do
 *       * Why it was flagged (warning indicators with evidence)
 *       * What you should do (recommendations)
 *       * Scheme findings (if applicable)
 *       * Important limitation disclaimer
 */
export function FraudResult({
  result,
  isLoading,
  onRetry,
}: {
  result: FraudCheckResult;
  isLoading: boolean;
  onRetry: () => void;
}) {
  const { t } = useLanguage();

  const hasNoSignals =
    result.signals.length === 0 &&
    !result.schemeFindings.some((f) => f.status !== 'unknown');

  // Render empty state when there are no warning signs
  if (hasNoSignals && result.recognizedSchemes.length === 0 && !isLoading) {
    return <EmptyResult onRetry={onRetry} />;
  }

  return (
    <div className="space-y-6" aria-live="polite" aria-busy={isLoading}>
      {/* Risk Summary */}
      <FraudRiskSummary riskLevel={result.riskLevel} riskScore={result.riskScore} />

      {/* Explanation Section */}
      <FraudExplanation result={result} />
    </div>
  );
}

/** displayName for dev tools. */
FraudResult.displayName = 'FraudResult';
