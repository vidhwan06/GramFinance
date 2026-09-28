import { describe, it, expect } from 'vitest';
import { normalizeInput } from '@/lib/fraud/normalizer';

describe('Input Normalizer', () => {
  it('trims whitespace', () => {
    const result = normalizeInput('  hello world  ');
    expect(result.original).toBe('  hello world  ');
    expect(result.normalized).toBe('hello world');
  });

  it('normalizes repeated whitespace', () => {
    const result = normalizeInput('hello    world   test');
    expect(result.normalized).toBe('hello world test');
  });

  it('normalizes case for matching', () => {
    const result = normalizeInput('PAY ₹500 NOW');
    expect(result.normalized).toBe('pay ₹500 now');
  });

  it('preserves the original input', () => {
    const input = '  PAY ₹500 NOW!!!  ';
    const result = normalizeInput(input);
    expect(result.original).toBe(input);
    expect(result.normalized).toBe('pay ₹500 now!!!');
  });

  it('handles empty string', () => {
    const result = normalizeInput('');
    expect(result.original).toBe('');
    expect(result.normalized).toBe('');
  });

  it('handles whitespace-only string', () => {
    const result = normalizeInput('   ');
    expect(result.original).toBe('   ');
    expect(result.normalized).toBe('');
  });
});
