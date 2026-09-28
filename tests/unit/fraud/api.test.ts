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

describe('POST /api/fraud/check', () => {
  it('valid message returns success', async () => {
    const request = makeRequest({
      inputType: 'message',
      text: 'hello, how are you?',
    });
    const response = await POST(request as unknown as Parameters<typeof POST>[0]);
    expect(response.status).toBe(200);
    const body = (await response.json()) as { success: boolean };
    expect(body.success).toBe(true);
  });

  it('high-risk message returns high risk level', async () => {
    const request = makeRequest({
      inputType: 'message',
      text: 'send me your otp, pay immediately to receive your government benefit',
    });
    const response = await POST(request as unknown as Parameters<typeof POST>[0]);
    expect(response.status).toBe(200);
    const body = (await response.json()) as { success: boolean; data: { riskLevel: string; riskScore: number; signals: { code: string }[] } };
    expect(body.data.riskLevel).toBe('high');
    const codes = body.data.signals.map((s: { code: string }) => s.code);
    expect(codes).toContain('OTP_REQUEST');
  });

  it('invalid inputType returns 400', async () => {
    const request = makeRequest({
      inputType: 'invalid_type',
      text: 'hello',
    });
    const response = await POST(request as unknown as Parameters<typeof POST>[0]);
    expect(response.status).toBe(400);
  });

  it('missing text returns 400', async () => {
    const request = makeRequest({
      inputType: 'message',
      text: '',
    });
    const response = await POST(request as unknown as Parameters<typeof POST>[0]);
    expect(response.status).toBe(400);
  });

  it('missing inputType returns 400', async () => {
    const request = makeRequest({
      text: 'hello',
    });
    const response = await POST(request as unknown as Parameters<typeof POST>[0]);
    expect(response.status).toBe(400);
  });
});
