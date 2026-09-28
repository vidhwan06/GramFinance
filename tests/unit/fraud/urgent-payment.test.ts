import { describe, it, expect } from 'vitest';
import { detectUrgentPayment } from '@/lib/fraud/rules/urgent-payment';

describe('Urgent Payment Rule', () => {
  it('detects "Pay immediately or your account will be blocked."', () => {
    const result = detectUrgentPayment('pay immediately or your account will be blocked.');
    expect(result).not.toBeNull();
    expect(result!.code).toBe('URGENT_PAYMENT');
  });

  it('detects "Send money now."', () => {
    const result = detectUrgentPayment('send money now.');
    // This should match because "send money" + "now" = payment + urgency
    expect(result).not.toBeNull();
    expect(result!.code).toBe('URGENT_PAYMENT');
  });

  it('does NOT flag "Payments are processed within 5 working days."', () => {
    const result = detectUrgentPayment('payments are processed within 5 working days.');
    expect(result).toBeNull();
  });

  it('does NOT flag just "payment" without urgency', () => {
    const result = detectUrgentPayment('payment processing time');
    expect(result).toBeNull();
  });
});
