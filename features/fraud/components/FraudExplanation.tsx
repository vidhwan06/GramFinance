'use client';

import React from 'react';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { copy } from '@/features/fraud/presentation/copy';
import type { FraudCheckResult, FraudSignalMatch } from '@/lib/fraud/types';
import {
  getTranslatedSignalName,
  getTranslatedSignalExplanation,
  getTranslatedWhyItMatters,
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
 * Summary card: what the message appears to be trying to do (or, with no
 * signals, what it appears to say). Stitch composition — eyebrow + heading +
 * plain-language paragraph on a white card.
 */
export function FraudExplanation({ result }: FraudExplanationProps) {
  const { t, language } = useLanguage();
  const c = copy[language === 'kn' ? 'kn' : 'en'];
  const hasSignals = result.signals.length > 0;

  return (
    <section
      aria-labelledby="summary-heading"
      className="rounded-xl bg-surface-container-lowest shadow-sm border border-outline-variant/50 p-space-md lg:p-space-lg"
    >
      <span className="font-label-sm text-label-sm text-secondary font-bold uppercase tracking-wider">
        {c.summaryEyebrow}
      </span>
      <h3
        id="summary-heading"
        className="font-title-lg text-title-lg text-on-surface mt-1"
      >
        {hasSignals ? t.fraud.explanationWhatMessageDoes : t.fraud.explanationWhatMessageSays}
      </h3>
      <p className="mt-space-sm font-body-md text-body-md text-on-surface-variant leading-relaxed">
        {hasSignals ? generateMessageSummary(result.signals, t) : t.fraud.explanationGenuineDesc}
      </p>
    </section>
  );
}

FraudExplanation.displayName = 'FraudExplanation';
