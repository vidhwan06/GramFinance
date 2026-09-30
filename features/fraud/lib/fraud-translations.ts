/**
 * Client-side translation helpers for Fraud Checker.
 *
 * The fraud engine and rules return English text. These helpers map
 * that English text to the appropriate translation key so the UI can
 * display Kannada without hardcoding Kannada strings in components.
 *
 * All Kannada strings live in features/language/translations/kn.ts.
 */

import type { TranslationKeys } from '@/features/language/translations/en';

/**
 * Maps signal codes to their translation key names for signal titles.
 */
const SIGNAL_TITLE_KEY_MAP: Record<string, string> = {
  OTP_REQUEST: 'signalTitleOtpRequest',
  ACCOUNT_ACCESS_REQUEST: 'signalTitleAccountAccessRequest',
  URGENT_ACCOUNT_ACTION: 'signalTitleUrgentAccountAction',
  URGENT_PAYMENT: 'signalTitleUrgentPayment',
  UNOFFICIAL_FEE: 'signalTitleUnofficialFee',
  PERSONAL_UPI: 'signalTitlePersonalUpi',
  SUSPICIOUS_LINK: 'signalTitleSuspiciousLink',
  FAKE_GOVERNMENT_CLAIM: 'signalTitleFakeGovernmentClaim',
};

/**
 * Maps signal codes to their translation key names for signal explanations.
 */
const SIGNAL_EXPLANATION_KEY_MAP: Record<string, string> = {
  OTP_REQUEST: 'signalExplanationOtpRequest',
  ACCOUNT_ACCESS_REQUEST: 'signalExplanationAccountAccessRequest',
  URGENT_ACCOUNT_ACTION: 'signalExplanationUrgentAccountAction',
  URGENT_PAYMENT: 'signalExplanationUrgentPayment',
  UNOFFICIAL_FEE: 'signalExplanationUnofficialFee',
  PERSONAL_UPI: 'signalExplanationPersonalUpi',
  SUSPICIOUS_LINK: 'signalExplanationSuspiciousLink',
  FAKE_GOVERNMENT_CLAIM: 'signalExplanationFakeGovernmentClaim',
};

/**
 * Maps signal codes to their translation key names for why-it-matters.
 */
const SIGNAL_WHY_KEY_MAP: Record<string, string> = {
  OTP_REQUEST: 'signalWhyOtpRequest',
  ACCOUNT_ACCESS_REQUEST: 'signalWhyAccountAccessRequest',
  URGENT_ACCOUNT_ACTION: 'signalWhyUrgentAccountAction',
  URGENT_PAYMENT: 'signalWhyUrgentPayment',
  UNOFFICIAL_FEE: 'signalWhyUnofficialFee',
  PERSONAL_UPI: 'signalWhyPersonalUpi',
  SUSPICIOUS_LINK: 'signalWhySuspiciousLink',
  FAKE_GOVERNMENT_CLAIM: 'signalWhyFakeGovernmentClaim',
};

/**
 * Maps English recommendation text to translation key names.
 * These match the exact strings returned by lib/fraud/recommendations.ts.
 */
const RECOMMENDATION_KEY_MAP: Record<string, string> = {
  'Do not share OTPs or verification codes with anyone.': 'recommendationOtpRequest1',
  'If in doubt, call the national cybercrime helpline: 1930.': 'recommendationOtpRequest2',
  'Do not share passwords, PINs, or banking credentials with anyone.': 'recommendationAccountAccessRequest1',
  'Do not enter your banking credentials, PIN, or OTP through a link in a message.': 'recommendationUrgentAccountAction1',
  "Verify account-related requests through your bank's official app, website, or customer care.": 'recommendationUrgentAccountAction2',
  'Do not send money until the request has been independently verified.': 'recommendationUrgentPayment1',
  'Do not pay unofficial fees for government benefits.': 'recommendationUnofficialFee1',
  'Verify the claim through the official government source.': 'recommendationUnofficialFee2',
  'Do not send money to personal UPI IDs for government-related payments.': 'recommendationPersonalUpi1',
  'Verify the payment channel through official sources.': 'recommendationPersonalUpi2',
  'Do not click on suspicious links.': 'recommendationSuspiciousLink1',
  'Verify URLs through official government websites.': 'recommendationSuspiciousLink2',
  'Verify the scheme through its official government source.': 'recommendationFakeGovernmentClaim1',
  'If you are unsure, verify the claim using an official government channel before taking action.': 'recommendationGeneral1',
  'If you suspect fraud, call the national cybercrime helpline: 1930.': 'recommendationGeneral2',
};

/**
 * Maps signal codes to their expected English name text.
 * Used to verify that the fallback text matches before translating.
 */
const SIGNAL_NAME_EN_MAP: Record<string, string> = {
  OTP_REQUEST: 'OTP request',
  ACCOUNT_ACCESS_REQUEST: 'Account access request',
  URGENT_ACCOUNT_ACTION: 'Urgent account action demand',
  URGENT_PAYMENT: 'Urgent payment demand',
  UNOFFICIAL_FEE: 'Unofficial fee request',
  PERSONAL_UPI: 'Personal UPI payment request',
  SUSPICIOUS_LINK: 'Suspicious link',
  FAKE_GOVERNMENT_CLAIM: 'Potentially misleading government claim',
};

