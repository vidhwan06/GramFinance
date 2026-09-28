import { describe, it, expect } from 'vitest';
import { generateRecommendations } from '@/lib/fraud/recommendations';

describe('Recommendations', () => {
  it('returns OTP recommendations for OTP_REQUEST', () => {
    const recs = generateRecommendations(['OTP_REQUEST']);
    const hasOtpRec = recs.some((r) =>
      r.text.includes('Do not share OTPs')
    );
    expect(hasOtpRec).toBe(true);
  });

  it('returns account access recommendations', () => {
    const recs = generateRecommendations(['ACCOUNT_ACCESS_REQUEST']);
    const hasAccRec = recs.some((r) =>
      r.text.includes('Do not share passwords')
    );
    expect(hasAccRec).toBe(true);
  });

  it('returns payment recommendations for payment signals', () => {
    const recs = generateRecommendations(['URGENT_PAYMENT']);
    const hasPaymentRec = recs.some((r) =>
      r.text.includes('Do not send money until')
    );
    expect(hasPaymentRec).toBe(true);
  });

  it('returns government claim recommendations', () => {
    const recs = generateRecommendations(['FAKE_GOVERNMENT_CLAIM']);
    const hasGovRec = recs.some((r) =>
      r.text.includes('Verify the scheme')
    );
    expect(hasGovRec).toBe(true);
  });

  it('always includes general recommendation', () => {
    const recs = generateRecommendations([]);
    const hasGeneral = recs.some((r) =>
      r.text.includes('verify the claim using an official')
    );
    expect(hasGeneral).toBe(true);
  });

  it('includes cybercrime helpline', () => {
    const recs = generateRecommendations(['OTP_REQUEST']);
    const hasHelpline = recs.some((r) => r.text.includes('1930'));
    expect(hasHelpline).toBe(true);
  });
});
