import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api/response';
import { ErrorFactories } from '@/lib/api/errors';
import { createClient } from '@/lib/supabase/server';
import { submitQuizAnswers } from '@/features/learning/learning-service';
import { quizSubmissionRequestSchema } from '@/features/learning/schemas';

export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 16 * 1024;

/**
 * POST /api/learning/quiz/submit
 *
 * Scores a user quiz submission against server-stored questions.
 * Authentication is strictly enforced via RLS and auth.getUser().
 * Returns 401 if caller is unauthenticated.
 */
export async function POST(request: NextRequest) {
  try {
    const declaredLength = Number(request.headers.get('content-length') ?? '0');
    if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
      throw ErrorFactories.badRequest('Request body is too large.');
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      throw ErrorFactories.badRequest('Request body must be valid JSON.');
    }

    const parsed = quizSubmissionRequestSchema.safeParse(payload);
    if (!parsed.success) {
      throw ErrorFactories.badRequest('Invalid submission payload.', parsed.error.format());
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw ErrorFactories.unauthorized('Authentication is required to submit quizzes.');
    }

    const result = await submitQuizAnswers(supabase, parsed.data, true);
    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
