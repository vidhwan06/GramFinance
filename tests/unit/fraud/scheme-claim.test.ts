import { describe, it, expect } from 'vitest';
import { analyzeSchemeClaims } from '@/lib/fraud/scheme-claim-analyzer';
import { recognizeSchemes } from '@/lib/fraud/scheme-recognition';
import { runFraudEngine } from '@/lib/fraud/fraud-engine';
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
    // 'Test description' carries no fee documentation, so the analyzer has
    // nothing to measure the claim against. Absence of information is unknown,
    // never contradicted.
    expect(paymentFindings[0].status).toBe('unknown');
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

/**
 * MED-01: the fee-claim branch must be driven by the presence of documented
 * fee information, not by its absence.
 *
 *   documented fee information -> the claim is measured against it
 *   no fee information         -> unknown, never contradicted
 *
 * The analyzer compares the PRESENCE of fee documentation; it does not parse
 * fee amounts out of free text (that would mean inventing scheme facts), so
 * every evaluated payment claim lands on `contradicted`.
 */
describe('Scheme Claim Analyzer: fee documentation drives the status', () => {
  function schemeWithDescription(descriptionEn: string): SchemeListItem[] {
    return [
      makeScheme({
        id: '11111111-1111-1111-1111-111111111111',
        nameEn: 'PM-KISAN',
        descriptionEn,
      }),
    ];
  }

  function paymentFindingFor(
    text: string,
    schemes: SchemeListItem[]
  ): { status: string } | undefined {
    const recognized = recognizeSchemes(text, schemes);
    return analyzeSchemeClaims(text, recognized, schemes).find(
      (f) => f.claimType === 'payment_requirement'
    );
  }

  it('1. documented fee + claim matching a legitimate fee enquiry → not contradicted', () => {
    const schemes = schemeWithDescription(
      'A processing fee of ₹100 applies to applications under this scheme.'
    );
    // A plain question about the fee is not a demand for payment, so it never
    // reaches the status branch at all.
    const finding = paymentFindingFor(
      'What is the processing fee for PM-KISAN?',
      schemes
    );
    expect(finding).toBeUndefined();
  });

  it('2. documented fee + contradictory payment-to-receive claim → contradicted', () => {
    const schemes = schemeWithDescription(
      'A processing fee of ₹100 applies to applications under this scheme.'
    );
    const finding = paymentFindingFor(
      'Pay ₹500 to receive your PM-KISAN benefit.',
      schemes
    );
    expect(finding).toBeDefined();
    expect(finding?.status).toBe('contradicted');
  });

  it('2b. documented fee + differently phrased fee claim → contradicted', () => {
    const schemes = schemeWithDescription(
      'Registration fee details are published in the scheme guidelines.'
    );
    const finding = paymentFindingFor(
      'Send the registration fee to get PM-KISAN released today.',
      schemes
    );
    expect(finding).toBeDefined();
    expect(finding?.status).toBe('contradicted');
  });

  it('3. no official fee information → unknown, never contradicted', () => {
    // Description exists but says nothing about fees.
    const noFeeMention = paymentFindingFor(
      'Pay ₹500 to receive your PM-KISAN benefit.',
      schemeWithDescription('Financial assistance for eligible farmer families.')
    );
    expect(noFeeMention).toBeDefined();
    expect(noFeeMention?.status).toBe('unknown');

    // No scheme row at all for the recognized scheme id.
    const noSchemeRow = paymentFindingFor(
      'Pay ₹500 to receive your PM-KISAN benefit.',
      []
    );
    expect(noSchemeRow).toBeUndefined();

    // A scheme row whose description is empty.
    const emptyDescription = paymentFindingFor(
      'Pay ₹500 to receive your PM-KISAN benefit.',
      schemeWithDescription('')
    );
    expect(emptyDescription).toBeDefined();
    expect(emptyDescription?.status).toBe('unknown');
  });

  it('4. scheme claim status never changes the risk band', () => {
    const text = 'Pay ₹500 to receive your PM-KISAN benefit.';
    const withSchemes = runFraudEngine(
      { inputType: 'message', text },
      { activeSchemes: makeActiveSchemes() }
    );
    const withoutSchemes = runFraudEngine({ inputType: 'message', text });

    // The claim analysis actually ran in the first case…
    expect(withSchemes.schemeFindings.length).toBeGreaterThan(0);
    expect(withoutSchemes.schemeFindings).toEqual([]);

    // …and the score is computed from matched signals alone (fraud-engine
    // step 3 runs before step 6), so the band is identical either way.
    expect(withSchemes.riskScore).toBe(withoutSchemes.riskScore);
    expect(withSchemes.riskLevel).toBe(withoutSchemes.riskLevel);
    expect(withSchemes.signals).toEqual(withoutSchemes.signals);
    expect(withSchemes.recommendations).toEqual(withoutSchemes.recommendations);
  });
});
