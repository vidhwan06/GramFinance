/**
 * Suspicious Link rule.
 *
 * Phase 1 is conservative. Only detects simple deterministic indicators:
 *   - obvious IP-address URLs
 *   - suspicious URL structure
 *   - misleading government-like domains
 *   - scheme-name-like domains used for phishing (pm-kisan-*, pmuy-*, etc.)
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

// Match banking/KYC phishing domains (secure, verify, kyc, update, login, account)
// Also covers parcel/delivery/customs phishing scams
// These match anywhere in the URL, not just at domain boundaries, to catch subdomains and unusual TLDs
const BANKING_PHISHING_PATTERNS = [
  // kyc, k-y-c variations
  /k[-]?yc[a-z0-9\-]*/i,
  // verify, verification variations
  /verif[y]?[a-z0-9\-]*/i,
  // secure, security variations (when combined with banking terms)
  /secure[a-z0-9\-]*/i,
  // update, update- variations
  /update[a-z0-9\-]*/i,
  // login, log-in variations
  /login[a-z0-9\-]*/i,
  // account, acct variations
  /account[a-z0-9\-]*/i,
  // parcel, parcel- variations (parcel delivery scams)
  /parcel[a-z0-9\-]*/i,
  // clearance, customs variations (customs clearance scams)
  /clearance[a-z0-9\-]*/i,
  // customs variations
  /customs[a-z0-9\-]*/i,
  // delivery, delivery- variations (parcel delivery scams)
  /delivery[a-z0-9\-]*/i,
  // payment, payment- variations
  /payment[a-z0-9\-]*/i,
];

// Match scheme-name-like domains used for phishing (pm-kisan, pmuy, pm-vishwakarma, ganga-kalyan, etc.)
// These match anywhere in the URL, not just at domain boundaries, to catch subdomains and unusual TLDs
const SCHEME_PHISHING_PATTERNS = [
  // pm-kisan, pm kisan, pmkisan variations
  /pm[-\s]?kisan[a-z0-9\-]*/i,
  // pmuy, pm uy, pmuy variations
  /pm[-\s]?uy[a-z0-9\-]*/i,
  // pm-vishwakarma, pm vishwakarma variations
  /pm[-\s]?vishwakarma[a-z0-9\-]*/i,
  // ganga-kalyan, ganga kalyan variations
  /ganga[-\s]?kalyan[a-z0-9\-]*/i,
  // aadhaar, aadhaar- variations (common phishing target)
  /aadhaar[a-z0-9\-]*/i,
];

export function detectSuspiciousLink(normalizedText: string): FraudSignalMatch | null {
  const hasIpUrl = IP_URL_PATTERN.test(normalizedText);

  const hasSuspiciousDomain = SUSPICIOUS_DOMAIN_PATTERNS.some((pattern) =>
    pattern.test(normalizedText)
  );

  // Check for scheme phishing patterns in URLs
  const hasSchemePhishing = SCHEME_PHISHING_PATTERNS.some((pattern) => {
    // Only match if it's in a URL context (http/https)
    const urlMatches = normalizedText.match(/https?:\/\/[^\s]+/g);
    if (!urlMatches) return false;
    return urlMatches.some((url) => pattern.test(url));
  });

  // Check for banking/KYC phishing patterns in URLs
  const hasBankingPhishing = BANKING_PHISHING_PATTERNS.some((pattern) => {
    // Only match if it's in a URL context (http/https)
    const urlMatches = normalizedText.match(/https?:\/\/[^\s]+/g);
    if (!urlMatches) return false;
    return urlMatches.some((url) => pattern.test(url));
  });

  if (hasIpUrl || hasSuspiciousDomain || hasSchemePhishing || hasBankingPhishing) {
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
