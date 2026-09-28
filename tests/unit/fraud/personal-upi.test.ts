import { describe, it, expect } from 'vitest';
import { detectPersonalUPI } from '@/lib/fraud/rules/personal-upi';

describe('Personal UPI Rule', () => {
  it('detects a UPI ID', () => {
    const result = detectPersonalUPI('pay to user123@okicici');
    expect(result).not.toBeNull();
    expect(result!.code).toBe('PERSONAL_UPI');
  });

  it('detects UPI payment request', () => {
    const result = detectPersonalUPI('pay to my upi');
    expect(result).not.toBeNull();
    expect(result!.code).toBe('PERSONAL_UPI');
  });

  it('does NOT flag a normal message without UPI', () => {
    const result = detectPersonalUPI('hello how are you');
    expect(result).toBeNull();
  });

  it('is a risk indicator only, not fraud confirmation', () => {
    // A personal UPI is just a signal, not proof of fraud
    const result = detectPersonalUPI('send money to 9876543210@upi');
    expect(result).not.toBeNull();
    expect(result!.weight).toBe(20); // medium severity, not high
  });
});
