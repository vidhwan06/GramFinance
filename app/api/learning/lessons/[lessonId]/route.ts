import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api/response';
import { ErrorFactories } from '@/lib/api/errors';
import { createClient } from '@/lib/supabase/server';
import { loadChapterNavigation, loadLessonDetail } from '@/features/learning/learning-service';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const uuidSchema = z.string().uuid();

/**
 * GET /api/learning/lessons/[lessonId]
 * Returns full educational content of an active lesson with sanitized quiz questions (if any).
 * Also returns chapter navigation (prev/next) within the module.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    const { lessonId } = await params;
    if (!uuidSchema.safeParse(lessonId).success) {
      throw ErrorFactories.badRequest('Invalid lesson ID format. Must be a valid UUID.');
    }

    const supabase = await createClient();
    const [lesson, navigation] = await Promise.all([
      loadLessonDetail(supabase, lessonId),
      loadChapterNavigation(supabase, lessonId),
    ]);

    if (!lesson) {
      throw ErrorFactories.notFound('Lesson not found.');
    }

    return successResponse({ ...lesson, navigation });
  } catch (error) {
    return errorResponse(error);
  }
}
