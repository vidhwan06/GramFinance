import { successResponse, errorResponse } from '@/lib/api/response';
import { createClient } from '@/lib/supabase/server';
import { loadActiveLessons, loadModules } from '@/features/learning/learning-service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/learning/lessons
 * Returns summary list of all active learning lessons, deterministically ordered.
 * Also returns module information with chapter counts.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const [lessons, modules] = await Promise.all([
      loadActiveLessons(supabase),
      loadModules(supabase),
    ]);
    return successResponse({ lessons, modules });
  } catch (error) {
    return errorResponse(error);
  }
}
