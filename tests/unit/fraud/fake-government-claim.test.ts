import { describe, it, expect } from 'vitest';
import { detectFakeGovernmentClaim } from '@/lib/fraud/rules/fake-government-claim';

describe('Fake Government Claim Rule', () => {
  it('detects "you have been selected for a government scheme"', () => {
    const result = detectFakeGovernmentClaim('you have been selected for a government scheme');
    expect(result).not.toBeNull();
    expect(result!.code).toBe('FAKE_GOVERNMENT_CLAIM');
  });

  it('detects "guaranteed approval"', () => {
    const result = detectFakeGovernmentClaim('guaranteed approval for your loan');
    expect(result).not.toBeNull();
    expect(result!.code).toBe('FAKE_GOVERNMENT_CLAIM');
  });

  it('detects "you have been selected for a government benefit"', () => {
    const result = detectFakeGovernmentClaim('you have been selected for a government benefit');
    expect(result).not.toBeNull();
    expect(result!.code).toBe('FAKE_GOVERNMENT_CLAIM');
  });

  it('detects "you have been selected for a ₹10000 government benefit"', () => {
    const result = detectFakeGovernmentClaim('you have been selected for a 10000 government benefit');
    expect(result).not.toBeNull();
    expect(result!.code).toBe('FAKE_GOVERNMENT_CLAIM');
  });

  it('detects "you are eligible for a government benefit"', () => {
    const result = detectFakeGovernmentClaim('you are eligible for a government benefit');
    expect(result).not.toBeNull();
    expect(result!.code).toBe('FAKE_GOVERNMENT_CLAIM');
  });

  it('detects "you have been selected for a government assistance"', () => {
    const result = detectFakeGovernmentClaim('you have been selected for a government assistance');
    expect(result).not.toBeNull();
    expect(result!.code).toBe('FAKE_GOVERNMENT_CLAIM');
  });

  it('detects "you have been selected for a ₹7500 government assistance payment"', () => {
    const result = detectFakeGovernmentClaim('you have been selected for a 7500 government assistance payment');
    expect(result).not.toBeNull();
    expect(result!.code).toBe('FAKE_GOVERNMENT_CLAIM');
  });

  it('detects "you are eligible for a government assistance"', () => {
    const result = detectFakeGovernmentClaim('you are eligible for a government assistance');
    expect(result).not.toBeNull();
    expect(result!.code).toBe('FAKE_GOVERNMENT_CLAIM');
  });

  it('detects "you have been selected for a government payment"', () => {
    const result = detectFakeGovernmentClaim('you have been selected for a government payment');
    expect(result).not.toBeNull();
    expect(result!.code).toBe('FAKE_GOVERNMENT_CLAIM');
  });

  it('detects "you have been selected for a financial assistance"', () => {
    const result = detectFakeGovernmentClaim('you have been selected for a financial assistance');
    expect(result).not.toBeNull();
    expect(result!.code).toBe('FAKE_GOVERNMENT_CLAIM');
  });

  it('does NOT flag normal scheme information', () => {
    const result = detectFakeGovernmentClaim('the pm-kisan scheme provides annual income support');
    expect(result).toBeNull();
  });

  it('does NOT flag educational content about government schemes', () => {
    const result = detectFakeGovernmentClaim('the government provides assistance to farmers through various schemes');
    expect(result).toBeNull();
  });

  it('is a risk indicator only, not fraud confirmation', () => {
    const result = detectFakeGovernmentClaim('you are eligible for a government scheme');
    expect(result).not.toBeNull();
    expect(result!.weight).toBe(35); // high severity
  });
});
