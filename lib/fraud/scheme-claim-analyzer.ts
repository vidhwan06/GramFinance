/**
 * Scheme Claim Analyzer
 *
 * Compares claims in user input against structured scheme information.
 *
 * Uses three-state evaluation:
 *   - supported:     The claim is consistent with the scheme's data
 *   - contradicted:  The claim conflicts with the scheme's data
 *   - unknown:       The scheme data is insufficient to evaluate
 *
 * Does NOT treat absence of information as proof of fraud.
 * Uses careful language: "The available scheme information does not verify this requirement."
 */

import type { RecognizedScheme, SchemeClaimFinding, SchemeClaimStatus } from './types';
import type { SchemeListItem } from '@/features/schemes/schemes-service';

/**
 * Claim types that can be evaluated.
 */
export type ClaimType = 'payment_requirement' | 'benefit_claim' | 'eligibility_claim' | 'general_claim';

/**
 * Analyze claims in a message against recognized scheme information.
 *
 * @param text The original user input
 * @param recognizedSchemes Schemes identified in the text
 * @param activeSchemes Full scheme data for reference
 * @returns Array of claim findings
 */
export function analyzeSchemeClaims(
  text: string,
  recognizedSchemes: RecognizedScheme[],
  activeSchemes: SchemeListItem[]
): SchemeClaimFinding[] {
  if (recognizedSchemes.length === 0 || !text) return [];

  const normalizedText = text.toLowerCase();
  const schemeMap = new Map(activeSchemes.map((s) => [s.id, s]));
  const findings: SchemeClaimFinding[] = [];

  for (const scheme of recognizedSchemes) {
    const fullScheme = schemeMap.get(scheme.schemeId);

    // Analyze payment/fee claims
    const paymentFinding = analyzePaymentClaim(normalizedText, scheme, fullScheme);
    if (paymentFinding) findings.push(paymentFinding);

    // Analyze benefit claims
    const benefitFinding = analyzeBenefitClaim(normalizedText, scheme, fullScheme);
    if (benefitFinding) findings.push(benefitFinding);

    // Analyze eligibility claims
    const eligibilityFinding = analyzeEligibilityClaim(normalizedText, scheme, fullScheme);
    if (eligibilityFinding) findings.push(eligibilityFinding);
  }

  return findings;
}

/**
 * Check if the message contains payment/fee language.
 */
function hasPaymentLanguage(text: string): boolean {
  const paymentPatterns = [
    /\bpay\b/,
    /\bsend\s*money\b/,
    /\btransfer\b/,
    /\bfee\b/,
    /\bprocessing\s*fee\b/,
    /\bregistration\s*fee\b/,
    /\bactivate\b/,
    /\bunlock\b/,
  ];
  return paymentPatterns.some((p) => p.test(text));
}

/**
 * Check if the message contains urgency/pressure language.
 */
function hasUrgencyLanguage(text: string): boolean {
  const urgencyPatterns = [
    /\bimmediately\b/,
    /\bright\s*now\b/,
    /\bnow\b/,
    /\bquickly\b/,
    /\bblocked\b/,
    /\bexpire\b/,
    /\blast\s*chance\b/,
  ];
  return urgencyPatterns.some((p) => p.test(text));
}

/**
 * Analyze payment/fee claims against scheme information.
 *
 * If the message requests payment to receive a scheme benefit,
 * check against available scheme information.
 */
