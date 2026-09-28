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
  /\bsend\s+money\b/i,
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
];

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
      matchedText: normalizedText,
    };
  }

  return null;
}
