/**
 * Account Access Request rule.
 *
 * Looks for requests involving passwords, PINs, banking passwords,
 * login credentials, or debit/ATM PINs.
 *
 * Negative: "Never share your PIN." does NOT trigger.
 */

import type { FraudSignalMatch } from '@/lib/fraud/types';

const SIGNAL = {
  code: 'ACCOUNT_ACCESS_REQUEST',
  name: 'Account access request',
  severity: 'high' as const,
  weight: 40,
  category: 'credential' as const,
  description:
    'The message requests banking passwords, PINs, login credentials, or other sensitive account-access information.',
};

// Request patterns that indicate the user is being asked for credentials
const REQUEST_PATTERNS = [
  /send\s+me\s+your\s+(banking\s+)?password/i,
  /send\s+your\s+(banking\s+)?password/i,
  /share\s+your\s+password/i,
  /give\s+me\s+your\s+password/i,
  /send\s+your\s+password/i,
  /send\s+me\s+your\s+pin/i,
  /give\s+me\s+your\s+atm\s+pin/i,
  /share\s+your\s+pin/i,
  /give\s+me\s+your\s+pin/i,
  /send\s+me\s+your\s+atm\s+pin/i,
  /share\s+your\s+atm\s+pin/i,
  /send\s+me\s+your\s+login\s+credentials/i,
  /share\s+your\s+login\s+credentials/i,
  /provide\s+your\s+login\s+credentials/i,
  /give\s+me\s+your\s+banking\s+password/i,
  /send\s+me\s+your\s+debit\s+pin/i,
  /share\s+your\s+debit\s+pin/i,
  /give\s+me\s+your\s+pin/i,
  // "enter your" patterns for credential requests
  /enter\s+your\s+(atm\s+)?pin/i,
  /enter\s+your\s+(banking\s+)?password/i,
  /enter\s+your\s+login\s+credentials/i,
  /enter\s+your\s+debit\s+pin/i,
  /provide\s+your\s+(atm\s+)?pin/i,
  /provide\s+your\s+(banking\s+)?password/i,
];

// Negative indicators
const NEGATIVE_PATTERNS = [
  /\bnever\s+(?:share|give|send|tell|disclose)\b/i,
  /\bdo\s+not\s+(?:share|give|send|tell|disclose)\b/i,
  /\bdon['’]t\s+share\b/i,
  /\byou\s+should\s+never\s+share\b/i,
  /\bkeep\s+your\s+(password|pin)\b/i,
  /\bprivate\s+(password|pin)\b/i,
];

export function detectAccountAccessRequest(
  normalizedText: string
): FraudSignalMatch | null {
  const hasCredentialKeyword =
    /\bpassword\b/i.test(normalizedText) ||
    /\bpin\b/i.test(normalizedText) ||
    /\blogin\s+credentials?\b/i.test(normalizedText) ||
    /\batm\s+pin\b/i.test(normalizedText) ||
    /\bdebit\s+pin\b/i.test(normalizedText) ||
    /\bbanking\s+password\b/i.test(normalizedText);

  const hasRequestLanguage = REQUEST_PATTERNS.some((pattern) =>
    pattern.test(normalizedText)
  );

  const hasNegativeContext = NEGATIVE_PATTERNS.some((pattern) =>
    pattern.test(normalizedText)
  );

  if (hasCredentialKeyword && hasRequestLanguage && !hasNegativeContext) {
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