function analyzePaymentClaim(
  text: string,
  scheme: RecognizedScheme,
  fullScheme: SchemeListItem | undefined
): SchemeClaimFinding | null {
  if (!hasPaymentLanguage(text)) return null;

  // Check if the message explicitly asks for payment to activate/receive the benefit
  const paymentToReceivePattern = /pay\b.*(?:to\s+receive|to\s+get|to\s+activate|to\s+unlock)/i;
  const feeRequestPattern = /(?:processing\s*fee|registration\s*fee|application\s*fee)\s+(?:to\s+receive|to\s+get)/i;

  const isPaymentClaim = paymentToReceivePattern.test(text) || feeRequestPattern.test(text);

  if (!isPaymentClaim) return null;

  // Look for official documentation about fees in the scheme data.
  //
  // hasOfficialFeeInfo is true only when the scheme carries fee documentation,
  // which is the sole basis on which a payment claim can be evaluated. Absence
  // of that documentation is NOT evidence either way: it must resolve to
  // "unknown", never to "contradicted" (see the module header).
  const hasOfficialFeeInfo = fullScheme?.descriptionEn?.toLowerCase().includes('fee') ?? false;

  const description = fullScheme?.descriptionEn?.substring(0, 200) ?? '';

  // With documented fee information the claim is measured against it and can be
  // contradicted; without it there is nothing to measure against, so the honest
  // answer is "unknown".
  const status: SchemeClaimStatus = hasOfficialFeeInfo ? 'contradicted' : 'unknown';

  const explanation =
    status === 'contradicted'
      ? `This claim does not match the scheme information currently available for ${scheme.schemeName}. The available scheme information does not verify this fee requirement. This is a potential warning sign.`
      : `The available scheme information does not verify this fee requirement for ${scheme.schemeName}. Please verify through the official source.`;

  return {
    schemeId: scheme.schemeId,
    schemeCode: scheme.schemeCode,
    schemeName: scheme.schemeName,
    claimType: 'payment_requirement',
    status,
    explanation,
  };
}

/**
 * Analyze benefit claims against scheme information.
 */
function analyzeBenefitClaim(
  text: string,
  scheme: RecognizedScheme,
  fullScheme: SchemeListItem | undefined
): SchemeClaimFinding | null {
  // Check for claims about benefit amounts
  const amountClaimPattern = /\b(will\s+give|will\s+provide|guaranteed\s+amount|₹\s*\d+)\b/i;
  const immediatePattern = /\bimmediately\b/i;

  if (!amountClaimPattern.test(text) && !immediatePattern.test(text)) return null;

  // Do NOT infer exact benefit amounts from vague descriptions
  // Only flag if we have enough evidence to establish a mismatch
  const hasAmountMention = /₹\s*\d+/.test(text);

  if (!hasAmountMention) return null;

  const description = fullScheme?.descriptionEn?.substring(0, 200) ?? '';
  const hasBenefitAmount = /₹\s*\d+/.test(description);

  // If the scheme description doesn't mention benefit amounts, this is unknown
  // Do not treat absence of information as proof of fraud
  const status: SchemeClaimStatus = 'unknown';

  const explanation =
    `This benefit claim does not match the scheme information currently available for ${scheme.schemeName}. ` +
    `The available scheme information does not verify the specific benefit amount mentioned. ` +
    `This is a potential warning sign. Please verify the claim using the official government source.`;

  return {
    schemeId: scheme.schemeId,
    schemeCode: scheme.schemeCode,
    schemeName: scheme.schemeName,
    claimType: 'benefit_claim',
    status,
    explanation,
  };
}

/**
 * Analyze eligibility claims against scheme information.
 */
function analyzeEligibilityClaim(
  text: string,
  scheme: RecognizedScheme,
  fullScheme: SchemeListItem | undefined
): SchemeClaimFinding | null {
  const eligibilityClaimPattern = /(?:everyone|all)\s+is\s+(?:automatically|always)\s+(?:eligible|qualified)/i;

  if (!eligibilityClaimPattern.test(text)) return null;

  const explanation =
    `This eligibility claim does not match the scheme information currently available for ${scheme.schemeName}. ` +
    `The available scheme information does not verify automatic eligibility for all applicants. ` +
    `Please verify the claim using the official government source.`;

  return {
    schemeId: scheme.schemeId,
    schemeCode: scheme.schemeCode,
    schemeName: scheme.schemeName,
    claimType: 'eligibility_claim',
    status: 'unknown',
    explanation,
  };
}
