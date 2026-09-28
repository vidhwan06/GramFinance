import { describe, it, expect } from 'vitest';
import { detectAccountAccessRequest } from '@/lib/fraud/rules/account-access-request';

describe('Account Access Request Rule', () => {
  it('detects "Send your banking password"', () => {
    const result = detectAccountAccessRequest('send your banking password');
    expect(result).not.toBeNull();
    expect(result!.code).toBe('ACCOUNT_ACCESS_REQUEST');
  });

  it('detects "Give me your ATM PIN"', () => {
    const result = detectAccountAccessRequest('give me your atm pin');
    expect(result).not.toBeNull();
    expect(result!.code).toBe('ACCOUNT_ACCESS_REQUEST');
  });

  it('detects "Share your login credentials"', () => {
    const result = detectAccountAccessRequest('share your login credentials');
    expect(result).not.toBeNull();
    expect(result!.code).toBe('ACCOUNT_ACCESS_REQUEST');
  });

  it('does NOT flag "Never share your PIN."', () => {
    const result = detectAccountAccessRequest('never share your pin.');
    expect(result).toBeNull();
  });

  it('does NOT flag "Keep your password private."', () => {
    const result = detectAccountAccessRequest('keep your password private.');
    expect(result).toBeNull();
  });

  it('does NOT flag password mentioned without request language', () => {
    const result = detectAccountAccessRequest('your password is secret');
    expect(result).toBeNull();
  });
});
