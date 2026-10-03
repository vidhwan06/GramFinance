import { describe, it, expect, afterEach, vi } from 'vitest';

/**
 * P1-5: the Gemini model configuration.
 *
 * ── Why this file exists ─────────────────────────────────────────────────────
 * The final audit flagged `gemini-3.5-flash` as an unverified default and asked
 * for it to be checked rather than assumed. It WAS checked, against the live
 * `GET /v1beta/models` endpoint using this project's own key, and it is present
 * in the returned list - so the identifier is real, and it was deliberately left
 * alone. Replacing a verified default with a different, less certain name would
 * have been the actual regression.
 *
 * That check is a one-off and cannot be re-run from CI without a network call
 * and a paid key. What this file does instead is pin the two properties that
 * actually matter at runtime, so that a future change to either is deliberate:
 *
 *   1. the default identifier itself, and
 *   2. the precedence rule - an explicit GEMINI_MODEL always wins.
 *
 * The second is the one that matters operationally. `GEMINI_MODEL` is currently
 * UNSET in `.env.local`, so the default IS the live model; that is worth a
 * regression test rather than a comment, because an unset variable is invisible
 * at review time.
 */

/** The model name the SDK was asked for, captured per test. */
let requestedModel: string | null = null;

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel(config: { model: string }) {
      requestedModel = config.model;
      // The caller only ever awaits `generateContent`; nothing else is used here.
      return {
        generateContent: async () => ({ response: { text: () => 'ok' } }),
      };
    }
  },
}));

const originalModel = process.env.GEMINI_MODEL;
const originalKey = process.env.GEMINI_API_KEY;

afterEach(() => {
  if (originalModel === undefined) delete process.env.GEMINI_MODEL;
  else process.env.GEMINI_MODEL = originalModel;
  if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = originalKey;
  requestedModel = null;
  vi.resetModules();
});

/** Fresh import each time, because `getGenerativeModel` caches its client. */
async function resolveModelName(): Promise<string> {
  vi.resetModules();
  const { getGenerativeModel } = await import('@/lib/ai/gemini');
  getGenerativeModel();
  return requestedModel!;
}

describe('P1-5 Gemini model configuration', () => {
  it('falls back to the verified default when GEMINI_MODEL is unset', async () => {
    delete process.env.GEMINI_MODEL;
    process.env.GEMINI_API_KEY = 'test-key';
    expect(await resolveModelName()).toBe('gemini-3.5-flash');
  });

  it('treats an empty GEMINI_MODEL as unset, as `||` intends', async () => {
    process.env.GEMINI_MODEL = '';
    process.env.GEMINI_API_KEY = 'test-key';
    expect(await resolveModelName()).toBe('gemini-3.5-flash');
  });

  it('lets an explicit GEMINI_MODEL override the default', async () => {
    process.env.GEMINI_MODEL = 'gemini-2.5-flash';
    process.env.GEMINI_API_KEY = 'test-key';
    expect(await resolveModelName()).toBe('gemini-2.5-flash');
  });

  it('picks up a changed GEMINI_MODEL without a restart', async () => {
    // The client is cached per model name, so an environment change must be
    // honoured. This is what makes pinning a model in a deploy target work.
    process.env.GEMINI_API_KEY = 'test-key';

    process.env.GEMINI_MODEL = 'gemini-2.5-flash';
    expect(await resolveModelName()).toBe('gemini-2.5-flash');

    process.env.GEMINI_MODEL = 'gemini-2.5-flash-lite';
    expect(await resolveModelName()).toBe('gemini-2.5-flash-lite');
  });

  it('throws a message naming the variable but never its value', async () => {
    // A missing key must fail with an actionable message that cannot leak the
    // secret, because the assistant route surfaces this text to a 503 decision.
    delete process.env.GEMINI_API_KEY;
    vi.resetModules();
    const { getGenerativeModel } = await import('@/lib/ai/gemini');

    expect(() => getGenerativeModel()).toThrow(/GEMINI_API_KEY/);
    try {
      getGenerativeModel();
    } catch (error) {
      expect((error as Error).message).not.toMatch(/[A-Za-z0-9_-]{20,}/);
    }
  });

  it('documents the verification, so the identifier is not re-litigated', async () => {
    const { readFileSync } = await import('node:fs');
    const source = readFileSync('lib/ai/gemini.ts', 'utf8');
    // The audit finding and its resolution must stay on the record next to the
    // constant, otherwise the next reviewer raises it again from scratch.
    expect(source).toContain('gemini-3.5-flash');
    expect(source).toMatch(/verif/i);
    expect(source).toMatch(/v1beta\/models/);
  });

  it('keeps .env.example in step with the code', async () => {
    const { readFileSync } = await import('node:fs');
    const example = readFileSync('.env.example', 'utf8');
    // The example documents the default; if the constant moves, this fails.
    expect(example).toContain('gemini-3.5-flash');
  });
});
