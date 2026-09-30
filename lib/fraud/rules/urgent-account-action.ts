/**
 * Urgent Account Action rule.
 *
 * Detects urgency/threat language combined with account/credential context
 * (but NOT payment context). This captures phishing messages that pressure
 * the user to take urgent action on their account (KYC, verification, etc.)
 * without explicitly demanding money.
 */

import type { FraudSignalMatch } from '@/lib/fraud/types';

const SIGNAL = {
  code: 'URGENT_ACCOUNT_ACTION',
  name: 'Urgent account action demand',
  severity: 'high' as const,
  weight: 25,
  category: 'urgency' as const,
  description:
    'The message uses urgent or threatening language to pressure the recipient into taking immediate action on their account (e.g., KYC update, verification, reactivation).',
};

// Account/credential related keywords that indicate this is about account access
const ACCOUNT_CONTEXT_KEYWORDS = [
  /kyc/i,
  /know\s+your\s+customer/i,
  /verif[y|ication]/i,
  /account\s+(?:detail|update|suspend|block|close|freeze|lock)/i,
  /login/i,
  /password/i,
  /pin/i,
  /otp/i,
  /one-time\s+password/i,
  /credential/i,
  /banking/i,
  /bank\s+account/i,
  /suspend/i,
  /reactivate/i,
  /update\s+your\s+account/i,
  /complete\s+verification/i,
];

// Urgency/threat patterns (similar to urgent-payment but focused on account actions)
const URGENCY_PATTERNS = [
  /immediately/i,
  /right\s+now/i,
  /now\b/i,
  /urgent/i,
  /account\s+will\s+be\s+blocked/i,
  /will\s+be\s+blocked/i,
  /will\s+be\s+suspended/i,
  /will\s+be\s+closed/i,
  /will\s+expire/i,
  /last\s+chance/i,
  /act\s+now/i,
  /limited\s+time/i,
  /within\s+\d+\s+hours?/i,
  /within\s+\d+\s+minutes/i,
  /final\s+notice/i,
  /avoid\s+(?:account\s+)?(?:suspension|block|closure)/i,
  /prevent\s+(?:account\s+)?(?:suspension|block|closure)/i,
  /expired\s+(?:kyc|verification)/i,
];

/**
 * Extract the specific matched phrase for a signal.
 * Returns the shortest matching substring that triggered the detection.
 */
function extractMatchedPhrase(text: string, patterns: RegExp[]): string {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      // Return a reasonable context around the match (up to 120 chars)
      const start = Math.max(0, match.index! - 20);
      const end = Math.min(text.length, match.index! + match[0].length + 20);
      return text.slice(start, end).trim();
    }
  }
  return text; // fallback to full text
}

export function detectUrgentAccountAction(
  normalizedText: string
): FraudSignalMatch | null {
  const hasAccountContext = ACCOUNT_CONTEXT_KEYWORDS.some((pattern) =>
    pattern.test(normalizedText)
  );

  const hasUrgency = URGENCY_PATTERNS.some((pattern) =>
    pattern.test(normalizedText)
  );

  // Also check for payment language - if present, this should be URGENT_PAYMENT instead
  const hasPaymentLanguage =
    /\bpay\b/i.test(normalizedText) ||
    /\bsend\s+money\b/i.test(normalizedText) ||
    /\btransfer\b/i.test(normalizedText);

  if (hasAccountContext && hasUrgency && !hasPaymentLanguage) {
    return {
      code: SIGNAL.code,
      name: SIGNAL.name,
      severity: SIGNAL.severity,
      weight: SIGNAL.weight,
      explanation: SIGNAL.description,
      matchedText: extractMatchedPhrase(normalizedText, [...ACCOUNT_CONTEXT_KEYWORDS, ...URGENCY_PATTERNS]),
    };
  }

  return null;
}