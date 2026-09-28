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

  it('does NOT flag normal scheme information', () => {
    const result = detectFakeGovernmentClaim('the pm-kisan scheme provides annual income support');
    expect(result).toBeNull();
  });

  it('is a risk indicator only, not fraud confirmation', () => {
    const result = detectFakeGovernmentClaim('you are eligible for a government scheme');
    expect(result).not.toBeNull();
    expect(result!.weight).toBe(35); // high severity
  });
});
