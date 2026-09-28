import { describe, it, expect } from 'vitest';
import { detectOtpRequest } from '@/lib/fraud/rules/otp-request';

describe('OTP Request Rule', () => {
  it('detects "Send me your OTP"', () => {
    const result = detectOtpRequest('send me your otp');
    expect(result).not.toBeNull();
    expect(result!.code).toBe('OTP_REQUEST');
    expect(result!.weight).toBe(40);
  });

  it('detects "Share the verification code"', () => {
    const result = detectOtpRequest('share the verification code');
    expect(result).not.toBeNull();
    expect(result!.code).toBe('OTP_REQUEST');
  });

  it('detects "Give me the one-time password"', () => {
    const result = detectOtpRequest('give me the one-time password');
    expect(result).not.toBeNull();
    expect(result!.code).toBe('OTP_REQUEST');
  });

  it('does NOT flag "Never share your OTP with anyone."', () => {
    const result = detectOtpRequest("never share your otp with anyone.");
    expect(result).toBeNull();
  });

  it('does NOT flag "Your OTP should remain private."', () => {
    const result = detectOtpRequest('your otp should remain private.');
    expect(result).toBeNull();
  });

  it('does NOT flag OTP mentioned without request language', () => {
    const result = detectOtpRequest('your otp is 123456');
    expect(result).toBeNull();
  });
});
