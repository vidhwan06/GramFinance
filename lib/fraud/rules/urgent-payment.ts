/**
 * Urgent Payment rule.
 *
 * Detects combinations of payment language + urgency/pressure.
 *
 * Do not flag every occurrence of "payment" by itself.
 * Only triggers when both payment and urgency concepts are present.
 */

import type { FraudSignalMatch } from '@/lib/fraud/types';

const SIGNAL = {
  code: 'URGENT_PAYMENT',
  name: 'Urgent payment demand',
  severity: 'medium' as const,
  weight: 15,
  category: 'urgency' as const,
  description:
    'A message uses urgent or threatening language to pressure the recipient into making a payment.',
};

const PAYMENT_KEYWORDS = [
  /\bpay\b/i,
  /\bpay\w*/i,
  /\bsend\s+money\b/i,
  /\bsend\s+payment\b/i,
  /\btransfer\b/i,
  /\bsend\s+immediately\b/i,
];

const URGENCY_PATTERNS = [
  /immediately/i,
  /right\s+now/i,
  /now\b/i,
  /urgent/i,
  /account\s+will\s+be\s+blocked/i,
  /benefit\s+will\s+expire/i,
  /will\s+be\s+blocked/i,
  /will\s+expire/i,
  /last\s+chance/i,
  /act\s+now/i,
  /limited\s+time/i,
  /within\s+\d+\s+hours?/i,
  /within\s+\d+\s+minutes/i,
  /reactivate/i,
  /final\s+notice/i,
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

export function detectUrgentPayment(
  normalizedText: string
): FraudSignalMatch | null {
  const hasPaymentLanguage = PAYMENT_KEYWORDS.some((pattern) =>
    pattern.test(normalizedText)
  );

  const hasUrgency = URGENCY_PATTERNS.some((pattern) =>
    pattern.test(normalizedText)
  );

  if (hasPaymentLanguage && hasUrgency) {
    return {
      code: SIGNAL.code,
      name: SIGNAL.name,
      severity: SIGNAL.severity,
      weight: SIGNAL.weight,
      explanation: SIGNAL.description,
      matchedText: extractMatchedPhrase(normalizedText, [...PAYMENT_KEYWORDS, ...URGENCY_PATTERNS]),
    };
  }

  return null;
}
