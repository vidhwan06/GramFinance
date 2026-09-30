'use client';

import React from 'react';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import type { FraudCheckResult, FraudSignalMatch } from '@/lib/fraud/types';
import {
  getTranslatedSignalName,
  getTranslatedSignalExplanation,
  getTranslatedWhyItMatters,
  translateRecommendation,
  translateSchemeFindingExplanation,
} from '@/features/fraud/lib/fraud-translations';

interface FraudExplanationProps {
  result: FraudCheckResult;
}

/**
 * Generates a deterministic summary of what the message appears to be trying to do.
 * Based on the combination of detected signals.
 * Uses translation keys for all user-facing text.
 */
function generateMessageSummary(
  signals: FraudSignalMatch[],
  t: ReturnType<typeof useLanguage>['t']
): string {
  if (signals.length === 0) {
    return t.fraud.explanationGenuineDesc;
  }

  const signalCodes = new Set(signals.map((s) => s.code));
  const parts: string[] = [];

  // Check for credential phishing (OTP + account access + urgent account action)
  const hasCredentialPhishing =
    signalCodes.has('OTP_REQUEST') &&
    (signalCodes.has('ACCOUNT_ACCESS_REQUEST') || signalCodes.has('URGENT_ACCOUNT_ACTION'));

  if (hasCredentialPhishing) {
    parts.push(t.fraud.summaryPartCredentialPhishing);
  } else if (signalCodes.has('OTP_REQUEST') && signalCodes.has('ACCOUNT_ACCESS_REQUEST')) {
    parts.push(t.fraud.summaryPartOtpAndCredentials);
  } else if (signalCodes.has('OTP_REQUEST')) {
    parts.push(t.fraud.summaryPartOtpOnly);
  } else if (signalCodes.has('ACCOUNT_ACCESS_REQUEST')) {
    parts.push(t.fraud.summaryPartAccountAccessOnly);
  } else if (signalCodes.has('URGENT_ACCOUNT_ACTION')) {
    parts.push(t.fraud.summaryPartUrgentAccountAction);
  }

  // Check for payment-related signals
  if (signalCodes.has('URGENT_PAYMENT')) {
    parts.push(t.fraud.summaryPartUrgentPayment);
  }

  if (signalCodes.has('UNOFFICIAL_FEE')) {
    parts.push(t.fraud.summaryPartUnofficialFee);
  }

  if (signalCodes.has('PERSONAL_UPI')) {
    parts.push(t.fraud.summaryPartPersonalUpi);
  }

  // Check for link-related signals
  if (signalCodes.has('SUSPICIOUS_LINK')) {
    parts.push(t.fraud.summaryPartSuspiciousLink);
  }

  // Check for government claim signals
  if (signalCodes.has('FAKE_GOVERNMENT_CLAIM')) {
    parts.push(t.fraud.summaryPartFakeGovernmentClaim);
  }

  if (parts.length === 0) {
    return t.fraud.summaryPartUnknown;
  }

  if (parts.length === 1) {
    return `${t.fraud.summaryPrefixSingle}${parts[0]}.`;
  }

  const last = parts.pop()!;
  return `${t.fraud.summaryPrefixMulti}${parts.join(', ')}${t.fraud.summaryConnector}${last}.`;
}

/**
 * Generates a plain-language explanation for a specific signal.
 * Uses translation keys for all user-facing text.
 */
function getSignalExplanation(
  signal: FraudSignalMatch,
  t: ReturnType<typeof useLanguage>['t']
): {
  title: string;
  explanation: string;
  whyItMatters: string;
} {
  const title = getTranslatedSignalName(signal.code, signal.name, t);
  const explanation = getTranslatedSignalExplanation(signal.code, signal.explanation, t);
  const whyItMatters = getTranslatedWhyItMatters(signal.code, t) ?? '';

  return { title, explanation, whyItMatters };
}

