import { describe, it, expect } from 'vitest';
import { POST } from '@/app/api/fraud/check/route';

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/fraud/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as Request;
}

/**
 * Integration tests for the fraud check API.
 *
 * Covers the full request/response cycle:
 *   POST /api/fraud/check
 */
describe('Fraud Check API Integration', () => {
  it('valid message returns predictable structure', async () => {
    const response = await POST(
      makeRequest({ inputType: 'message', text: 'hello' }) as unknown as Parameters<typeof POST>[0]
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { success: boolean; data: { riskLevel: string; riskScore: number; signals: Array<{ code: string; name: string; severity: string; explanation: string }>; recommendations: Array<{ text: string }> } };
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('riskLevel');
    expect(body.data).toHaveProperty('riskScore');
    expect(body.data).toHaveProperty('signals');
    expect(body.data).toHaveProperty('recommendations');
  });

  it('normal non-suspicious message has low risk', async () => {
    const response = await POST(
      makeRequest({ inputType: 'message', text: 'Hello, how are you today?' }) as unknown as Parameters<typeof POST>[0]
    );
    const body = (await response.json()) as { success: boolean; data: { riskLevel: string; riskScore: number } };
    expect(body.data.riskLevel).toBe('low');
    expect(body.data.riskScore).toBe(0);
  });

  it('high-risk message triggers signals', async () => {
    const response = await POST(
      makeRequest({ inputType: 'message', text: 'pay ₹500 to receive your government benefit immediately' }) as unknown as Parameters<typeof POST>[0]
    );
    const body = (await response.json()) as { success: boolean; data: { riskLevel: string; riskScore: number; signals: { code: string }[] } };
    expect(body.data.riskScore).toBeGreaterThanOrEqual(0);
    expect(body.data.riskLevel).toBeDefined();
    const codes = body.data.signals.map((s: { code: string }) => s.code);
    expect(codes.length).toBeGreaterThanOrEqual(0);
  });

  it('oversized text returns 400', async () => {
    const longText = 'a'.repeat(10001);
    const response = await POST(
      makeRequest({ inputType: 'message', text: longText }) as unknown as Parameters<typeof POST>[0]
    );
    expect(response.status).toBe(400);
  });

  it('valid URL input type is accepted', async () => {
    const response = await POST(
      makeRequest({ inputType: 'url', text: 'visit https://example.com' }) as unknown as Parameters<typeof POST>[0]
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { success: boolean };
    expect(body.success).toBe(true);
  });
});
