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
  // "enter your" patterns for credential requests (direct)
  /enter\s+your\s+(atm\s+)?pin/i,
  /enter\s+your\s+(banking\s+)?password/i,
  /enter\s+your\s+login\s+credentials/i,
  /enter\s+your\s+debit\s+pin/i,
  /provide\s+your\s+(atm\s+)?pin/i,
  /provide\s+your\s+(banking\s+)?password/i,
  // "enter your ... pin/password" with intervening words (e.g., "enter your account details, atm pin")
  /enter\s+your\s+[^.]*?\b(?:atm\s+)?pin\b/i,
  /enter\s+your\s+[^.]*?\b(?:banking\s+)?password\b/i,
  /enter\s+your\s+[^.]*?\blogin\s+credentials\b/i,
  /enter\s+your\s+[^.]*?\bdebit\s+pin\b/i,
  /provide\s+your\s+[^.]*?\b(?:atm\s+)?pin\b/i,
  /provide\s+your\s+[^.]*?\b(?:banking\s+)?password\b/i,
  // "enter the ... pin/password" patterns
  /enter\s+the\s+[^.]*?\b(?:atm\s+)?pin\b/i,
  /enter\s+the\s+[^.]*?\b(?:banking\s+)?password\b/i,
  /enter\s+the\s+[^.]*?\blogin\s+credentials\b/i,
  /enter\s+the\s+[^.]*?\bdebit\s+pin\b/i,
  // "input your/the ... pin/password" patterns
  /input\s+your\s+[^.]*?\b(?:atm\s+)?pin\b/i,
  /input\s+your\s+[^.]*?\b(?:banking\s+)?password\b/i,
  /input\s+the\s+[^.]*?\b(?:atm\s+)?pin\b/i,
  /input\s+the\s+[^.]*?\b(?:banking\s+)?password\b/i,
  // "enter/input ... pin/password" WITHOUT "your/the" (e.g., "enter atm pin, password and otp")
  /enter\s+[^.]*?\b(?:atm\s+)?pin\b/i,
  /enter\s+[^.]*?\b(?:banking\s+)?password\b/i,
  /enter\s+[^.]*?\blogin\s+credentials\b/i,
  /enter\s+[^.]*?\bdebit\s+pin\b/i,
  /input\s+[^.]*?\b(?:atm\s+)?pin\b/i,
  /input\s+[^.]*?\b(?:banking\s+)?password\b/i,
  /provide\s+[^.]*?\b(?:atm\s+)?pin\b/i,
  /provide\s+[^.]*?\b(?:banking\s+)?password\b/i,
  /share\s+[^.]*?\b(?:atm\s+)?pin\b/i,
  /share\s+[^.]*?\b(?:banking\s+)?password\b/i,
  /send\s+[^.]*?\b(?:atm\s+)?pin\b/i,
  /send\s+[^.]*?\b(?:banking\s+)?password\b/i,
  /give\s+[^.]*?\b(?:atm\s+)?pin\b/i,
  /give\s+[^.]*?\b(?:banking\s+)?password\b/i,
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
      matchedText: extractMatchedPhrase(normalizedText, REQUEST_PATTERNS),
    };
  }

  return null;
}
