import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api/response';
import { ErrorFactories } from '@/lib/api/errors';
import { checkRateLimit, retryAfterSeconds, ROUTE_LIMITS } from '@/lib/api/rate-limit';
import { createClient } from '@/lib/supabase/server';
import { loadChapterNavigation, loadLessonDetail } from '@/features/learning/learning-service';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const uuidSchema = z.string().uuid();

/**
 * GET /api/learning/lessons/[lessonId]
 * Returns full educational content of an active lesson with sanitized quiz questions (if any).
 * Also returns chapter navigation (prev/next) within the module.
 *
 * Authorisation: public, active-only. `loadLessonDetail` filters on
 * `status = 'active'` in the query itself and RLS filters it again, so a draft or
 * archived lesson is invisible here and returns 404 rather than its content.
 * Quiz questions are stripped of `correctAnswerIndex` by
 * `sanitizeQuestionsForClient` before they leave this function; grading happens
 * server-side in `submitQuizAnswers`.
 *
 * Rate limiting: 60/60s per IP, applied before any database work and before the
 * UUID check — otherwise an attacker could turn this route into an unmetered
 * 404 oracle by sending arbitrary ids. Its own scope, deliberately not shared
 * with the lesson-list route, so chapter-detail traffic cannot drain the
 * catalogue budget.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    const limit = ROUTE_LIMITS.learningLesson;
    if (checkRateLimit(request, limit).limited) {
      throw ErrorFactories.rateLimited(
        'Too many requests. Please wait a moment.',
        retryAfterSeconds(request, limit)
      );
    }

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
