import { successResponse, errorResponse } from '@/lib/api/response';
import { ErrorFactories } from '@/lib/api/errors';
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
 */

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const schemes = await listActiveSchemes();

    return successResponse({
      schemes,
      // An honest, non-fabricated count. No ratings, no popularity figures.
      count: schemes.length,
    });
  } catch (error) {
    console.error('[schemes] GET /api/schemes failed', error);
    return errorResponse(ErrorFactories.internal('Could not load schemes.'));
  }
}
