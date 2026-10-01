import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mutable mock state for the Gemini SDK
const mockGenerateContent = vi.fn();

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: mockGenerateContent,
    }),
  })),
}));

// Mock the rate limiter to always allow
vi.mock('@/lib/ai/rate-limiter', () => ({
  isRateLimited: vi.fn().mockReturnValue(false),
}));

import { POST } from '@/app/api/assistant/route';

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as Request;
}

describe('Assistant API', () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-key';
    mockGenerateContent.mockResolvedValue({
      response: { text: () => 'Test response from Gemini' },
    });
  });

  afterEach(() => {
    delete process.env.GEMINI_API_KEY;
    vi.clearAllMocks();
  });

  it('returns a reply for a valid request', async () => {
    const response = await POST(
      makeRequest({ message: 'What is EMI?', language: 'en' }) as unknown as Parameters<typeof POST>[0]
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.reply).toBe('Test response from Gemini');
    expect(body.meta).toHaveProperty('timestamp');
  });

  it('rejects an empty message', async () => {
    const response = await POST(
      makeRequest({ message: '', language: 'en' }) as unknown as Parameters<typeof POST>[0]
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('BAD_REQUEST');
  });

  it('rejects an oversized message', async () => {
    const longMessage = 'a'.repeat(2001);
    const response = await POST(
      makeRequest({ message: longMessage, language: 'en' }) as unknown as Parameters<typeof POST>[0]
    );
    expect(response.status).toBe(400);
  });

  it('rejects an invalid language', async () => {
    const response = await POST(
      makeRequest({ message: 'Hello', language: 'fr' }) as unknown as Parameters<typeof POST>[0]
    );
    expect(response.status).toBe(400);
  });

  it('rejects unknown keys (strict mode)', async () => {
    const response = await POST(
      makeRequest({ message: 'Hello', language: 'en', extra: 'bad' }) as unknown as Parameters<typeof POST>[0]
    );
    expect(response.status).toBe(400);
  });

  it('returns 429 when rate limited', async () => {
    const { isRateLimited } = await import('@/lib/ai/rate-limiter');
    vi.mocked(isRateLimited).mockReturnValueOnce(true);

    const response = await POST(
      makeRequest({ message: 'Hello', language: 'en' }) as unknown as Parameters<typeof POST>[0]
    );
    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body.error.code).toBe('RATE_LIMITED');
  });

  it('returns service-unavailable when Gemini fails', async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error('API Error'));

    const response = await POST(
      makeRequest({ message: 'Hello', language: 'en' }) as unknown as Parameters<typeof POST>[0]
    );
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.success).toBe(false);
    // Should not leak internal error details
    expect(body.error.message).not.toContain('API Error');
  });

  it('maps Gemini quota/429 to 503 AI_UNAVAILABLE', async () => {
    mockGenerateContent.mockRejectedValueOnce(
      new Error('[GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent: [429 Too Many Requests] Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 20, model: gemini-3.5-flash')
    );

    const response = await POST(
      makeRequest({ message: 'Hello', language: 'en' }) as unknown as Parameters<typeof POST>[0]
    );
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('AI_UNAVAILABLE');
    expect(body.error.message).toBe('The AI assistant is temporarily unavailable. Please try again later.');
    // Should not leak Gemini internals
    expect(body.error.message).not.toContain('Quota exceeded');
    expect(body.error.message).not.toContain('generativelanguage.googleapis.com');
  });

  it('maps Gemini 503 to 503 AI_UNAVAILABLE', async () => {
    mockGenerateContent.mockRejectedValueOnce(
      new Error('[GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent: [503 Service Unavailable]')
    );

    const response = await POST(
      makeRequest({ message: 'Hello', language: 'en' }) as unknown as Parameters<typeof POST>[0]
    );
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.error.code).toBe('AI_UNAVAILABLE');
  });

  it('does not map GramFinance rate limiter to AI_UNAVAILABLE', async () => {
    const { isRateLimited } = await import('@/lib/ai/rate-limiter');
    vi.mocked(isRateLimited).mockReturnValueOnce(true);

    const response = await POST(
      makeRequest({ message: 'Hello', language: 'en' }) as unknown as Parameters<typeof POST>[0]
    );
    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body.error.code).toBe('RATE_LIMITED');
    expect(body.error.code).not.toBe('AI_UNAVAILABLE');
  });

  it('includes deferral for eligibility questions', async () => {
    const response = await POST(
      makeRequest({ message: 'Am I eligible for PM-KISAN?', language: 'en' }) as unknown as Parameters<typeof POST>[0]
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.deferral).toEqual({
      type: 'eligibility',
      href: '/schemes',
    });
  });

  it('includes deferral for fraud questions', async () => {
    const response = await POST(
      makeRequest({ message: 'Is this message fraud?', language: 'en' }) as unknown as Parameters<typeof POST>[0]
    );
    const body = await response.json();
    expect(body.data.deferral).toEqual({
      type: 'fraud',
      href: '/check',
    });
  });

  it('does not log raw user messages', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await POST(
      makeRequest({ message: 'My Aadhaar is 123456789012', language: 'en' }) as unknown as Parameters<typeof POST>[0]
    );
    // console.error should not contain the raw message
    const calls = consoleSpy.mock.calls.flat().join(' ');
    expect(calls).not.toContain('123456789012');
    consoleSpy.mockRestore();
  });

  it('blocks investment advice and does not return model-generated content', async () => {
    // Even if Gemini returns investment advice, the API must not pass it through
    mockGenerateContent.mockResolvedValue({
      response: { text: () => 'You should invest in XYZ stock for guaranteed 50% returns.' },
    });

    const response = await POST(
      makeRequest({ message: 'Should I invest in mutual funds?', language: 'en' }) as unknown as Parameters<typeof POST>[0]
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    // The reply must be the deterministic safety message, NOT the model output
    expect(body.data.reply).toBe(
      'I cannot provide investment advice or guarantee returns. Please consult a SEBI-registered financial advisor for personalized guidance.'
    );
    expect(body.data.reply).not.toContain('XYZ stock');
    expect(body.data.reply).not.toContain('guaranteed 50% returns');
  });

  it('does not call Gemini for investment advice requests', async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => 'Some investment advice' },
    });

    await POST(
      makeRequest({ message: 'Where should I put my money?', language: 'en' }) as unknown as Parameters<typeof POST>[0]
    );
    // Gemini should never be called for investment advice
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it('still calls Gemini for normal financial-literacy questions', async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => 'EMI is Equated Monthly Installment.' },
    });

    const response = await POST(
      makeRequest({ message: 'What is EMI?', language: 'en' }) as unknown as Parameters<typeof POST>[0]
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.reply).toBe('EMI is Equated Monthly Installment.');
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it('returns AI_UNAVAILABLE when Gemini response is empty', async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => '' },
    });

    const response = await POST(
      makeRequest({ message: 'What is EMI?', language: 'en' }) as unknown as Parameters<typeof POST>[0]
    );
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('AI_UNAVAILABLE');
  });

  it('returns AI_UNAVAILABLE when Gemini response is whitespace-only', async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => '   \n\t  ' },
    });

    const response = await POST(
      makeRequest({ message: 'What is EMI?', language: 'en' }) as unknown as Parameters<typeof POST>[0]
    );
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('AI_UNAVAILABLE');
  });

  it('handles Gemini timeout as AI_UNAVAILABLE', async () => {
    mockGenerateContent.mockRejectedValueOnce(
      new Error('[GoogleGenerativeAI Error]: The operation was aborted due to timeout')
    );

    const response = await POST(
      makeRequest({ message: 'What is EMI?', language: 'en' }) as unknown as Parameters<typeof POST>[0]
    );
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('AI_UNAVAILABLE');
  });
});

