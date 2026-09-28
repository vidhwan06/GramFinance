/**
 * Personal UPI rule.
 *
 * Detects explicit UPI/payment identifiers where possible.
 * Does NOT label the entire message fraudulent solely because a UPI ID appears.
 * It is only a risk indicator (signal).
 */

import type { FraudSignalMatch } from '@/lib/fraud/types';

const SIGNAL = {
  code: 'PERSONAL_UPI',
  name: 'Personal UPI payment request',
  severity: 'medium' as const,
  weight: 20,
  category: 'payment' as const,
  description:
    'The message requests payment to a personal UPI identifier in a context where an official government or institutional payment channel would normally be expected.',
};

// Match UPI IDs like: user@bank, 9876543210@upi
const UPI_ID_PATTERN = /[\w.\-]{2,}@[\w.\-]{3,}/;

// Also match common UPI payment request phrases
const UPI_REQUEST_PATTERNS = [
  /pay\s+(?:to\s+this\s+|to\s+my\s+|to\s+the\s+)?upi/i,
  /send\s+(?:money\s+|)\w*\s+(?:via|through|on)\s+upi/i,
  /pay\s+(?:via|through|on)\s+(?:this\s+|my\s+)?upi/i,
  /transfer\s+(?:via|through)\s+upi/i,
  /upi\s+(?:id|number|payment\s+address)/i,
];

export function detectPersonalUPI(
  normalizedText: string
): FraudSignalMatch | null {
  const hasUpiId = UPI_ID_PATTERN.test(normalizedText);
  const hasUpiRequest = UPI_REQUEST_PATTERNS.some((pattern) =>
    pattern.test(normalizedText)
  );

  if (hasUpiId || hasUpiRequest) {
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
