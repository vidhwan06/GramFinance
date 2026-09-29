import { describe, it, expect } from 'vitest';
import { detectUnofficialFee } from '@/lib/fraud/rules/unofficial-fee';

describe('Unofficial Fee Rule', () => {
  it('detects "Pay ₹500 to receive your benefit"', () => {
    const result = detectUnofficialFee('pay 500 to receive your benefit');
    expect(result).not.toBeNull();
    expect(result!.code).toBe('UNOFFICIAL_FEE');
  });

  it('detects "Pay a processing fee to receive your government benefit"', () => {
    const result = detectUnofficialFee('pay a processing fee to receive your government benefit');
    expect(result).not.toBeNull();
    expect(result!.code).toBe('UNOFFICIAL_FEE');
  });

  it('detects "Pay now to release your subsidy"', () => {
    const result = detectUnofficialFee('pay now to release your subsidy');
    expect(result).not.toBeNull();
    expect(result!.code).toBe('UNOFFICIAL_FEE');
  });

  it('detects "pay a ₹499 processing fee" standalone', () => {
    const result = detectUnofficialFee('pay a 499 processing fee');
    expect(result).not.toBeNull();
    expect(result!.code).toBe('UNOFFICIAL_FEE');
  });

  it('detects "pay a ₹500 fee" standalone', () => {
    const result = detectUnofficialFee('pay a 500 fee');
    expect(result).not.toBeNull();
    expect(result!.code).toBe('UNOFFICIAL_FEE');
  });

  it('detects "send the fee immediately to UPI"', () => {
    const result = detectUnofficialFee('send the fee immediately to upi id abc@xyz');
    expect(result).not.toBeNull();
    expect(result!.code).toBe('UNOFFICIAL_FEE');
  });

  it('detects "pay ₹299 as a refundable verification charge"', () => {
    const result = detectUnofficialFee('pay 299 as a refundable verification charge');
    expect(result).not.toBeNull();
    expect(result!.code).toBe('UNOFFICIAL_FEE');
  });

  it('detects "pay a verification charge"', () => {
    const result = detectUnofficialFee('pay a verification charge');
    expect(result).not.toBeNull();
    expect(result!.code).toBe('UNOFFICIAL_FEE');
  });

  it('detects "pay ₹500 processing charge"', () => {
    const result = detectUnofficialFee('pay 500 processing charge');
    expect(result).not.toBeNull();
    expect(result!.code).toBe('UNOFFICIAL_FEE');
  });

  it('detects "pay a 500 charge"', () => {
    const result = detectUnofficialFee('pay a 500 charge');
    expect(result).not.toBeNull();
    expect(result!.code).toBe('UNOFFICIAL_FEE');
  });

  it('detects "send the charge immediately to UPI"', () => {
    const result = detectUnofficialFee('send the charge immediately to upi id abc@xyz');
    expect(result).not.toBeNull();
    expect(result!.code).toBe('UNOFFICIAL_FEE');
  });

  it('does NOT flag general payment advice', () => {
    const result = detectUnofficialFee('do not pay anyone to receive government benefits.');
    expect(result).toBeNull();
  });

  it('does NOT flag "Government schemes do not charge a verification fee"', () => {
    const result = detectUnofficialFee('government schemes do not charge a verification fee');
    expect(result).toBeNull();
  });

  it('does NOT flag "Do not pay any verification charge"', () => {
    const result = detectUnofficialFee('do not pay any verification charge');
    expect(result).toBeNull();
  });
});
