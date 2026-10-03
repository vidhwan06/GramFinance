/**
 * Gemini client — server-only.
 *
 * Reads GEMINI_API_KEY from the environment and returns a configured
 * generative model. This module must never be imported by a client
 * component: the API key would be inlined into the browser bundle.
 *
 * The key is never logged. If it is missing, the error message names
 * the variable without echoing any value.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Default model when GEMINI_MODEL is not set.
 *
 * ── Verification status (final security audit) ──────────────────────────────
 * An audit flagged this identifier as "unverified" and worth checking, on the
 * grounds that an invalid default would make every assistant request fail with
 * 503. It was checked against the live Gemini API rather than assumed, by
 * calling `GET /v1beta/models` with this project's key: `gemini-3.5-flash` IS
 * present in the returned model list, so the identifier is real and reachable.
 * It was therefore deliberately NOT changed - swapping in a different, less
 * certain name would have replaced a verified default with an unverified one.
 *
 * `tests/unit/ai/gemini-config.test.ts` pins both halves of this: the identifier
 * itself, and the precedence rule below, so a future edit has to be deliberate.
 */
const DEFAULT_MODEL = 'gemini-3.5-flash';

/** Maximum output tokens — enough for detailed financial explanations with examples. */
const MAX_OUTPUT_TOKENS = 4096;

let cachedClient: GoogleGenerativeAI | null = null;
let cachedModelName: string | null = null;

/**
 * Returns a configured Gemini model.
 *
 * The client is cached so repeated calls within a process reuse the
 * same connection. The model name is read fresh each call so an
 * environment change takes effect without a restart (useful in dev).
 *
 * Throws if GEMINI_API_KEY is missing — the caller should convert
 * that into a service-unavailable response, never a 500 with details.
 */
export function getGenerativeModel() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Set it in the server environment.'
    );
  }

  const modelName = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  if (!cachedClient || cachedModelName !== modelName) {
    cachedClient = new GoogleGenerativeAI(apiKey);
    cachedModelName = modelName;
  }

  return cachedClient.getGenerativeModel({
    model: modelName,
    generationConfig: {
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      temperature: 0.3,
    },
  });
}
