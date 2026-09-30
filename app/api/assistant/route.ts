import { NextRequest } from 'next/server';
import { z } from 'zod';
import { successResponse, errorResponse } from '@/lib/api/response';
import { ErrorFactories } from '@/lib/api/errors';
import { getGenerativeModel } from '@/lib/ai/gemini';
import { buildSystemPrompt } from '@/lib/ai/prompt';
import { isRateLimited } from '@/lib/ai/rate-limiter';
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

const assistantRequestSchema = z.object({
  message: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
  language: z.enum(['en', 'kn']),
}).strict();

/** Extract a rate-limit key from the request. */
function getRateLimitKey(request: NextRequest): string {
  // Prefer the session user ID if available
  const userId = request.headers.get('x-user-id');
  if (userId) return `user:${userId}`;

  // Safe IP fallback — never log the value
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) {
    const ip = fwd.split(',')[0]?.trim();
    if (ip) return `ip:${ip}`;
  }

  return 'anonymous';
}

export async function POST(request: NextRequest) {
  try {
    // 1. Rate limit BEFORE any expensive work
    const rateKey = getRateLimitKey(request);
    if (isRateLimited(rateKey)) {
      throw ErrorFactories.rateLimited();
    }

    // 2. Parse and validate
    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
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

    // 4. Build system prompt and call Gemini
    const systemPrompt = buildSystemPrompt(language);
    const model = getGenerativeModel();

    const result = await model.generateContent({
      systemInstruction: systemPrompt,
      contents: [{ role: 'user', parts: [{ text: message }] }],
    });

    const reply = result.response.text();

    // 5. Post-process: strip PII
    const safeReply = stripPII(reply);

    // 6. If investment advice was requested, prepend a safety note
    const finalReply = isInvestment
      ? 'I cannot provide investment advice or guarantee returns. Please consult a SEBI-registered financial advisor for personalized guidance.\n\n' +
        safeReply
      : safeReply;

    return successResponse({
      reply: finalReply,
      deferral,
    });
  } catch (error) {
    // Never expose internals, API keys, or stack traces
    const isExpected = error instanceof Error && error.name === 'ApiError';
    if (!isExpected) {
      // Log a generic message — never the raw user input
      console.error('[assistant] unexpected failure');
    }

    // Gemini failures become a safe service-unavailable
    if (error instanceof Error && error.message.includes('GEMINI_API_KEY')) {
      return errorResponse(
        ErrorFactories.serviceUnavailable('AI assistant is not available.')
      );
    }

    return errorResponse(error);
  }
}
