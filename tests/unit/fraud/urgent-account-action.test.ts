import { describe, it, expect } from 'vitest';
import { detectUrgentAccountAction } from '@/lib/fraud/rules/urgent-account-action';

describe('Urgent Account Action Rule', () => {
  it('detects KYC update urgency', () => {
    const result = detectUrgentAccountAction('urgent: your account will be blocked today! kyc expired. update immediately');
    expect(result).not.toBeNull();
    expect(result!.code).toBe('URGENT_ACCOUNT_ACTION');
  });

  it('detects verification urgency', () => {
    const result = detectUrgentAccountAction('verify your account now or it will be suspended');
    expect(result).not.toBeNull();
    expect(result!.code).toBe('URGENT_ACCOUNT_ACTION');
  });

  it('detects account action with OTP/PIN context', () => {
    const result = detectUrgentAccountAction('enter your atm pin and otp to complete verification immediately');
    expect(result).not.toBeNull();
    expect(result!.code).toBe('URGENT_ACCOUNT_ACTION');
  });

  it('does NOT flag when payment language is present (should be URGENT_PAYMENT)', () => {
    const result = detectUrgentAccountAction('pay immediately or your account will be blocked');
    expect(result).toBeNull();
  });

  it('does NOT flag normal account message without urgency', () => {
    const result = detectUrgentAccountAction('your account statement is ready');
    expect(result).toBeNull();
  });

  it('does NOT flag KYC mention without urgency', () => {
    const result = detectUrgentAccountAction('your kyc is valid until next year');
    expect(result).toBeNull();
  });
});