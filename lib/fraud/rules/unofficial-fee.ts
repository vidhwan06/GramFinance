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
  // "pay a ₹X processing fee" / "pay a ₹X fee" - standalone fee mention in government/benefit context
  // Handles both "₹500" and "500" (currency symbol directly before number, no space)
  /pay\s+(?:a\s+|)(?:(?:₹|rs\.?|rupees?)\s*\d+|\d+\s*(?:₹|rs\.?|rupees?))\s+(?:processing\s+|registration\s+|application\s+|service\s+)?fee\b/i,
  /pay\s+(?:a\s+|)\w*\s*processing\s+fee\b/i,
  // "pay a ₹X fee" / "pay a fee" - generic fee with amount (with rupee symbol)
  /pay\s+(?:a\s+|)(?:(?:₹|rs\.?|rupees?)\s*\d+|\d+\s*(?:₹|rs\.?|rupees?))\s+fee\b/i,
  // "pay a 500 fee" - generic fee with plain number
  /pay\s+(?:a\s+|)(?:\d+\s+)?fee\b/i,
  // "send the fee" / "send fee" in government/benefit context
  /send\s+(?:the\s+|)\w*\s*fee\s+(?:immediately|to\s+upi|to\s+\w+@\w+)/i,
  // "charge" variants - verification charge, processing charge, etc.
  /pay\s+(?:a\s+|)(?:\d+\s+)?(?:rupees?|₹|rs\.?)\s+(?:verification|processing|registration|application|service)\s+charge\b/i,
  /pay\s+(?:a\s+|)\w*\s*(?:verification|processing|registration|application|service)\s+charge\b/i,
  /pay\s+(?:a\s+|)(?:\d+\s+)?(?:rupees?|₹|rs\.?)\s+charge\b/i,
  /pay\s+(?:a\s+|)(?:\d+\s+)?charge\b/i,
  // "pay X as a refundable/non-refundable verification/processing charge" - allow "as a" + adjectives
  // Handle both "₹299" and "299 ₹" formats
  /pay\s+(?:a\s+|)(?:(?:rupees?|₹|rs\.?)\s*\d+|\d+\s*(?:rupees?|₹|rs\.?))\s+(?:as\s+a\s+)?(?:\w+\s+)?(?:verification|processing|registration|application|service)\s+charge\b/i,
  // "pay 299 as a refundable verification charge" - without currency symbol
  /pay\s+(?:a\s+|)(?:\d+\s+)(?:as\s+a\s+)?(?:\w+\s+)?(?:verification|processing|registration|application|service)\s+charge\b/i,
  // Passive voice: "will be deducted/charged/debited" + fee/charge
  // Both orders: "charge will be deducted" or "will be deducted charge"
  /\b(?:will\s+be|is\s+to\s+be)\s+(?:deducted|charged|debited)\b.*\b(?:fee|charge)\b/i,
  /\b(?:deducted|charged|debited)\b.*\b(?:fee|charge)\b/i,
  // "fee/charge will be deducted/charged" - fee/charge first, then verb
  /\b(?:fee|charge)\b.*\b(?:will\s+be|is\s+to\s+be)\s+(?:deducted|charged|debited)\b/i,
  /\b(?:fee|charge)\b.*\b(?:deducted|charged|debited)\b/i,
  // "send the charge" / "send charge" in government/benefit context
  /send\s+(?:the\s+|)\w*\s*charge\s+(?:immediately|to\s+upi|to\s+\w+@\w+)/i,
  // "charge is pending... pay" / "pending charge... pay" patterns
  /\bcharge\b.{0,100}?\bpending\b.{0,100}?\bpay\b/i,
  /\bfee\b.{0,100}?\bpending\b.{0,100}?\bpay\b/i,
  // "pay the amount" / "pay the amount of" when charge/fee mentioned nearby
  /\b(?:fee|charge)\b.{0,150}?\bpay\s+(?:the\s+)?amount\b/i,
  // "clearance charge" / "customs charge" / "delivery charge" type patterns
  /\b(?:clearance|customs|delivery|processing|service)\s+charge\b/i,
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
