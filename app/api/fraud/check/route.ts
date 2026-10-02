/**
 * POST /api/fraud/check
 *
 * Validates the request using Zod, runs the fraud engine,
 * performs scheme-aware analysis, and returns an explainable
 * fraud check result.
 *
 * Scheme recognition and claim analysis use the existing
 * GramFinance scheme catalogue (server-side only).
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { successResponse, errorResponse } from '@/lib/api/response';
import { ErrorFactories } from '@/lib/api/errors';
import { readJsonBody } from '@/lib/api/read-json';
import { checkRateLimit, retryAfterSeconds, ROUTE_LIMITS } from '@/lib/api/rate-limit';
import { runFraudEngine } from '@/lib/fraud/fraud-engine';
import { listActiveSchemes } from '@/features/schemes/schemes-service';

const MAX_TEXT_LENGTH = 10_000;

/**
 * Hard cap on the raw request body.
 *
 * A 10,000-character message is ~30 KB when written in Kannada, so this sits
 * just above that worst case while still rejecting anything meaningfully
 * larger long before it is buffered — see `readJsonBody`.
 */
const MAX_BODY_BYTES = 32 * 1024;

const fraudCheckSchema = z.object({
  inputType: z.enum([
    'message',
    'url',
    'upi',
    'phone',
    'scheme_claim',
    'general',
  ]),
  text: z.string().min(1).max(MAX_TEXT_LENGTH).refine(
    (v) => v.trim().length > 0,
    { message: 'Text cannot be whitespace-only.' },
  ),
}).strict();

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Rate limit FIRST, before the body is read and before the scheme lookup.
    // The engine itself is pure and cheap, but every call still performs one
    // database query, so an unthrottled caller multiplies origin load. The route
    // is public, so IP is the only available key.
    const limit = ROUTE_LIMITS.fraud;
    if (checkRateLimit(request, limit).limited) {
      throw ErrorFactories.rateLimited(
        'Too many requests. Please wait a moment.',
        retryAfterSeconds(request, limit)
      );
    }

    // Size-capped before buffering; see `readJsonBody`.
    let payload: unknown;
    try {
      payload = await readJsonBody(request, MAX_BODY_BYTES);
    } catch (error) {
      if (error instanceof Error && error.name === 'ApiError') throw error;
      throw ErrorFactories.badRequest('Request body must be valid JSON.');
    }

    const parsed = fraudCheckSchema.safeParse(payload);
    if (!parsed.success) {
      const issues = parsed.error.issues.map(
        (issue) => `${issue.path.join('.')}: ${issue.message}`
      );
      throw ErrorFactories.badRequest('The request body is not valid.', issues);
    }

    const { inputType, text } = parsed.data;

    // Fetch active schemes for scheme-aware analysis (server-side only)
    let activeSchemes: Awaited<ReturnType<typeof listActiveSchemes>> = [];
    try {
      activeSchemes = await listActiveSchemes();
    } catch {
      // If scheme catalogue is unavailable, proceed with basic fraud check
      // Scheme recognition is best-effort; core fraud detection still works
    }

    const result = runFraudEngine({ inputType, text }, { activeSchemes });

    return successResponse(result);
  } catch (error) {
    const isExpected = error instanceof Error && error.name === 'ApiError';
    if (!isExpected) {
      console.error('[fraud] unexpected failure', error);
    }
    return errorResponse(error);
  }
}
