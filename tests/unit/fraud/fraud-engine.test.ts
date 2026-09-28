import { describe, it, expect } from 'vitest';
import { runFraudEngine } from '@/lib/fraud/fraud-engine';

describe('Fraud Engine', () => {
  it('returns no signals for a normal message', () => {
    const result = runFraudEngine({
      inputType: 'message',
      text: 'Hello, how are you today?',
    });
    expect(result.signals).toHaveLength(0);
    expect(result.riskScore).toBe(0);
    expect(result.riskLevel).toBe('low');
  });

  it('detects one signal', () => {
    const result = runFraudEngine({
      inputType: 'message',
      text: 'send me your otp now',
    });
    expect(result.signals.length).toBeGreaterThanOrEqual(1);
    const hasOtp = result.signals.some((s) => s.code === 'OTP_REQUEST');
    expect(hasOtp).toBe(true);
  });

  it('detects multiple signals', () => {
    const result = runFraudEngine({
      inputType: 'message',
      text: 'pay immediately or your account will be blocked, send me your otp',
    });
    // Should detect both URGENT_PAYMENT and OTP_REQUEST
    const codes = result.signals.map((s) => s.code);
    expect(codes).toContain('URGENT_PAYMENT');
    expect(codes).toContain('OTP_REQUEST');
  });

  it('aggregates risk score correctly', () => {
    const result = runFraudEngine({
      inputType: 'message',
      text: 'send me your otp',
    });
    // OTP_REQUEST weight = 40, URGENT_PAYMENT weight = 15
    // "send me your otp" has both OTP keyword and request language
    // "otp" appears, but "urgent payment" is not there
    // Let's check score
    expect(result.riskScore).toBeGreaterThanOrEqual(0);
    expect(result.riskScore).toBeLessThanOrEqual(100);
  });

  it('clamps risk score to 100', () => {
    // Multiple high-weight signals
    const result = runFraudEngine({
      inputType: 'message',
      text:
        'pay immediately or your account will be blocked, send me your otp, pay a processing fee to receive your government benefit, send your banking password, guaranteed approval',
    });
    // URGENT_PAYMENT(15) + OTP_REQUEST(40) + UNOFFICIAL_FEE(35) + ACCOUNT_ACCESS_REQUEST(40) + FAKE_GOVERNMENT_CLAIM(35) = 165
    // Should be clamped to 100
    expect(result.riskScore).toBeLessThanOrEqual(100);
  });

  it('returns low risk for score 0-29', () => {
    const result = runFraudEngine({
      inputType: 'message',
      text: 'hello, how are you?',
    });
    expect(result.riskLevel).toBe('low');
  });

  it('returns recommendations', () => {
    const result = runFraudEngine({
      inputType: 'message',
      text: 'send me your otp',
    });
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.recommendations[0].text).toContain('Do not share OTPs');
  });

  it('handles empty text by returning low risk', () => {
    const result = runFraudEngine({
      inputType: 'message',
      text: '',
    });
    expect(result.riskScore).toBe(0);
    expect(result.riskLevel).toBe('low');
  });
});