export function FraudExplanation({ result }: FraudExplanationProps) {
  const { t } = useLanguage();
  const hasSignals = result.signals.length > 0;

  return (
    <div className="space-y-6">
      {/* What this message says / is trying to do */}
      <section aria-labelledby="summary-heading">
        <h3 id="summary-heading" className="text-lg font-bold text-gray-900 mb-3">
          {hasSignals ? t.fraud.explanationWhatMessageDoes : t.fraud.explanationWhatMessageSays}
        </h3>
        <div className="rounded-lg border border-rule bg-white p-4">
          <p className="text-base text-gray-700 leading-relaxed">
            {hasSignals ? generateMessageSummary(result.signals, t) : t.fraud.explanationGenuineDesc}
          </p>
        </div>
      </section>

      {/* Why it was flagged / Warning indicators */}
      {hasSignals && (
        <section aria-labelledby="flagged-heading">
          <h3 id="flagged-heading" className="text-lg font-bold text-gray-900 mb-3">
            {t.fraud.explanationWhyFlagged}
          </h3>
          <div className="space-y-3">
            {result.signals.map((signal) => {
              const { title, explanation, whyItMatters } = getSignalExplanation(signal, t);
              const sev = signal.severity || 'low';
              const severityTones: Record<string, string> = {
                low: 'border-green-300 bg-green-50',
                medium: 'border-amber-300 bg-amber-50',
                high: 'border-red-300 bg-red-50',
              };
              const severityGlyphs: Record<string, string> = {
                low: '○',
                medium: '◐',
                high: '◉',
              };

              return (
                <div
                  key={signal.code}
                  className={`rounded-lg border p-4 ${severityTones[sev]}`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="text-xl font-bold leading-6 shrink-0"
                    >
                      {severityGlyphs[sev]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-ink">{title}</span>
                        <span className="text-xs font-medium text-gray-500 px-2 py-0.5 rounded bg-white/50">
                          {sev === 'low' ? t.fraud.severityLow : sev === 'medium' ? t.fraud.severityMedium : t.fraud.severityHigh}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{explanation}</p>
                      <p className="text-sm text-gray-600 mb-2">{whyItMatters}</p>
                      {signal.matchedText && (
                        <div className="text-xs text-gray-500 bg-gray-50 rounded p-2 font-mono">
                          <span className="font-medium">{t.fraud.detectedPhrase}: </span>
                          &ldquo;{signal.matchedText}&rdquo;
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {!hasSignals && (
        <section aria-labelledby="no-warning-heading">
          <h3 id="no-warning-heading" className="text-lg font-bold text-gray-900 mb-3">
            {t.fraud.explanationNoWarning}
          </h3>
          <div className="rounded-lg border border-rule bg-white p-4">
            <p className="text-base text-gray-700 leading-relaxed">
              {t.fraud.explanationNoWarningDesc}
            </p>
          </div>
        </section>
      )}

      {/* What you should do */}
      <section aria-labelledby="action-heading">
        <h3 id="action-heading" className="text-lg font-bold text-gray-900 mb-3">
          {t.fraud.recommendationsTitle}
        </h3>
        <ul className="space-y-2" role="list">
          {result.recommendations.map((rec, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2 pb-2 border-b border-gray-100 last:pb-0 last:border-0"
            >
              <span aria-hidden="true" className="font-medium text-ink shrink-0 mt-0.5">
                •
              </span>
              <span className="flex-1 text-sm text-gray-700">
                {translateRecommendation(rec.text, t)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Scheme findings if applicable */}
      {result.recognizedSchemes.length > 0 && (
        <section aria-labelledby="scheme-heading">
          <h3 id="scheme-heading" className="text-lg font-bold text-gray-900 mb-3">
            {t.fraud.schemeRecognized}
          </h3>
          <div className="space-y-3">
            {result.schemeFindings.map((finding) => {
              const statusTones: Record<string, string> = {
                supported: 'border-green-300 bg-green-50',
                contradicted: 'border-red-300 bg-red-50',
                unknown: 'border-amber-300 bg-amber-50',
              };
              const statusGlyphs: Record<string, string> = {
                supported: '✓',
                contradicted: '✕',
                unknown: '?',
              };
              const statusLabels: Record<string, string> = {
                supported: t.fraud.schemeSupported,
                contradicted: t.fraud.schemeContradicted,
                unknown: t.fraud.schemeUnknown,
              };

              return (
                <div
                  key={`${finding.schemeId}-${finding.claimType}`}
                  className={`rounded-lg border p-3 ${statusTones[finding.status]}`}
                >
                  <div className="flex items-start gap-2">
                    <span aria-hidden="true" className="text-lg font-bold leading-6">
                      {statusGlyphs[finding.status]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink">{finding.schemeName}</p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {translateSchemeFindingExplanation(finding.explanation, finding.schemeName, t)}
                      </p>
                      <p className="text-xs font-medium text-gray-500 mt-1">
                        {statusLabels[finding.status]}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            {/* Recognized schemes without findings */}
            {result.recognizedSchemes
              .filter(
                (rs) =>
                  !result.schemeFindings.some((f) => f.schemeId === rs.schemeId)
              )
              .map((rs) => (
                <div key={rs.schemeId} className="rounded-lg border border-rule bg-white p-3">
                  <div className="flex items-start gap-2">
                    <span aria-hidden="true" className="text-lg font-bold leading-6 text-gray-400">
                      ●
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink">{rs.schemeName}</p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {t.fraud.schemeRecognizedDesc}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}

      {/* Important limitation / disclaimer */}
      <div className="border-t border-rule pt-4">
        <p className="text-xs text-gray-400">{t.fraud.disclaimer}</p>
        {hasSignals && (
          <p className="text-xs text-gray-400 mt-1">
            {t.fraud.explanationAdditionalDisclaimer}
          </p>
        )}
      </div>
    </div>
  );
}

FraudExplanation.displayName = 'FraudExplanation';