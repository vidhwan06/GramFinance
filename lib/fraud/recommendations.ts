/**
 * Recommendations module for fraud checking.
 *
 * Generates recommendations based on detected signal codes.
 */

import type { Recommendation } from './types';

const HELPLINE = '1930';

const RECOMMENDATIONS_BY_SIGNAL: Record<string, string[]> = {
  OTP_REQUEST: [
    'Do not share OTPs or verification codes with anyone.',
    `If in doubt, call the national cybercrime helpline: ${HELPLINE}.`,
  ],
  ACCOUNT_ACCESS_REQUEST: [
    'Do not share passwords, PINs, or banking credentials with anyone.',
    `If in doubt, call the national cybercrime helpline: ${HELPLINE}.`,
  ],
  URGENT_ACCOUNT_ACTION: [
    'Do not enter your banking credentials, PIN, or OTP through a link in a message.',
    'Verify account-related requests through your bank\'s official app, website, or customer care.',
    `If in doubt, call the national cybercrime helpline: ${HELPLINE}.`,
  ],
  URGENT_PAYMENT: [
    'Do not send money until the request has been independently verified.',
  ],
  UNOFFICIAL_FEE: [
    'Do not pay unofficial fees for government benefits.',
    'Verify the claim through the official government source.',
  ],
  PERSONAL_UPI: [
    'Do not send money to personal UPI IDs for government-related payments.',
    'Verify the payment channel through official sources.',
  ],
  SUSPICIOUS_LINK: [
    'Do not click on suspicious links.',
    'Verify URLs through official government websites.',
  ],
  FAKE_GOVERNMENT_CLAIM: [
    'Verify the scheme through its official government source.',
  ],
};

const GENERAL_RECOMMENDATIONS = [
  'If you are unsure, verify the claim using an official government channel before taking action.',
  `If you suspect fraud, call the national cybercrime helpline: ${HELPLINE}.`,
];

export function generateRecommendations(
  signalCodes: string[]
): Recommendation[] {
  const seen = new Set<string>();
  const recommendations: Recommendation[] = [];

  for (const code of signalCodes) {
    const texts = RECOMMENDATIONS_BY_SIGNAL[code];
    if (texts) {
      for (const text of texts) {
        if (!seen.has(text)) {
          seen.add(text);
          recommendations.push({ text, signalCodes: [code] });
        }
      }
    }
  }

  for (const text of GENERAL_RECOMMENDATIONS) {
    if (!seen.has(text)) {
      seen.add(text);
      recommendations.push({ text });
    }
  }

  return recommendations;
}
