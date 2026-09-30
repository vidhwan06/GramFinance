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
});
