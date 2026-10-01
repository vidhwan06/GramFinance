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

describe('POST /api/fraud/check — request body limit (MED-05)', () => {
  const MAX_BODY_BYTES = 32 * 1024;

  function makeRawRequest(body: string, headers: Record<string, string> = {}): Request {
    return new Request('http://localhost/api/fraud/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body,
    }) as unknown as Request;
  }

  async function post(request: Request) {
    return POST(request as unknown as Parameters<typeof POST>[0]);
  }

  it('accepts a text payload at exactly the schema boundary', async () => {
    const response = await post(
      makeRawRequest(
        JSON.stringify({ inputType: 'message', text: 'a'.repeat(10_000) })
      )
    );
    expect(response.status).toBe(200);
  });

  it('accepts a body just under the raw limit and lets Zod reject the content', async () => {
    // 30 KB: over the 10,000-character schema maximum but under the body cap,
    // so it must fail validation (400) rather than the size guard (413).
    const response = await post(
      makeRawRequest(JSON.stringify({ inputType: 'message', text: 'a'.repeat(30_000) }))
    );
    expect(response.status).toBe(400);
  });

  it('rejects a body over the raw limit with 413 before parsing', async () => {
    const response = await post(makeRawRequest('x'.repeat(MAX_BODY_BYTES + 1)));
    expect(response.status).toBe(413);
    const body = (await response.json()) as { success: boolean; error: { code: string } };
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('rejects an over-declared Content-Length with 413 without reading the body', async () => {
    const response = await post(
      makeRawRequest(JSON.stringify({ inputType: 'message', text: 'hi' }), {
        'content-length': String(MAX_BODY_BYTES * 10),
      })
    );
    expect(response.status).toBe(413);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });
});
