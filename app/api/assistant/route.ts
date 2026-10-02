import { NextRequest } from 'next/server';
import { z } from 'zod';
import { successResponse, errorResponse } from '@/lib/api/response';
import { ErrorFactories } from '@/lib/api/errors';
import { readJsonBody } from '@/lib/api/read-json';
import { getGenerativeModel } from '@/lib/ai/gemini';
import { buildSystemPrompt } from '@/lib/ai/prompt';
import { checkRateLimit, retryAfterSeconds, ROUTE_LIMITS } from '@/lib/api/rate-limit';
import {
  detectDeferral,
  isInvestmentAdviceRequest,
  stripPII,
  type Deferral,
} from '@/lib/ai/guardrails';

/**
 * POST /api/assistant
 *
 * The AI assistant is an EXPLANATORY INTERFACE, NOT AN AUTHORITY.
 * It explains financial concepts and defers to deterministic
 * GramFinance tools for eligibility, fraud, and loan calculations.
 *
 * Security:
 * - GEMINI_API_KEY is server-only (never imported by client code)
 * - Raw user messages are never logged (they may contain PII)
 * - Request body is bounded
 * - Rate limiting happens BEFORE the Gemini call
 * - Gemini errors are sanitized — no internals leak to the client
 */

export const dynamic = 'force-dynamic';

/** Maximum message length — generous but bounded. */
const MAX_MESSAGE_LENGTH = 2000;

/**
 * Hard cap on the raw request body.
 *
 * Comfortably above the worst-case encoding of a 2,000-character message, and
 * enforced before anything is buffered — see `readJsonBody`.
 */
const MAX_BODY_BYTES = 8 * 1024;

/** Maximum time to wait for a Gemini response before aborting. */
const GEMINI_TIMEOUT_MS = 30_000;

const assistantRequestSchema = z.object({
  message: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
  language: z.enum(['en', 'kn']),
}).strict();

/**
 * Detect Gemini SDK upstream errors (quota exceeded, temporary unavailability).
 *
 * The Gemini SDK wraps HTTP errors as "[GoogleGenerativeAI Error]: ...".
 * We check for that prefix plus known upstream status codes to distinguish
 * provider-side failures from GramFinance's own errors.
 */
function isGeminiUpstreamError(error: Error): boolean {
  const msg = error.message;
  if (!msg.includes('GoogleGenerativeAI Error')) return false;
  return (
    msg.includes('429') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('503') ||
    msg.includes('Service Unavailable') ||
    msg.includes('timeout') ||
    msg.includes('aborted')
  );
}

/**
 * Extract a rate-limit key from the request.
 *
 * The assistant route is unauthenticated — there is no trustworthy
 * server-set user identity available. A client-supplied x-user-id
 * header would be spoofable, so it is intentionally NOT trusted.
 *
 * It now delegates to `resolveClientIp` in lib/api/rate-limit.ts. This route's
 * local copy used to fall back to the literal key `'anonymous'` when no
 * forwarded-IP header was present. That is a single global bucket: ten requests
 * from anywhere exhaust it and lock out every user for the rest of the window,
 * which is a denial-of-service lever rather than a limit. The shared helper has
 * no such fallback — it fails closed in production and uses a namespaced
 * `dev:` bucket in development. The header-parsing reasoning itself is
 * unchanged; it just lives in one place now.
 */

export async function POST(request: NextRequest) {
  try {
    // 1. Rate limit BEFORE any expensive work
    const limit = ROUTE_LIMITS.assistant;
    if (checkRateLimit(request, limit).limited) {
      throw ErrorFactories.rateLimited(
        'Too many requests. Please wait a moment.',
        retryAfterSeconds(request, limit)
      );
    }

    // 2. Parse and validate. The body is size-capped before it is buffered,
    //    so an oversized upload never reaches memory or the model.
    let payload: unknown;
    try {
      payload = await readJsonBody(request, MAX_BODY_BYTES);
    } catch (error) {
      if (error instanceof Error && error.name === 'ApiError') throw error;
      throw ErrorFactories.badRequest('Request body must be valid JSON.');
    }

    const parsed = assistantRequestSchema.safeParse(payload);
    if (!parsed.success) {
      const issues = parsed.error.issues.map(
        (issue) => `${issue.path.join('.')}: ${issue.message}`
      );
      throw ErrorFactories.badRequest('The request body is not valid.', issues);
    }

    const { message, language } = parsed.data;

    // 3. Guardrails — detect deferrals deterministically
    const deferral: Deferral | null = detectDeferral(message);
    const isInvestment = isInvestmentAdviceRequest(message);

    // 4. If investment advice was requested, return deterministic safety
    //    response WITHOUT calling Gemini. The model's output is never
    //    returned for investment-advice requests.
    if (isInvestment) {
      return successResponse({
        reply:
          'I cannot provide investment advice or guarantee returns. Please consult a SEBI-registered financial advisor for personalized guidance.',
        deferral,
      });
    }

    // 5. Build system prompt and call Gemini
    const systemPrompt = buildSystemPrompt(language);
    const model = getGenerativeModel();

    const result = await Promise.race([
      model.generateContent({
        systemInstruction: systemPrompt,
        contents: [{ role: 'user', parts: [{ text: message }] }],
      }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('[GoogleGenerativeAI Error]: The operation was aborted due to timeout')),
          GEMINI_TIMEOUT_MS
        )
      ),
    ]);

    const reply = result.response.text();

    // 6. Post-process: strip PII
    const safeReply = stripPII(reply);

    // 7. Handle empty/whitespace-only responses
    if (!safeReply.trim()) {
      return errorResponse(ErrorFactories.aiUnavailable());
    }

    return successResponse({
      reply: safeReply,
      deferral,
    });
  } catch (error) {
    // Never expose internals, API keys, or stack traces
    const isExpected = error instanceof Error && error.name === 'ApiError';
    if (!isExpected) {
      // Log a generic message — never the raw user input
      console.error('[assistant] unexpected failure');
    }

    // Gemini upstream errors (quota, temporary unavailability) → 503 AI_UNAVAILABLE
    if (error instanceof Error && isGeminiUpstreamError(error)) {
      return errorResponse(ErrorFactories.aiUnavailable());
    }

    // Missing API key → service unavailable
    if (error instanceof Error && error.message.includes('GEMINI_API_KEY')) {
      return errorResponse(
        ErrorFactories.serviceUnavailable('AI assistant is not available.')
      );
    }

    return errorResponse(error);
  }
}