/**
 * Get the translated signal title for a given signal code.
 * Only translates if the fallback text matches the expected English text.
 * Otherwise, returns the fallback as-is (for custom test data, etc.).
 */
export function getTranslatedSignalName(
  code: string,
  fallbackName: string,
  t: TranslationKeys
): string {
  const key = SIGNAL_TITLE_KEY_MAP[code];
  const expectedEn = SIGNAL_NAME_EN_MAP[code];
  if (key && expectedEn && fallbackName === expectedEn) {
    return (t.fraud as Record<string, string>)[key] ?? fallbackName;
  }
  return fallbackName;
}

/**
 * Maps signal codes to their expected English explanation text.
 * Used to verify that the fallback text matches before translating.
 */
const SIGNAL_EXPLANATION_EN_MAP: Record<string, string> = {
  OTP_REQUEST: 'The message asks you to share a one-time password (OTP) or verification code.',
  ACCOUNT_ACCESS_REQUEST: 'The message requests your banking password, ATM PIN, login credentials, or other sensitive account information.',
  URGENT_ACCOUNT_ACTION: 'The message uses threatening language (like "account will be blocked") to pressure you into taking immediate action on your account, such as updating KYC or verifying details.',
  URGENT_PAYMENT: 'The message combines payment language with urgent or threatening pressure to pay immediately.',
  UNOFFICIAL_FEE: 'The message claims you must pay a fee (processing, registration, activation) to receive a government benefit, subsidy, or scheme payment.',
  PERSONAL_UPI: 'The message asks you to send money to a personal UPI ID (like name@bank) in a context where an official government or institutional channel would be expected.',
  SUSPICIOUS_LINK: 'The message contains a link with characteristics commonly used in phishing (e.g., mismatched domain, IP address, or government-like naming on unofficial domains).',
  FAKE_GOVERNMENT_CLAIM: 'The message makes a claim about a government scheme or benefit that conflicts with known scheme information or uses language typical of fraudulent offers.',
};

/**
 * Get the translated signal explanation for a given signal code.
 * Only translates if the fallback text matches the expected English text.
 * Otherwise, returns the fallback as-is (for custom test data, etc.).
 */
export function getTranslatedSignalExplanation(
  code: string,
  fallbackExplanation: string,
  t: TranslationKeys
): string {
  const key = SIGNAL_EXPLANATION_KEY_MAP[code];
  const expectedEn = SIGNAL_EXPLANATION_EN_MAP[code];
  if (key && expectedEn && fallbackExplanation === expectedEn) {
    return (t.fraud as Record<string, string>)[key] ?? fallbackExplanation;
  }
  return fallbackExplanation;
}

/**
 * Get the translated why-it-matters text for a given signal code.
 */
export function getTranslatedWhyItMatters(
  code: string,
  t: TranslationKeys
): string | null {
  const key = SIGNAL_WHY_KEY_MAP[code];
  if (key) {
    return (t.fraud as Record<string, string>)[key] ?? null;
  }
  return null;
}

/**
 * Translate a recommendation text from English to the target language.
 * Falls back to the original English text if no translation is found.
 */
export function translateRecommendation(
  text: string,
  t: TranslationKeys
): string {
  const key = RECOMMENDATION_KEY_MAP[text];
  if (key) {
    return (t.fraud as Record<string, string>)[key] ?? text;
  }
  return text;
}

/**
 * Translate a scheme finding explanation from English to the target language.
 *
 * The scheme-claim-analyzer generates template strings with the scheme name
 * embedded. This function matches the English pattern and returns the
 * translated version with the scheme name substituted.
 */
export function translateSchemeFindingExplanation(
  explanation: string,
  schemeName: string,
  t: TranslationKeys
): string {
  // Normalize the explanation by replacing the scheme name with a placeholder
  const normalized = explanation.split(schemeName).join('{scheme}');

  // Match against known patterns
  if (
    normalized.includes(
      'This claim does not match the scheme information currently available for {scheme}.'
    )
  ) {
    if (
      normalized.includes(
        'The available scheme information does not verify this fee requirement.'
      )
    ) {
      if (normalized.includes('This is a potential warning sign.')) {
        // Contradicted payment claim
        return (
          (t.fraud as Record<string, string>).schemePaymentContradicted ??
          explanation
        ).replace('{scheme}', schemeName);
      }
      // Unknown payment claim
      return (
        (t.fraud as Record<string, string>).schemePaymentUnknown ?? explanation
      ).replace('{scheme}', schemeName);
    }
  }

  if (
    normalized.includes(
      'This benefit claim does not match the scheme information currently available for {scheme}.'
    )
  ) {
    return (
      (t.fraud as Record<string, string>).schemeBenefitUnknown ?? explanation
    ).replace('{scheme}', schemeName);
  }

  if (
    normalized.includes(
      'This eligibility claim does not match the scheme information currently available for {scheme}.'
    )
  ) {
    return (
      (t.fraud as Record<string, string>).schemeEligibilityUnknown ??
      explanation
    ).replace('{scheme}', schemeName);
  }

  // Fallback: return original explanation
  return explanation;
}
