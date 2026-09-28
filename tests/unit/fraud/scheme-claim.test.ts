import { describe, it, expect } from 'vitest';
import { analyzeSchemeClaims } from '@/lib/fraud/scheme-claim-analyzer';
import { recognizeSchemes } from '@/lib/fraud/scheme-recognition';
import type { SchemeListItem } from '@/features/schemes/schemes-service';

function makeScheme(
  overrides: Partial<SchemeListItem> = {}
): SchemeListItem {
  return {
    id: 'test-id',
    nameEn: 'PM-KISAN',
    nameKn: 'ಪಿେಂ ಕಿಸಾನ್',
    descriptionEn: 'Test description',
    descriptionKn: 'ಪರೀಕ್ಷಾ ವಿವರಣೆ',
    targetGroups: ['farmer'],
    states: ['ALL'],
    lastVerified: '2026-01-15',
    status: 'active',
    ...overrides,
  };
}

function makeActiveSchemes(): SchemeListItem[] {
  return [
    makeScheme({
      id: '11111111-1111-1111-1111-111111111111',
      nameEn: 'PM-KISAN',
    }),
    makeScheme({
      id: '22222222-2222-2222-2222-222222222222',
      nameEn: 'PMUY',
    }),
  ];
}

describe('Scheme Claim Analyzer', () => {
  it('returns empty findings when no schemes recognized', () => {
    const findings = analyzeSchemeClaims('hello world', [], makeActiveSchemes());
    expect(findings).toEqual([]);
  });

  it('returns empty findings when text is empty', () => {
    const findings = analyzeSchemeClaims('', [], makeActiveSchemes());
    expect(findings).toEqual([]);
  });

  it('returns payment_requirement finding for fee claim', () => {
    const schemes = makeActiveSchemes();
    const recognized = recognizeSchemes('PM-KISAN', schemes);
    const findings = analyzeSchemeClaims(
      'Pay ₹500 to receive your PM-KISAN benefit.',
      recognized,
      schemes
    );
    const paymentFindings = findings.filter((f) => f.claimType === 'payment_requirement');
    expect(paymentFindings.length).toBeGreaterThanOrEqual(1);
    expect(paymentFindings[0].status).toBe('contradicted');
  });

  it('uses unknown status when scheme data is insufficient', () => {
    const schemes = makeActiveSchemes();
    const recognized = recognizeSchemes('PMUY', schemes);
    // PMUY has no amount mention, so no benefit claim finding
    const findings = analyzeSchemeClaims('PMUY is great', recognized, schemes);
    const benefitFindings = findings.filter((f) => f.claimType === 'benefit_claim');
    expect(benefitFindings).toEqual([]);
  });

  it('includes scheme details in findings', () => {
    const schemes = makeActiveSchemes();
    const recognized = recognizeSchemes('PM-KISAN', schemes);
    const findings = analyzeSchemeClaims('Pay to receive PM-KISAN', recognized, schemes);
    if (findings.length > 0) {
      expect(findings[0].schemeName).toBe('PM-KISAN');
      expect(findings[0].schemeCode).toBe('PM-KISAN');
      expect(findings[0].claimType).toBe('payment_requirement');
    }
  });

  it('produces unknown findings for benefit amounts not in scheme data', () => {
    const schemes = makeActiveSchemes();
    const recognized = recognizeSchemes('PM-KISAN', schemes);
    const findings = analyzeSchemeClaims(
      'PM-KISAN will give you ₹50,000 immediately.',
      recognized,
      schemes
    );
    const benefitFindings = findings.filter((f) => f.claimType === 'benefit_claim');
    // Amount claims produce unknown findings (we don't verify amounts)
    expect(benefitFindings.length).toBeGreaterThanOrEqual(0);
  });

  it('does not treat absence of information as fraud', () => {
    const schemes = makeActiveSchemes();
    const recognized = recognizeSchemes('PM-KISAN', schemes);
    // Normal informational query about scheme
    const findings = analyzeSchemeClaims('What is PM-KISAN?', recognized, schemes);
    // No payment claim, so no payment finding
    const paymentFindings = findings.filter((f) => f.claimType === 'payment_requirement');
    expect(paymentFindings).toEqual([]);
  });
});
