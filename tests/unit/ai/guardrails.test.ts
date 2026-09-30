import { describe, it, expect } from 'vitest';
import {
  detectDeferral,
  isInvestmentAdviceRequest,
  stripPII,
} from '@/lib/ai/guardrails';

describe('detectDeferral', () => {
  it('detects eligibility questions', () => {
    expect(detectDeferral('Am I eligible for PM-KISAN?')).toEqual({
      type: 'eligibility',
      href: '/schemes',
    });
    expect(detectDeferral('Do I qualify for this scheme?')).toEqual({
      type: 'eligibility',
      href: '/schemes',
    });
    expect(detectDeferral('Check my eligibility')).toEqual({
      type: 'eligibility',
      href: '/schemes',
    });
  });

  it('detects fraud questions', () => {
    expect(detectDeferral('Is this message fraud?')).toEqual({
      type: 'fraud',
      href: '/check',
    });
    expect(detectDeferral('Is this a scam?')).toEqual({
      type: 'fraud',
      href: '/check',
    });
    expect(detectDeferral('Check if this is fraud')).toEqual({
      type: 'fraud',
      href: '/check',
    });
  });

  it('returns null for general financial questions', () => {
    expect(detectDeferral('What is compound interest?')).toBeNull();
    expect(detectDeferral('How does a savings account work?')).toBeNull();
    expect(detectDeferral('Explain EMI')).toBeNull();
  });

  it('is case insensitive', () => {
    expect(detectDeferral('AM I ELIGIBLE for PM-KISAN?')).toEqual({
      type: 'eligibility',
      href: '/schemes',
    });
  });

  it('detects loan calculation requests', () => {
    expect(detectDeferral('calculate my loan')).toEqual({
      type: 'loan',
      href: '/loan',
    });
    expect(detectDeferral('calculate EMI')).toEqual({
      type: 'loan',
      href: '/loan',
    });
    expect(detectDeferral('EMI calculation')).toEqual({
      type: 'loan',
      href: '/loan',
    });
    expect(detectDeferral('loan interest calculation')).toEqual({
      type: 'loan',
      href: '/loan',
    });
    expect(detectDeferral('how much will my EMI be')).toEqual({
      type: 'loan',
      href: '/loan',
    });
    expect(detectDeferral('loan repayment calculation')).toEqual({
      type: 'loan',
      href: '/loan',
    });
    expect(detectDeferral('monthly loan payment')).toEqual({
      type: 'loan',
      href: '/loan',
    });
  });

  it('does not defer educational loan questions', () => {
    expect(detectDeferral('what is a loan?')).toBeNull();
    expect(detectDeferral('what is EMI?')).toBeNull();
    expect(detectDeferral('how does interest work?')).toBeNull();
  });
});

describe('isInvestmentAdviceRequest', () => {
  it('detects investment advice requests', () => {
    expect(isInvestmentAdviceRequest('Should I invest in mutual funds?')).toBe(true);
    expect(isInvestmentAdviceRequest('Is this a good investment?')).toBe(true);
    expect(isInvestmentAdviceRequest('Where should I put my money?')).toBe(true);
  });

  it('returns false for non-investment questions', () => {
    expect(isInvestmentAdviceRequest('What is a mutual fund?')).toBe(false);
    expect(isInvestmentAdviceRequest('How do I open a bank account?')).toBe(false);
  });
});

describe('stripPII', () => {
  it('strips Aadhaar numbers', () => {
    expect(stripPII('My Aadhaar is 1234 5678 9012')).toBe(
      'My Aadhaar is [Aadhaar redacted]'
    );
    expect(stripPII('Aadhaar: 123456789012')).toBe(
      'Aadhaar: [Aadhaar redacted]'
    );
  });

  it('strips long digit sequences (bank accounts)', () => {
    expect(stripPII('Account: 1234567890123456')).toBe(
      'Account: [account redacted]'
    );
  });

  it('strips OTP codes', () => {
    expect(stripPII('Your OTP is 123456')).toBe('Your [OTP redacted]');
    expect(stripPII('otp: 1234')).toBe('[OTP redacted]');
  });

  it('strips UPI IDs', () => {
    expect(stripPII('Send to user@upi')).toBe('Send to [UPI redacted]');
  });

  it('leaves normal text unchanged', () => {
    expect(stripPII('Hello, how are you?')).toBe('Hello, how are you?');
    expect(stripPII('The scheme provides ₹6000 per year')).toBe(
      'The scheme provides ₹6000 per year'
    );
  });
});
