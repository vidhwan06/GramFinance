'use client';

import React from 'react';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import {
  FraudRiskSummary,
  FraudSignalList,
  SchemeFindings,
  FraudRecommendations,
  EmptyResult,
} from './';
import type { FraudCheckResult } from '@/lib/fraud/types';

/**
 * Result section shown after a successful fraud check.
 *
 * Renders:
 *   - Risk summary (low / medium / high)
 *   - List of fraud signals
 *   - Scheme recognition information
 *   - Scheme findings (supported / contradicted / unknown)
 *   - Recommendations
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

      {/* Fraud Signals */}
      {result.signals.length > 0 && (
        <FraudSignalList signals={result.signals} />
      )}

      {/* Scheme Recognition */}
      {result.recognizedSchemes.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">
            {t.fraud.schemeRecognized}
          </h3>
          <SchemeFindings
            schemeFindings={result.schemeFindings}
            recognizedSchemes={result.recognizedSchemes}
          />
        </div>
      )}

      {/* Recommendations */}
      {result.recommendations.length > 0 && (
        <FraudRecommendations recommendations={result.recommendations} />
      )}

      {/* Disclaimer */}
      <p className="text-xs text-gray-400 border-t border-rule pt-4">
        {t.fraud.disclaimer}
      </p>
    </div>
  );
}

/** displayName for dev tools. */
FraudResult.displayName = 'FraudResult';
