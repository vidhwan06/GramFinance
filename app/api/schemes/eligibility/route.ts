import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api/response';
import { ErrorFactories } from '@/lib/api/errors';
import { readJsonBody } from '@/lib/api/read-json';
import { checkRateLimit, retryAfterSeconds, ROUTE_LIMITS } from '@/lib/api/rate-limit';
import {
  eligibilityRequestSchema,
  formatValidationIssues,
} from '@/features/schemes/eligibility/applicant-schema';
import {
  loadSchemeForEvaluation,
  loadAllActiveSchemesForEvaluation,
} from '@/features/schemes/eligibility/load-scheme-rules';
import { runEligibilityCheck } from '@/features/schemes/eligibility/check-eligibility-service';

/**
 * POST /api/schemes/eligibility
 *
 * Server-side eligibility. The browser submits APPLICANT INPUT ONLY; the server
 * loads the rules and produces the verdict. There is no request shape in which
 * a client can supply a result — see the `.strict()` note in
 * applicant-schema.ts.
 *
 * ── Authorisation ───────────────────────────────────────────────────────────
 * This uses the anon-key server client with the caller's session cookie, NOT the
 * service-role key. That means row-level security applies to this query exactly
 * as it applies to the browser: a draft, inactive or expired scheme is
 * invisible to this endpoint, so it cannot be used to discover one.
 *
 * This endpoint is PUBLIC: no session is required to run an eligibility check.
 *
 * ── Request body limit ───────────────────────────────────────────────────────
 * Bounded by readJsonBody, which counts the bytes it actually reads rather than
 * trusting Content-Length. See the note at the call site.
 *
 * BEHAVIOUR CHANGE: an oversized body now returns 413 PAYLOAD_TOO_LARGE rather
 * than 400 BAD_REQUEST. The previous check only trusted Content-Length, so it
 * reported the wrong status for a body that was genuinely too large while doing
 * nothing at all for a chunked or understated one.
 */

export const dynamic = 'force-dynamic';

/** Applicant profiles are tiny. Anything larger is not a real request. */
const MAX_BODY_BYTES = 16 * 1024;

export async function POST(request: NextRequest) {
  try {
    // Rate limit FIRST, before the body is even read and long before any
    // database work. This is the most expensive read path in the app: four
    // queries and a ~30 KB response, so an unthrottled caller multiplies both.
    // Eligibility is deliberately public, so IP is the only available key.
    const limit = ROUTE_LIMITS.eligibility;
    if (checkRateLimit(request, limit).limited) {
      throw ErrorFactories.rateLimited(
        'Too many requests. Please wait a moment.',
        retryAfterSeconds(request, limit)
      );
    }

    // Size-capped on the bytes actually read, not on the Content-Length header.
    // readJsonBody uses the header only as a cheap early exit and enforces the
    // real limit while counting the stream, so a request with no Content-Length
    // (chunked transfer) or a header that understates the body is still bounded.
    // Nothing larger than MAX_BODY_BYTES is ever assembled in memory.
    let payload: unknown;
    try {
      payload = await readJsonBody(request, MAX_BODY_BYTES);
    } catch (error) {
      if (error instanceof Error && error.name === 'ApiError') throw error;
      throw ErrorFactories.badRequest('Request body must be valid JSON.');
    }

    const parsed = eligibilityRequestSchema.safeParse(payload);
    if (!parsed.success) {
      throw ErrorFactories.badRequest(
        'The request body is not valid.',
        formatValidationIssues(parsed.error)
      );
    }

    const { schemeId, applicant } = parsed.data;

    // Load schemes with both flat rules and rule trees.
    // The evaluation engine uses the rule tree when present, falls back to flat rules.
    const schemes = schemeId
      ? await loadSchemeForEvaluation(schemeId).then(s => s ? [s] : [])
      : await loadAllActiveSchemesForEvaluation();

    // A requested scheme that is missing, or exists but is not active, is
    // reported identically: "not found". Distinguishing them would confirm the
    // existence of an unpublished scheme.
    if (schemeId && schemes.length === 0) {
      throw ErrorFactories.notFound('Scheme not found.');
    }

    const outcome = runEligibilityCheck(schemes, applicant);

    // Counts only. The applicant profile is never logged: it is personal data
    // and a request id is what makes a log line actionable.
    console.info('[eligibility] check complete', {
      requestedScheme: schemeId ?? 'all',
      schemeCount: outcome.summary.schemeCount,
      ruleCount: outcome.summary.ruleCount,
      problemRuleCount: outcome.summary.problemRuleCount,
      byStatus: outcome.summary.byStatus,
    });

    return successResponse(outcome);
  } catch (error) {
    // Log the real cause server-side; the client only ever sees the sanitised
    // message that errorResponse derives from the ApiError.
    const isExpected = error instanceof Error && error.name === 'ApiError';
    if (!isExpected) {
      console.error('[eligibility] unexpected failure', error);
    }
    return errorResponse(error);
  }
}