describe('Assistant API — request body limit (MED-05)', () => {
  const MAX_BODY_BYTES = 8 * 1024;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-key';
    mockGenerateContent.mockResolvedValue({
      response: { text: () => 'Test response from Gemini' },
    });
  });

  afterEach(() => {
    delete process.env.GEMINI_API_KEY;
    vi.clearAllMocks();
  });

  function makeRawRequest(body: string, headers: Record<string, string> = {}): Request {
    return new Request('http://localhost/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body,
    }) as unknown as Request;
  }

  async function post(request: Request) {
    return POST(request as unknown as Parameters<typeof POST>[0]);
  }

  it('accepts a message at the schema boundary', async () => {
    const response = await post(
      makeRawRequest(JSON.stringify({ message: 'a'.repeat(2000), language: 'en' }))
    );
    expect(response.status).toBe(200);
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it('still returns 400 for a schema violation inside the size cap', async () => {
    // 2001 characters: valid JSON under 8 KB, so Zod - not the size guard -
    // is what rejects it.
    const response = await post(
      makeRawRequest(JSON.stringify({ message: 'a'.repeat(2001), language: 'en' }))
    );
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe('BAD_REQUEST');
  });

  it('rejects a body over the raw limit with 413 before any model call', async () => {
    const response = await post(makeRawRequest('x'.repeat(MAX_BODY_BYTES + 1)));
    expect(response.status).toBe(413);
    const body = (await response.json()) as { success: boolean; error: { code: string } };
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('PAYLOAD_TOO_LARGE');
    // Rejected before the model is ever touched.
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it('rejects an over-declared Content-Length with 413 without reading the body', async () => {
    const response = await post(
      makeRawRequest(JSON.stringify({ message: 'Hello', language: 'en' }), {
        'content-length': String(MAX_BODY_BYTES * 10),
      })
    );
    expect(response.status).toBe(413);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe('PAYLOAD_TOO_LARGE');
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it('ignores a malformed Content-Length and still enforces the limit', async () => {
    const response = await post(
      makeRawRequest('x'.repeat(MAX_BODY_BYTES + 1), { 'content-length': 'not-a-number' })
    );
    expect(response.status).toBe(413);
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });
});
