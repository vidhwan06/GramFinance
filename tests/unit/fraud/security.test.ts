import { describe, it, expect, vi } from 'vitest';
import { POST } from '@/app/api/fraud/check/route';

vi.mock('next/headers', () => ({
  cookies: async () => ({
    getAll: () => [],
    setAll: () => undefined,
  }),
}));

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/fraud/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as Request;
}

/**
 * Security-focused tests for POST /api/fraud/check.
 *
 * Verifies that the server remains authoritative for all
 * fraud-check results and that clients cannot manipulate
 * risk scores or signal data.
 */
describe('Fraud Check API Security', () => {
  it('rejects client-supplied riskScore with 400 (Zod strict mode)', async () => {
    const request = makeRequest({
      inputType: 'message',
      text: 'normal text',
      riskScore: 100,
      riskLevel: 'high',
    });
    const response = await POST(request as unknown as Parameters<typeof POST>[0]);
    // Zod .strict() rejects unknown properties entirely
    expect(response.status).toBe(400);
  });

  it('rejects client-supplied signals with 400 (Zod strict mode)', async () => {
    const request = makeRequest({
      inputType: 'message',
      text: 'normal text',
      signals: [{ code: 'OTP_REQUEST', weight: 40 }],
    });
    const response = await POST(request as unknown as Parameters<typeof POST>[0]);
    // Zod .strict() rejects unknown properties entirely
    expect(response.status).toBe(400);
  });

  it('valid request does not contain client-supplied fields in result', async () => {
    const request = makeRequest({
      inputType: 'message',
      text: 'send me your otp',
    });
    const response = await POST(request as unknown as Parameters<typeof POST>[0]);
    expect(response.status).toBe(200);
    const body = (await response.json()) as { success: boolean; data: { riskScore: number; riskLevel: string; signals: { code: string }[] } };
    // Server computes everything - client cannot inject fields
    expect(body.data.riskScore).toBeGreaterThanOrEqual(0);
    expect(body.data.riskScore).toBeLessThanOrEqual(100);
    const codes = body.data.signals.map((s: { code: string }) => s.code);
    expect(codes).toContain('OTP_REQUEST');
  });

  it('rejects unknown properties with 400 (Zod strict mode)', async () => {
    const request = makeRequest({
      inputType: 'message',
      text: 'hello',
      extraField: 'should be rejected',
    });
    const response = await POST(request as unknown as Parameters<typeof POST>[0]);
    // Zod .strict() rejects unknown properties
    expect(response.status).toBe(400);
  });

  it('rejects empty text with 400', async () => {
    const request = makeRequest({
      inputType: 'message',
      text: '',
    });
    const response = await POST(request as unknown as Parameters<typeof POST>[0]);
    expect(response.status).toBe(400);
  });

  it('rejects whitespace-only text with 400', async () => {
    const request = makeRequest({
      inputType: 'message',
      text: '   ',
    });
    const response = await POST(request as unknown as Parameters<typeof POST>[0]);
    expect(response.status).toBe(400);
  });

  it('rejects invalid inputType with 400', async () => {
    const request = makeRequest({
      inputType: 'invalid_type',
      text: 'hello',
    });
    const response = await POST(request as unknown as Parameters<typeof POST>[0]);
    expect(response.status).toBe(400);
  });

  it('rejects missing inputType with 400', async () => {
    const request = makeRequest({
      text: 'hello',
    });
    const response = await POST(request as unknown as Parameters<typeof POST>[0]);
    expect(response.status).toBe(400);
  });

  it('rejects oversized text with 400', async () => {
    const longText = 'a'.repeat(10001);
    const request = makeRequest({
      inputType: 'message',
      text: longText,
    });
    const response = await POST(request as unknown as Parameters<typeof POST>[0]);
    expect(response.status).toBe(400);
  });

  it('rejects malformed JSON with 400', async () => {
    const request = new Request('http://localhost/api/fraud/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{not valid json',
    }) as unknown as Request;
    const response = await POST(request as unknown as Parameters<typeof POST>[0]);
    expect(response.status).toBe(400);
  });
});

describe('Error Sanitization', () => {
  it('does not expose stack traces in error responses', async () => {
    const request = makeRequest({
      inputType: 'message',
      text: '',
    });
    const response = await POST(request as unknown as Parameters<typeof POST>[0]);
    const body = (await response.json()) as { success: boolean; error: { code: string; message: string; details?: unknown[] } };
    expect(body.success).toBe(false);
    expect(body.error.message).toBeDefined();
    // Error messages should not contain internal implementation details
    expect(body.error.message).not.toContain('Error:');
    expect(body.error.message).not.toContain('at ');
  });

  it('does not expose environment variables in error responses', async () => {
    const request = makeRequest({
      inputType: 'message',
      text: '',
    });
    const response = await POST(request as unknown as Parameters<typeof POST>[0]);
    const body = (await response.json()) as { success: boolean };
    const bodyStr = JSON.stringify(body);
    expect(bodyStr).not.toContain('SUPABASE');
    expect(bodyStr).not.toContain('NEXT_PUBLIC');
    expect(bodyStr).not.toContain('process.env');
  });
});
