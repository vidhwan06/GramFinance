'use client';

import React from 'react';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { FraudRiskSummary, FraudExplanation, FraudSignalList, SchemeFindings, FraudRecommendations, EmptyResult } from './';
import { copy } from '@/features/fraud/presentation/copy';
import type { FraudCheckResult } from '@/lib/fraud/types';
import { Headset, RefreshCw } from 'lucide-react';

/**
 * Result section shown after a successful fraud check.
 *
 * Stitch composition — asymmetric 8/4 inspection breakdown:
 *   - Risk summary banner (verdict + seal), low / medium / high
 *   - Left column: message summary, scheme findings, warning signals
 *   - Right column: action checklist, "test another message", human-help tile
 *   - Limitation disclaimer footer
 *
 * When there are no warning signs at all, the calm EmptyResult state renders
 * instead.
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
  const { t, language } = useLanguage();
  const c = copy[language === 'kn' ? 'kn' : 'en'];

  const hasNoSignals =
    result.signals.length === 0 &&
    !result.schemeFindings.some((f) => f.status !== 'unknown');

  const hasSchemeBlock = result.recognizedSchemes.length > 0;

  // Render empty state when there are no warning signs
  if (hasNoSignals && !hasSchemeBlock && !isLoading) {
    return (
      <div aria-live="polite" aria-busy={isLoading}>
        <EmptyResult onRetry={onRetry} />
      </div>
    );
  }

  return (
    <div className="space-y-space-lg" aria-live="polite" aria-busy={isLoading}>
      {/* Verdict banner */}
      <FraudRiskSummary riskLevel={result.riskLevel} riskScore={result.riskScore} />

      {/* Asymmetric inspection breakdown: 8 cols findings, 4 cols action guide */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
        {/* Left anchor: findings */}
        <div className="lg:col-span-8 space-y-space-md">
          <FraudExplanation result={result} />

          {hasSchemeBlock && (
            <SchemeFindings
              schemeFindings={result.schemeFindings}
              recognizedSchemes={result.recognizedSchemes}
            />
          )}

          {result.signals.length > 0 ? (
            <FraudSignalList signals={result.signals} />
          ) : (
            <section
              aria-labelledby="no-warning-heading"
              className="rounded-xl bg-surface-container-lowest shadow-sm border border-outline-variant/50 p-space-md lg:p-space-lg"
            >
              <h3
                id="no-warning-heading"
                className="font-title-md text-title-md text-on-surface mb-space-sm"
              >
                {t.fraud.explanationNoWarning}
              </h3>
              <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                {t.fraud.explanationNoWarningDesc}
              </p>
            </section>
          )}
        </div>

        {/* Right column: action guide */}
        <div className="lg:col-span-4 space-y-space-md">
          <FraudRecommendations recommendations={result.recommendations} />

          {/* Test another message */}
          <button
            type="button"
            onClick={onRetry}
            className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-surface-container-lowest text-on-surface border border-outline-variant/60 font-label-md text-label-md hover:bg-surface-container transition-colors min-h-[44px] shadow-sm"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            <span>{c.testAnother}</span>
          </button>

          {/* Human-help tile */}
          <div className="rounded-xl bg-surface-container-low shadow-sm border border-outline-variant/50 p-space-md space-y-space-sm">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
              {c.assistanceEyebrow}
            </span>
            <p className="font-body-sm text-body-sm text-on-surface leading-snug">
              {c.assistanceBody}
            </p>
            <div className="pt-1 flex items-center gap-2 text-secondary font-label-md text-label-md font-semibold">
              <Headset className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{t.fraud.helpline}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Limitation disclaimer */}
      <div className="border-t border-outline-variant/60 pt-space-sm">
        <p className="font-label-sm text-label-sm text-on-surface-variant leading-relaxed">
          {t.fraud.disclaimer}
        </p>
        {result.signals.length > 0 && (
          <p className="font-label-sm text-label-sm text-on-surface-variant leading-relaxed mt-1">
            {t.fraud.explanationAdditionalDisclaimer}
          </p>
        )}
      </div>
    </div>
  );
}

/** displayName for dev tools. */
FraudResult.displayName = 'FraudResult';
