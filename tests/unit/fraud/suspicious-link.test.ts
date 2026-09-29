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

  it('detects pm-kisan phishing domain in URL', () => {
    const result = detectSuspiciousLink('click http://pm-kisan-benefit-claim.example.com');
    expect(result).not.toBeNull();
    expect(result!.code).toBe('SUSPICIOUS_LINK');
  });

  it('detects pmuy phishing domain in URL', () => {
    const result = detectSuspiciousLink('visit http://pmuy-online-apply.claim');
    expect(result).not.toBeNull();
    expect(result!.code).toBe('SUSPICIOUS_LINK');
  });

  it('detects ganga-kalyan phishing domain in URL', () => {
    const result = detectSuspiciousLink('check https://ganga-kalyan-scheme.online');
    expect(result).not.toBeNull();
    expect(result!.code).toBe('SUSPICIOUS_LINK');
  });

  it('detects aadhaar phishing domain in URL', () => {
    const result = detectSuspiciousLink('click https://aadhaar-benefit-verify.claims.in');
    expect(result).not.toBeNull();
    expect(result!.code).toBe('SUSPICIOUS_LINK');
  });

  it('detects aadhaar phishing domain with subdomain', () => {
    const result = detectSuspiciousLink('visit http://aadhaar-verify-online.claim');
    expect(result).not.toBeNull();
    expect(result!.code).toBe('SUSPICIOUS_LINK');
  });

  it('detects aadhaar phishing domain with hyphen', () => {
    const result = detectSuspiciousLink('check https://aadhaar-benefit.online');
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

  it('does NOT flag scheme name mentioned without URL', () => {
    const result = detectSuspiciousLink('PM-KISAN is a government scheme for farmers');
    expect(result).toBeNull();
  });

  it('does NOT flag Aadhaar mentioned without URL', () => {
    const result = detectSuspiciousLink('Aadhaar is a unique identity number for Indian residents');
    expect(result).toBeNull();
  });
});
