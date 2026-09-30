/**
 * Fake Government Claim rule.
 *
 * Creates the signal in the registry and domain model so that Phase 2
 * can use GramFinance's scheme database for cross-referencing.
 *
 * Phase 1: The rule detects patterns suggesting a government-scheme claim
 * that conflicts with known structured information. Full scheme
 * cross-referencing is deferred to Phase 2.
 */

import type { FraudSignalMatch } from '@/lib/fraud/types';

const SIGNAL = {
  code: 'FAKE_GOVERNMENT_CLAIM',
  name: 'Potentially misleading government claim',
  severity: 'high' as const,
  weight: 35,
  category: 'government_claim' as const,
  description:
    'The message makes a government-scheme claim that conflicts with known structured information.',
};

// Patterns suggesting government-scheme claims that could be misleading
// Phase 1: conservative detection of claim language only
const GOVERNMENT_CLAIM_PATTERNS = [
  /guaranteed\s+(?:approval|sanction|loan|benefit)/i,
  /you\s+have\s+been\s+selected\s+for\s+(?:a\s+)?government\s+scheme/i,
  /you\s+are\s+eligible\s+for\s+(?:a\s+)?government\s+scheme/i,
  /apply\s+now\s+for\s+(?:a\s+)?government\s+scheme/i,
  /exclusive\s+(?:government\s+)?benefit/i,
  /government\s+scheme\s+(?:has\s+been\s+approved\s+for\s+|is\s+available\s+to\s+)you/i,
  /you\s+are\s+pre-qualified\s+for\s+(?:a\s+)?government\s+benefit/i,
  // "government benefit" claim variants - allow optional text between "a" and "government benefit"
  /you\s+have\s+been\s+selected\s+for\s+(?:a\s+[^.]*?)?government\s+benefit/i,
  /you\s+are\s+eligible\s+for\s+(?:a\s+[^.]*?)?government\s+benefit/i,
  /government\s+benefit\s+(?:has\s+been\s+approved\s+for\s+|is\s+available\s+to\s+)you/i,
  // "government assistance" / "government payment" / "financial assistance" claim variants
  // Support both "you have been selected" and "has been selected" / "was selected" patterns
  /(?:you\s+have|has|was)\s+been\s+selected\s+for\s+(?:a\s+[^.]*?)?government\s+assistance/i,
  /(?:you\s+are|is)\s+eligible\s+for\s+(?:a\s+[^.]*?)?government\s+assistance/i,
  /(?:you\s+have|has|was)\s+been\s+selected\s+for\s+(?:a\s+[^.]*?)?government\s+payment/i,
  /(?:you\s+are|is)\s+eligible\s+for\s+(?:a\s+[^.]*?)?government\s+payment/i,
  /(?:you\s+have|has|was)\s+been\s+selected\s+for\s+(?:a\s+[^.]*?)?financial\s+assistance/i,
  /(?:you\s+are|is)\s+eligible\s+for\s+(?:a\s+[^.]*?)?financial\s+assistance/i,
  // "selected for [scheme name] benefit" patterns (e.g., "selected for PM-KISAN benefit")
  /(?:you\s+have|has|was)\s+been\s+selected\s+for\s+(?:a\s+[^.]*?)?(?:pm-?kisan|pmuy|pm-?vishwakarma|ganga-?kalyan|aadhaar|ayushman|jan-?dhan|mudra|standup|startup)\s+benefit/i,
  /you\s+are\s+eligible\s+for\s+(?:a\s+[^.]*?)?(?:pm-?kisan|pmuy|pm-?vishwakarma|ganga-?kalyan|aadhaar|ayushman|jan-?dhan|mudra|standup|startup)\s+benefit/i,
  // "congratulations" + government/scheme benefit claim
  /congratulations[^.]*?(?:government|scheme|benefit|pm-?kisan|pmuy|pm-?vishwakarma|ganga-?kalyan|aadhaar|ayushman|jan-?dhan|mudra)/i,
];

export function detectFakeGovernmentClaim(
  normalizedText: string
): FraudSignalMatch | null {
  for (const pattern of GOVERNMENT_CLAIM_PATTERNS) {
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
