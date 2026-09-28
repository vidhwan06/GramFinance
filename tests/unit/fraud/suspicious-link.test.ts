import { describe, it, expect } from 'vitest';
import { detectSuspiciousLink } from '@/lib/fraud/rules/suspicious-link';

describe('Suspicious Link Rule', () => {
  it('detects an IP-address URL', () => {
    const result = detectSuspiciousLink('visit http://192.168.1.1/login');
    expect(result).not.toBeNull();
    expect(result!.code).toBe('SUSPICIOUS_LINK');
  });

  it('detects a suspicious government-like domain', () => {
    const result = detectSuspiciousLink('visit gov-login.com');
    expect(result).not.toBeNull();
    expect(result!.code).toBe('SUSPICIOUS_LINK');
  });

  it('detects a suspicious aadhaar-like domain', () => {
    const result = detectSuspiciousLink('check aadhaar-portal.xyz');
    expect(result).not.toBeNull();
    expect(result!.code).toBe('SUSPICIOUS_LINK');
  });

  it('does NOT flag a normal URL', () => {
    const result = detectSuspiciousLink('visit https://www.google.com');
    expect(result).toBeNull();
  });

  it('does NOT flag plain text without URLs', () => {
    const result = detectSuspiciousLink('please be careful online');
    expect(result).toBeNull();
  });
});
