/**
 * Unofficial Fee rule.
 *
 * Looks for concepts such as paying fees to receive government benefits,
 * processing fees, registration fees, or money to release loans.
 *
 * This should be contextual - not just any mention of fees.
 * Negative: "Do not pay anyone to receive government benefits." does NOT trigger.
 */

import type { FraudSignalMatch } from '@/lib/fraud/types';

const SIGNAL = {
  code: 'UNOFFICIAL_FEE',
  name: 'Unofficial fee request',
  severity: 'high' as const,
  weight: 35,
  category: 'payment' as const,
  description:
    'The message claims that the recipient must make an unofficial payment to receive a government benefit, approval, subsidy, loan, or scheme benefit.',
};

// Patterns that combine payment language with government benefit context
// Must NOT contain negative/warning language
const NEGATIVE_PATTERNS = [
  /\bdo\s+not\s+pay\b/i,
  /\bdon['’]t\s+pay\b/i,
  /\bnever\s+pay\b/i,
  /\byou\s+should\s+not\s+pay\b/i,
];

const FEE_PATTERNS = [
  /pay\s+(?:a\s+|)\w*\s*(?:processing\s+|registration\s+|application\s+|service\s+)?fee\s+(?:to\s+(?:receive\s+|get\s+|obtain\s+))?(?:your\s+)?(?:government\s+|scheme\s+|benefit\s+|subsidy\s+|loan\s+|approval\s+)/i,
  /pay\s+(?:money\s+|)\w*\s*to\s+receive\s+(?:your\s+)?(?:government\s+|scheme\s+|benefit\s+|subsidy\s+|loan\s+|approval\s+)/i,
  /send\s+(?:money\s+|)\w*\s+(?:to\s+(?:receive\s+|get\s+|obtain\s+))(?:your\s+)?(?:government\s+|scheme\s+|benefit\s+|subsidy\s+|loan\s+|approval\s+)/i,
  /pay\s+(?:the\s+|)\w*\s*processing\s+fee\s+to\s+(?:receive|get)/i,
  /pay\s+(?:a\s+|)\w*\s*registration\s+fee\s+(?:to\s+get|to\s+receive)/i,
  /pay\s+(?:money\s+|)\w*\s+to\s+release\s+(?:your\s+)?(?:loan|subsidy)/i,
  /pay\s+(?:the\s+|)\w*\s*fee\s+(?:to\s+(?:get|receive)\s+(?:your\s+)?government)/i,
  /you\s+must\s+pay\s+(?:a\s+|)\w*\s*fee\s+(?:to\s+(?:receive|get)\s+(?:the\s+)?government)/i,
  /pay\s+(?:a\s+|)\w*\s*(?:small\s+|)\w*\s*fee\s+(?:to\s+(?:activate|unlock|release|get)\s+(?:your\s+)?benefit)/i,
  /pay\s+(?:a\s+|)\w*\s*(?:fee\s+|processing\s+fee)\s+(?:to\s+(?:receive|get|obtain)\s+(?:your\s+)?benefit)/i,
  /pay\s+(?:\d+\s+)?(?:rupees?|₹|rs\.?)\s+(?:to\s+(?:receive\s+|get\s+))(?:your\s+)?(?:government\s+|scheme\s+|benefit\s+|subsidy)/i,
  /pay\s+(?:\d+\s+)?\w*\s+to\s+(?:receive\s+|get\s+)(?:your\s+)?(?:benefit|subsidy)/i,
];

export function detectUnofficialFee(
  normalizedText: string
): FraudSignalMatch | null {
  // Check for negative context first
  const hasNegativeContext = NEGATIVE_PATTERNS.some((pattern) =>
    pattern.test(normalizedText)
  );
  if (hasNegativeContext) return null;

  for (const pattern of FEE_PATTERNS) {
    if (pattern.test(normalizedText)) {
      return {
        code: SIGNAL.code,
        name: SIGNAL.name,
        severity: SIGNAL.severity,
        weight: SIGNAL.weight,
        explanation: SIGNAL.description,
        matchedText: normalizedText,
      };
    }
  }

  return null;
}
