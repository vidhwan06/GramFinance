import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api/response';
import { ErrorFactories, ApiError } from '@/lib/api/errors';
import { checkRateLimit, retryAfterSeconds, ROUTE_LIMITS } from '@/lib/api/rate-limit';
import { listActiveSchemes } from '@/features/schemes/schemes-service';

/**
 * GET /api/schemes
 *
 * The published scheme catalogue over HTTP.
 *
 * It delegates to `listActiveSchemes`, the same function the Server Components
 * call, so there is exactly one implementation of "read a published scheme" and
 * the two cannot drift.
 *
 * Authorisation: the read goes through `lib/supabase/server`, which uses the
 * anon key with the caller's session cookie. Row-level security therefore
 * applies here exactly as it applies in the browser, and a draft, inactive or
 * expired scheme cannot be returned even if the `status` filter were removed.
 * The service-role key is not used and is not present in this module.
 *
 * No eligibility is computed here. That is `POST /api/schemes/eligibility`.
 *
 * ── Public caching (F3) ──────────────────────────────────────────────────────
 * This response is safe to cache in a shared cache, and was verified to be
 * byte-identical across differing source IP, `Accept-Language`, and a bogus auth
 * cookie. Three properties make that true:
 *
 *   1. RLS filters on `status = 'active'`, which is not user-dependent, so the
 *      row set is the same for every caller.
 *   2. Each scheme carries BOTH `nameEn`/`nameKn` and `descriptionEn`/
 *      `descriptionKn`, so language choice cannot fragment the cache. That is
 *      also why no `Vary` is set: the response genuinely does not vary.
 *   3. The route reads no query parameters.
 *
 * `max-age=60` with `s-maxage=300` lets a CDN serve most traffic for five
 * minutes while a browser revalidates each minute; `stale-while-revalidate`
 * keeps the endpoint responsive if the origin is briefly slow. An operator
 * changing a scheme's `status` is therefore visible within about five minutes.
 *
 * Draft schemes remain unreachable: they are filtered by RLS before this code
 * runs, so a cache hit can never contain one.
 *
 * ── Why `force-dynamic` stays ────────────────────────────────────────────────
 * `listActiveSchemes` reaches `lib/supabase/server`, which awaits `cookies()`,
 * so this route genuinely cannot be statically prerendered. Framework caching is
 * therefore neither available nor used: caching here is explicit and entirely
 * under this route's control, which is what keeps a cookie-bearing endpoint from
 * ever being cached by accident.
 *
 * ── Rate limit ──────────────────────────────────────────────────────────────
 * 60/60s per IP is a backstop only. Caching is the primary load-reduction
 * mechanism, so this ceiling is deliberately generous and exists to stop a
 * client that bypasses the cache from reading the origin without bound.
 */

export const dynamic = 'force-dynamic';

const CACHE_CONTROL =
  'public, max-age=60, s-maxage=300, stale-while-revalidate=600';

export async function GET(request: NextRequest) {
  try {
    const limit = ROUTE_LIMITS.schemes;
    if (checkRateLimit(request, limit).limited) {
      throw ErrorFactories.rateLimited(
        'Too many requests. Please wait a moment.',
        retryAfterSeconds(request, limit)
      );
    }

    const schemes = await listActiveSchemes();

    const payload = {
      schemes,
      // An honest, non-fabricated count. No ratings, no popularity figures.
      count: schemes.length,
    };

    // ETag over the data only, never over the envelope: `meta.timestamp`
    // changes on every response, so including it would make the validator
    // useless and defeat conditional requests entirely.
    const etag = `"${createHash('sha256')
      .update(JSON.stringify(payload))
      .digest('hex')
      .slice(0, 32)}"`;

    const headers: Record<string, string> = {
      'Cache-Control': CACHE_CONTROL,
      ETag: etag,
    };

    // Conditional request. A matching validator means the client already holds
    // the current catalogue, so 304 with no body.
    if (request.headers.get('if-none-match') === etag) {
      return new NextResponse(null, { status: 304, headers });
    }

    return successResponse(payload, 200, headers);
  } catch (error) {
    // An ApiError raised above (429 rate limited) carries its own status,
    // headers and message and must reach the client intact. Only a genuinely
    // unexpected failure is collapsed into a sanitised 500.
    if (error instanceof ApiError) {
      return errorResponse(error);
    }
    console.error('[schemes] GET /api/schemes failed', error);
    return errorResponse(ErrorFactories.internal('Could not load schemes.'));
  }
}