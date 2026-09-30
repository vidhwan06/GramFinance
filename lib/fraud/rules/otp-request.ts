/**
 * OTP Request rule.
 *
 * Detects clear requests for OTPs, one-time passwords, verification
 * codes, or security codes. Distinguishes a request from merely
 * mentioning the word.
 *
 * Negative: "Never share your OTP with anyone." does NOT trigger.
 */

import type { FraudSignalMatch } from '@/lib/fraud/types';

const SIGNAL = {
  code: 'OTP_REQUEST',
  name: 'OTP request',
  severity: 'high' as const,
  weight: 40,
  category: 'credential' as const,
  description:
    'The message asks the recipient to disclose a one-time password or verification code.',
};

// Request patterns that indicate the user is being asked for an OTP
const REQUEST_PATTERNS = [
  /send\s+me\s+your\s+otp/i,
  /share\s+the\s+verification\s+code/i,
  /give\s+me\s+the\s+one-time\s+password/i,
  /give\s+me\s+the\s+otp/i,
  /send\s+me\s+the\s+otp/i,
  /provide\s+your\s+otp/i,
  /share\s+your\s+otp/i,
  /tell\s+me\s+your\s+otp/i,
  /send\s+your\s+otp/i,
  /share\s+me\s+the\s+otp/i,
  // "share the otp you receive" / "otp you receive" patterns
  /share\s+the\s+otp\s+you\s+receive/i,
  /otp\s+you\s+receive/i,
  /provide\s+the\s+otp\s+you\s+receive/i,
  /send\s+the\s+otp\s+you\s+receive/i,
  // "send the otp received" / "otp received" patterns
  /send\s+the\s+otp\s+received/i,
  /share\s+the\s+otp\s+received/i,
  /provide\s+the\s+otp\s+received/i,
  /otp\s+received\s+on\s+(?:your\s+)?(?:mobile|phone)/i,
  /send\s+otp\s+received/i,
  /share\s+otp\s+received/i,
  // "enter your otp" / "enter the otp" patterns
  /enter\s+your\s+otp/i,
  /enter\s+the\s+otp/i,
  /input\s+your\s+otp/i,
  /input\s+the\s+otp/i,
  // "enter your ... otp" with words in between (e.g., "enter your atm pin and otp")
  /enter\s+your\s+[^.]*?\botp\b/i,
  /enter\s+the\s+[^.]*?\botp\b/i,
  // "enter ... otp" / "input ... otp" without "your/the" (e.g., "enter atm pin and otp")
  /enter\s+[^.]*?\botp\b/i,
  /input\s+[^.]*?\botp\b/i,
  // "provide ... otp" / "share ... otp" / "send ... otp" / "give ... otp" without "your/me/the"
  /provide\s+[^.]*?\botp\b/i,
  /share\s+[^.]*?\botp\b/i,
  /send\s+[^.]*?\botp\b/i,
  /give\s+[^.]*?\botp\b/i,
];

// Negative indicators - the message is warning against sharing, not requesting
const NEGATIVE_PATTERNS = [
  /\bnever\s+(?:share|give|send|tell|disclose)\b/i,
  /\bdo\s+not\s+(?:share|give|send|tell|disclose)\b/i,
  /\bdon['’]t\s+share\b/i,
  /\byou\s+should\s+never\s+share\b/i,
  /\bnever\s+give\s+anyone\b/i,
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

export function detectOtpRequest(normalizedText: string): FraudSignalMatch | null {
  const hasOtpKeyword =
    /\botp\b/i.test(normalizedText) ||
    /one-time\s+password/i.test(normalizedText) ||
    /verification\s+code/i.test(normalizedText) ||
    /security\s+code/i.test(normalizedText);

  const hasRequestLanguage = REQUEST_PATTERNS.some((pattern) =>
    pattern.test(normalizedText)
  );

  // Check for negative/warning context
  const hasNegativeContext = NEGATIVE_PATTERNS.some((pattern) =>
    pattern.test(normalizedText)
  );

  if (hasOtpKeyword && hasRequestLanguage && !hasNegativeContext) {
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
