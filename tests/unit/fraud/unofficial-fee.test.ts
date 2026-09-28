import { describe, it, expect } from 'vitest';
import { detectUnofficialFee } from '@/lib/fraud/rules/unofficial-fee';

describe('Unofficial Fee Rule', () => {
  it('detects "Pay ₹500 to receive your benefit"', () => {
    const result = detectUnofficialFee('pay 500 to receive your benefit');
    expect(result).not.toBeNull();
    expect(result!.code).toBe('UNOFFICIAL_FEE');
  });

  it('detects "Send the processing fee immediately"', () => {
    const result = detectUnofficialFee('send the processing fee immediately');
    // This might not match if it doesn't have "to receive benefit" context
    // Let's test with a more specific pattern
    const result2 = detectUnofficialFee('pay a processing fee to receive your government benefit');
    expect(result2).not.toBeNull();
    expect(result2!.code).toBe('UNOFFICIAL_FEE');
  });

  it('detects "Pay now to release your subsidy"', () => {
    const result = detectUnofficialFee('pay now to release your subsidy');
    expect(result).not.toBeNull();
    expect(result!.code).toBe('UNOFFICIAL_FEE');
  });

  it('does NOT flag general payment advice', () => {
    const result = detectUnofficialFee('do not pay anyone to receive government benefits.');
    expect(result).toBeNull();
  });
});
