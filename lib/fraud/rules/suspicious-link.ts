/**
 * Suspicious Link rule.
 *
 * Phase 1 is conservative. Only detects simple deterministic indicators:
 *   - obvious IP-address URLs
 *   - suspicious URL structure
 *   - misleading government-like domains
 */

import type { FraudSignalMatch } from '@/lib/fraud/types';

const SIGNAL = {
  code: 'SUSPICIOUS_LINK',
  name: 'Suspicious link',
  severity: 'medium' as const,
  weight: 20,
  category: 'link' as const,
  description:
    'The message contains a link that matches clearly suspicious characteristics.',
};

// Match URLs with IP addresses as domains (e.g., http://192.168.1.1/path)
const IP_URL_PATTERN = /https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/;

// Match URLs that look like they impersonate government but are suspicious
// e.g., gov-login.com, gov-portal.xyz, aadhaar-verify.net
const SUSPICIOUS_DOMAIN_PATTERNS = [
  /\b(gov|aadhaar|pan|upi|bank|rupayer|gov-in)[a-z0-9\-]*\.(com|net|xyz|tk|ml|ga|cf|biz|info)\b/i,
  /https?:\/\/[a-z0-9\-]*(gov|aadhaar|pan|bank|rupayer)[a-z0-9\-]*\.(com|net|xyz|tk|ml|ga)/i,
];

export function detectSuspiciousLink(normalizedText: string): FraudSignalMatch | null {
  const hasIpUrl = IP_URL_PATTERN.test(normalizedText);

  const hasSuspiciousDomain = SUSPICIOUS_DOMAIN_PATTERNS.some((pattern) =>
    pattern.test(normalizedText)
  );

  if (hasIpUrl || hasSuspiciousDomain) {
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
