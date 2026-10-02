import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * A-3: the user's message must be redacted before it leaves this process.
 *
 * The reply was already stripped, which protects nothing on its own. The request
 * text is what is transmitted to a third party, and a user pasting an Aadhaar
 * number, OTP, UPI ID or account number was sending all of it to Google
 * verbatim. This audience is the least likely to redact for themselves.
 *
 * The assertion target is the actual argument handed to `generateContent`, not
 * a helper in isolation: a redaction applied to a copy that is then ignored is
 * exactly the failure mode worth guarding against.
 */

const mockGenerateContent = vi.fn();

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({ generateContent: mockGenerateContent }),
  })),
}));

vi.mock('@/lib/ai/rate-limiter', () => ({
  isRateLimited: vi.fn().mockReturnValue(false),
  getRetryDelayMs: vi.fn().mockReturnValue(0),
}));

import { POST } from '@/app/api/assistant/route';

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0];
}

async function ask(message: string, language: 'en' | 'kn' = 'en') {
  const response = await POST(makeRequest({ message, language }));
  const body = await response.json();
  return { response, body };
}

/** The exact user text the route handed to the Gemini SDK. */
function textSentToGemini(): string {
  expect(mockGenerateContent, 'generateContent must have been called').toHaveBeenCalled();
  const arg = mockGenerateContent.mock.calls[0][0];
  return arg.contents[0].parts[0].text as string;
}

beforeEach(() => {
  process.env.GEMINI_API_KEY = 'test-key';
  mockGenerateContent.mockResolvedValue({ response: { text: () => 'A helpful reply.' } });
});

afterEach(() => {
  delete process.env.GEMINI_API_KEY;
  vi.clearAllMocks();
});

describe('outbound PII redaction (A-3)', () => {
  it('does not send an Aadhaar number to Gemini', async () => {
    const secret = '1234 5678 9012';
    await ask(`My Aadhaar number is ${secret} and my instalment is late`);

    const sent = textSentToGemini();
    expect(sent).not.toContain(secret);
    expect(sent).not.toContain('123456789012');
    expect(sent).toContain('[Aadhaar redacted]');
    // The non-sensitive part of the question must survive, or the model gets a
    // content-free prompt and the feature degrades for everyone.
    expect(sent).toContain('my instalment is late');
  });

  it('does not send a dash-separated Aadhaar number to Gemini', async () => {
    await ask('My Aadhaar is 1234-5678-9012 please verify');

    const sent = textSentToGemini();
    expect(sent).not.toContain('1234-5678-9012');
    expect(sent).toContain('[Aadhaar redacted]');
  });

  it('does not send an OTP to Gemini', async () => {
    await ask('The OTP is 482913 for my account');

    const sent = textSentToGemini();
    expect(sent).not.toContain('482913');
    expect(sent).toContain('[OTP redacted]');
  });

  it('does not send a colon-introduced code to Gemini', async () => {
    await ask('your code: 123456');

    expect(textSentToGemini()).not.toContain('123456');
  });

  it('does not send a UPI ID to Gemini', async () => {
    await ask('Send money to my UPI ramesh.kumar@okaxis');

    const sent = textSentToGemini();
    expect(sent).not.toContain('ramesh.kumar@okaxis');
    expect(sent).toContain('[UPI redacted]');
  });

  it('does not send a bank account number to Gemini', async () => {
    await ask('My bank account number is 30123456789');

    const sent = textSentToGemini();
    expect(sent).not.toContain('30123456789');
    expect(sent).toContain('[account redacted]');
  });

  it('redacts several classes in one message', async () => {
    await ask('Aadhaar 1234 5678 9012, UPI ramesh.kumar@okaxis, OTP is 482913');

    const sent = textSentToGemini();
    expect(sent).not.toMatch(/1234[\s-]?5678[\s-]?9012/);
    expect(sent).not.toContain('ramesh.kumar@okaxis');
    expect(sent).not.toContain('482913');
  });
});

describe('non-sensitive messages are untouched (A-3)', () => {
  it('passes an ordinary question through verbatim', async () => {
    const message = 'What is an EMI and how does it work?';
    await ask(message);

    // Exactly unchanged: redaction must not degrade normal usage.
    expect(textSentToGemini()).toBe(message);
  });

  it('passes a Kannada-language request through verbatim', async () => {
    const message = 'EMI ಎಂದರೇನು?';
    await ask(message, 'kn');

    expect(textSentToGemini()).toBe(message);
  });

  it('still sends the system prompt unchanged', async () => {
    await ask('What is an EMI?');

    const arg = mockGenerateContent.mock.calls[0][0];
    expect(typeof arg.systemInstruction).toBe('string');
    expect(arg.systemInstruction).toContain('GramFinance');
  });
});

describe('existing behaviour is preserved (A-3)', () => {
  it('keeps the response-side redaction', async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => 'Please share OTP 998877 with support at a@b.com' },
    });
    const { body } = await ask('What is an EMI?');

    expect(body.data.reply).not.toContain('998877');
    expect(body.data.reply).not.toContain('a@b.com');
  });

  it('detects a deferral even when the message also contains PII', async () => {
    // Detection runs on the ORIGINAL message, so redacting first cannot change
    // whether the deterministic patterns fire.
    const { body } = await ask('Am I eligible for PM-KISAN? My aadhaar is 123456789012');

    expect(body.data.deferral).toEqual({ type: 'eligibility', href: '/schemes' });
  });

  it('does not alter the public response shape', async () => {
    const { response, body } = await ask('What is an EMI?');

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(Object.keys(body.data).sort()).toEqual(['deferral', 'reply']);
    expect(body.meta).toHaveProperty('timestamp');
  });

  it('still short-circuits investment advice without calling Gemini', async () => {
    const { body } = await ask('Should I invest in gold?');

    expect(mockGenerateContent).not.toHaveBeenCalled();
    expect(body.data.reply).toContain('SEBI');
  });

  it('does not leak the raw message into any console output', async () => {
    const spies = (['log', 'info', 'warn', 'error'] as const).map((k) =>
      vi.spyOn(console, k).mockImplementation(() => undefined)
    );
    const secret = '9876 5432 1098';

    await ask(`My aadhaar is ${secret}, tell me about savings`);

    for (const spy of spies) {
      for (const call of spy.mock.calls) {
        expect(JSON.stringify(call)).not.toContain(secret);
      }
    }
    spies.forEach((s) => s.mockRestore());
  });
});