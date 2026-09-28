import { describe, it, expect } from 'vitest';
import { calculateRiskScore, mapRiskLevel } from '@/lib/fraud/risk-calculator';

describe('Risk Calculator', () => {
  it('sums signal weights', () => {
    expect(calculateRiskScore([15, 20])).toBe(35);
  });

  it('returns 0 for empty array', () => {
    expect(calculateRiskScore([])).toBe(0);
  });

  it('clamps to 100', () => {
    expect(calculateRiskScore([50, 60])).toBe(100);
  });

  it('clamps to 0', () => {
    expect(calculateRiskScore([-10])).toBe(0);
  });

  it('maps 0-29 to low', () => {
    expect(mapRiskLevel(0)).toBe('low');
    expect(mapRiskLevel(15)).toBe('low');
    expect(mapRiskLevel(29)).toBe('low');
  });

  it('maps 30-59 to medium', () => {
    expect(mapRiskLevel(30)).toBe('medium');
    expect(mapRiskLevel(45)).toBe('medium');
    expect(mapRiskLevel(59)).toBe('medium');
  });

  it('maps 60-100 to high', () => {
    expect(mapRiskLevel(60)).toBe('high');
    expect(mapRiskLevel(85)).toBe('high');
    expect(mapRiskLevel(100)).toBe('high');
  });

  it('boundary test: 29 → low', () => {
    expect(mapRiskLevel(29)).toBe('low');
  });

  it('boundary test: 30 → medium', () => {
    expect(mapRiskLevel(30)).toBe('medium');
  });

  it('boundary test: 59 → medium', () => {
    expect(mapRiskLevel(59)).toBe('medium');
  });

  it('boundary test: 60 → high', () => {
    expect(mapRiskLevel(60)).toBe('high');
  });

  it('boundary test: 100 → high', () => {
    expect(mapRiskLevel(100)).toBe('high');
  });
});
