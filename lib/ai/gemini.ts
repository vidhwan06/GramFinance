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

/** Default model when GEMINI_MODEL is not set. */
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
