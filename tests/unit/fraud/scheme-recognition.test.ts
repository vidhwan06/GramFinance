import { describe, it, expect } from 'vitest';
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
    makeScheme({ id: '11111111-1111-1111-1111-111111111111', nameEn: 'PM-KISAN' }),
    makeScheme({ id: '22222222-2222-2222-2222-222222222222', nameEn: 'PMUY' }),
    makeScheme({ id: '33333333-3333-3333-3333-333333333333', nameEn: 'PM-VISHWAKARMA' }),
  ];
}

describe('Scheme Recognition', () => {
  it('recognizes PM-KISAN by exact name', () => {
    const schemes = makeActiveSchemes();
    const results = recognizeSchemes('PM-KISAN', schemes);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((r) => r.schemeName === 'PM-KISAN')).toBe(true);
  });

  it('recognizes PM KISAN (with space)', () => {
    const schemes = makeActiveSchemes();
    const results = recognizeSchemes('PM KISAN', schemes);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((r) => r.schemeName === 'PM-KISAN')).toBe(true);
  });

  it('recognizes full official name', () => {
    const schemes = makeActiveSchemes();
    const results = recognizeSchemes(
      'Pradhan Mantri Kisan Samman Nidhi',
      schemes
    );
    expect(results.some((r) => r.schemeName === 'PM-KISAN')).toBe(true);
  });

  it('returns empty array for unknown scheme', () => {
    const schemes = makeActiveSchemes();
    const results = recognizeSchemes('Some Unknown Scheme', schemes);
    expect(results).toEqual([]);
  });

  it('normalizes case', () => {
    const schemes = makeActiveSchemes();
    const results = recognizeSchemes('pm-kisan', schemes);
    expect(results.some((r) => r.schemeName === 'PM-KISAN')).toBe(true);
  });

  it('recognizes multiple schemes', () => {
    const schemes = makeActiveSchemes();
    const results = recognizeSchemes('PM-KISAN and PMUY', schemes);
    const names = results.map((r) => r.schemeName);
    expect(names).toContain('PM-KISAN');
    expect(names).toContain('PMUY');
  });

  it('does not return duplicate matches', () => {
    const schemes = makeActiveSchemes();
    const results = recognizeSchemes('PM-KISAN PM-KISAN', schemes);
    const ids = results.map((r) => r.schemeId);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('returns empty array when no schemes provided', () => {
    const results = recognizeSchemes('PM-KISAN', []);
    expect(results).toEqual([]);
  });

  it('returns empty array for empty text', () => {
    const schemes = makeActiveSchemes();
    const results = recognizeSchemes('', schemes);
    expect(results).toEqual([]);
  });
});
