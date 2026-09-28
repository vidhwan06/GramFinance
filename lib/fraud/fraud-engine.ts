/**
 * Fraud Engine.
 *
 * Orchestrates the fraud checking pipeline:
 *   input → normalize → run enabled rules → collect signal matches
 *   → calculate risk → generate recommendations → return explainable result
 *
 * Does not directly access the database. Deterministic and independently
 * testable.
 */

import { normalizeInput } from '@/lib/fraud/normalizer';
import { calculateRiskScore, mapRiskLevel } from '@/lib/fraud/risk-calculator';
import { generateRecommendations } from '@/lib/fraud/recommendations';
import { detectOtpRequest } from '@/lib/fraud/rules/otp-request';
import { detectAccountAccessRequest } from '@/lib/fraud/rules/account-access-request';
import { detectUrgentPayment } from '@/lib/fraud/rules/urgent-payment';
import { detectUnofficialFee } from '@/lib/fraud/rules/unofficial-fee';
import { detectPersonalUPI } from '@/lib/fraud/rules/personal-upi';
import { detectSuspiciousLink } from '@/lib/fraud/rules/suspicious-link';
import { detectFakeGovernmentClaim } from '@/lib/fraud/rules/fake-government-claim';
import { recognizeSchemes } from '@/lib/fraud/scheme-recognition';
import { analyzeSchemeClaims } from '@/lib/fraud/scheme-claim-analyzer';
import type {
  FraudCheckRequest,
  FraudCheckResult,
  FraudSignalMatch,
  RecognizedScheme,
  SchemeClaimFinding,
} from '@/lib/fraud/types';
import type { SchemeListItem } from '@/features/schemes/schemes-service';

// Ordered list of all detection rules
const RULES = [
  detectOtpRequest,
  detectAccountAccessRequest,
  detectUrgentPayment,
  detectUnofficialFee,
  detectPersonalUPI,
  detectSuspiciousLink,
  detectFakeGovernmentClaim,
];

export function runFraudEngine(
  request: FraudCheckRequest,
  options?: {
    activeSchemes?: SchemeListItem[];
  }
): FraudCheckResult {
  // Step 1: Normalize input
  const { original, normalized } = normalizeInput(request.text);

  // Step 2: Run all enabled rules
  const matches: FraudSignalMatch[] = [];

  for (const rule of RULES) {
    const match = rule(normalized);
    if (match) {
      matches.push(match);
    }
  }

  // Step 3: Calculate risk score
  const signalWeights = matches.map((m) => m.weight);
  const riskScore = calculateRiskScore(signalWeights);
  const riskLevel = mapRiskLevel(riskScore);

  // Step 4: Generate recommendations
  const signalCodes = matches.map((m) => m.code);
  const recommendations = generateRecommendations(signalCodes);

  // Step 5: Scheme recognition (optional, server-side)
  const recognizedSchemes: RecognizedScheme[] = options?.activeSchemes
    ? recognizeSchemes(normalized, options.activeSchemes)
    : [];

  // Step 6: Scheme claim analysis (only if schemes were recognized)
  const schemeFindings: SchemeClaimFinding[] =
    recognizedSchemes.length > 0 && options?.activeSchemes
      ? analyzeSchemeClaims(original, recognizedSchemes, options.activeSchemes)
      : [];

  // Step 7: Return explainable result
  return {
    riskLevel,
    riskScore,
    signals: matches,
    recommendations,
    recognizedSchemes,
    schemeFindings,
  };
}
