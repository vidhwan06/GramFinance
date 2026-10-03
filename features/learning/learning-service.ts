import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, DbLesson, DbQuiz } from '@/types/database';
import { ErrorFactories } from '@/lib/api/errors';
import type {
  ChapterNavigation,
  LessonCategory,
  LessonContent,
  LessonDetail,
  LessonDifficulty,
  LessonStatus,
  LessonSummary,
  ModuleInfo,
  QuizQuestionClient,
  QuizQuestionResult,
  QuizQuestionServer,
  QuizSubmissionResult,
} from './types';
import {
  lessonContentSchema,
  quizQuestionServerSchema,
  type QuizSubmissionPayload,
} from './schemas';

// ─────────────────────────────────────────────────────────────────────────────
// Pure Quiz Scoring
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pure, deterministic quiz scoring function.
 * Evaluates user selected option indexes against server-verified correct answers.
 * Returns detailed result including per-question explanations and pass/fail verdict.
 */
export function calculateQuizScore(
  questions: QuizQuestionServer[],
  userAnswers: Array<{ questionId: string; selectedIndex: number }>,
  lessonId: string,
  quizId: string
): QuizSubmissionResult {
  const answerMap = new Map<string, number>();
  for (const ans of userAnswers) {
    answerMap.set(ans.questionId, ans.selectedIndex);
  }

  let correctCount = 0;
  const evaluatedAnswers: QuizQuestionResult[] = questions.map((q) => {
    const selectedIndex = answerMap.has(q.id) ? answerMap.get(q.id)! : -1;
    const isCorrect = selectedIndex === q.correctAnswerIndex;
    if (isCorrect) {
      correctCount++;
    }

    return {
      questionId: q.id,
      question: q.question,
      options: q.options,
      selectedIndex,
      correctAnswerIndex: q.correctAnswerIndex,
      isCorrect,
      explanation: q.explanation,
    };
  });

  const totalQuestions = questions.length;
  const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  // 60% standard passing threshold for safety/literacy modules
  const passed = percentage >= 60;

  return {
    lessonId,
    quizId,
    score: correctCount,
    totalQuestions,
    percentage,
    passed,
    answers: evaluatedAnswers,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Serialization & Sanitization Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function parseLessonContent(raw: unknown): LessonContent {
  const parsed = lessonContentSchema.safeParse(raw);
  if (parsed.success) {
    return parsed.data;
  }
  // Fallback graceful parser for content blobs
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    concept: typeof obj.concept === 'string' ? obj.concept : '',
    whyItMatters: typeof obj.whyItMatters === 'string' ? obj.whyItMatters : undefined,
    explanation: typeof obj.explanation === 'string' ? obj.explanation : '',
    steps: Array.isArray(obj.steps) ? obj.steps.filter((s): s is string => typeof s === 'string') : undefined,
    example: typeof obj.example === 'string' ? obj.example : '',
    visual: typeof obj.visual === 'string' ? obj.visual : '',
    commonMistakes: typeof obj.commonMistakes === 'string'
      ? obj.commonMistakes
      : Array.isArray(obj.commonMistakes)
        ? obj.commonMistakes.filter((s): s is string => typeof s === 'string')
        : '',
    practicalTakeaway: typeof obj.practicalTakeaway === 'string'
      ? obj.practicalTakeaway
      : Array.isArray(obj.practicalTakeaway)
        ? obj.practicalTakeaway.filter((s): s is string => typeof s === 'string')
        : '',
    quickRecap: Array.isArray(obj.quickRecap) ? obj.quickRecap.filter((s): s is string => typeof s === 'string') : undefined,
  };
}

export function parseServerQuestions(rawArray: unknown[]): QuizQuestionServer[] {
  if (!Array.isArray(rawArray)) return [];
  const results: QuizQuestionServer[] = [];
  for (const item of rawArray) {
    const parsed = quizQuestionServerSchema.safeParse(item);
    if (parsed.success) {
      results.push(parsed.data);
    }
  }
  return results;
}

export function sanitizeQuestionsForClient(questions: QuizQuestionServer[]): QuizQuestionClient[] {
  return questions.map((q) => ({
    id: q.id,
    question: q.question,
    options: q.options,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Module Definitions
// ─────────────────────────────────────────────────────────────────────────────

export const MODULE_DEFINITIONS: Record<LessonCategory, Omit<ModuleInfo, 'chapterCount'>> = {
  banking: {
    category: 'banking',
    title_en: 'Banking & Accounts',
    title_kn: 'ಬ್ಯಾಂಕಿಂಗ್ ಮತ್ತು ಖಾತೆಗಳು',
    description_en: 'Learn how bank accounts work, types of accounts, and how to keep your money safe.',
    description_kn: 'ಬ್ಯಾಂಕ್ ಖಾತೆಗಳು ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತವೆ, ಖಾತೆಗಳ ಪ್ರಕಾರಗಳು ಮತ್ತು ನಿಮ್ಮ ಹಣವನ್ನು ಸುರಕ್ಷಿತವಾಗಿ ಇಡುವುದು ಹೇಗೆ ಎಂಬುದನ್ನು ಕಲಿಯಿರಿ.',
  },
  saving: {
    category: 'saving',
    title_en: 'Savings & Buffers',
    title_kn: 'ಉಳಿತಾಯ ಮತ್ತು ತುರ್ತು ನಿಧಿ',
    description_en: 'Build emergency funds, set savings goals, and avoid common mistakes.',
    description_kn: 'ತುರ್ತು ನಿಧಿ ನಿರ್ಮಿಸಿ, ಉಳಿತಾಯ ಗುರಿಗಳನ್ನು ನಿಗದಿಪಡಿಸಿ ಮತ್ತು ಸಾಮಾನ್ಯ ತಪ್ಪುಗಳನ್ನು ತಪ್ಪಿಸಿ.',
  },
  borrowing: {
    category: 'borrowing',
    title_en: 'Loans & Borrowing',
    title_kn: 'ಸಾಲ ಮತ್ತು ಮರುಪಾವತಿ',
    description_en: 'Understand loans, interest rates, EMI, and how to borrow safely.',
    description_kn: 'ಸಾಲ, ಬಡ್ಡಿ ದರ, EMI ಮತ್ತು ಸುರಕ್ಷಿತವಾಗಿ ಸಾಲ ಪಡೆಯುವುದು ಹೇಗೆ ಎಂಬುದನ್ನು ಅರ್ಥಮಾಡಿಕೊಳ್ಳಿ.',
  },
  insurance: {
    category: 'insurance',
    title_en: 'Insurance & Protection',
    title_kn: 'ವಿಮೆ ಮತ್ತು ರಕ್ಷಣೆ',
    description_en: 'Learn about insurance types, premiums, claims, and avoiding scams.',
    description_kn: 'ವಿಮೆ ಪ್ರಕಾರಗಳು, ಪ್ರೀಮಿಯಂ, ಹಕ್ಕುಗಳು ಮತ್ತು ವಂಚನೆಗಳನ್ನು ತಪ್ಪಿಸುವುದು ಹೇಗೆ ಎಂಬುದನ್ನು ಕಲಿಯಿರಿ.',
  },
  'digital-payments': {
    category: 'digital-payments',
    title_en: 'Digital Payments & UPI',
    title_kn: 'ಡಿಜಿಟಲ್ ಪಾವತಿ ಮತ್ತು UPI',
    description_en: 'Master UPI, QR codes, and safe digital payment habits.',
    description_kn: 'UPI, QR ಕೋಡ್‌ಗಳು ಮತ್ತು ಸುರಕ್ಷಿತ ಡಿಜಿಟಲ್ ಪಾವತಿ ಅಭ್ಯಾಸಗಳನ್ನು ಕಲಿಯಿರಿ.',
  },
  'fraud-awareness': {
    category: 'fraud-awareness',
    title_en: 'Fraud Awareness & Safety',
    title_kn: 'ವಂಚನೆ ಅರಿವು ಮತ್ತು ಸುರಕ್ಷತೆ',
    description_en: 'Spot scams, protect your OTP/PIN, and know what to do if scammed.',
    description_kn: 'ವಂಚನೆಗಳನ್ನು ಗುರುತಿಸಿ, OTP/PIN ಅನ್ನು ರಕ್ಷಿಸಿ ಮತ್ತು ವಂಚನೆಗೆ ಒಳಗಾದರೆ ಏನು ಮಾಡಬೇಕು ಎಂಬುದನ್ನು ತಿಳಿಯಿರಿ.',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Server Data Fetching & Submission Services
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Loads all active lessons in deterministic order (category ASC, sort_order ASC).
 */
export async function loadActiveLessons(
  supabase: SupabaseClient<Database>
): Promise<LessonSummary[]> {
  const { data, error } = await supabase
    .from('lessons')
    .select('id, category, difficulty, status, title_en, title_kn, content_en, content_kn, sort_order, updated_at')
    .eq('status', 'active')
    .order('category', { ascending: true })
    .order('sort_order', { ascending: true, nullsFirst: false });

  if (error) {
    // The PostgREST message can name the table, the column and the constraint
    // ("column lessons.sort_order does not exist", a relation name, a schema
    // hint). Embedding it in the ApiError message shipped all of that to every
    // caller, because `errorResponse` returns `ApiError.message` verbatim and
    // this route is PUBLIC. That was the only place in the codebase that did so.
    //
    // The machine-readable code IS retained, server-side, which is what makes the
    // failure diagnosable without exposing anything: PostgREST and Postgres both
    // give distinct codes (42P01 undefined_table, 42703 undefined_column, 42501
    // insufficient_privilege) that identify the fault precisely.
    console.error('[learning] failed to load lessons', { code: error.code });
    throw ErrorFactories.internal('Could not load lessons. Please try again later.');
  }

  if (!data) {
    return [];
  }

  return data.map((row: DbLesson) => {
    const contentEn = parseLessonContent(row.content_en);
    const contentKn = parseLessonContent(row.content_kn);
    return {
      id: row.id,
      category: row.category as LessonCategory,
      difficulty: (row.difficulty || 'beginner') as LessonDifficulty,
      status: (row.status || 'draft') as LessonStatus,
      title_en: row.title_en,
      title_kn: row.title_kn,
      summary_en: contentEn.concept || contentEn.explanation.slice(0, 120),
      summary_kn: contentKn.concept || contentKn.explanation.slice(0, 120),
      sort_order: row.sort_order ?? null,
      updated_at: row.updated_at,
    };
  });
}

/**
 * Loads module information with chapter counts.
 */
export async function loadModules(
  supabase: SupabaseClient<Database>
): Promise<ModuleInfo[]> {
  const lessons = await loadActiveLessons(supabase);
  const modules: ModuleInfo[] = [];

  for (const [category, def] of Object.entries(MODULE_DEFINITIONS) as [LessonCategory, Omit<ModuleInfo, 'chapterCount'>][]) {
    const chapterCount = lessons.filter((l) => l.category === category).length;
    modules.push({
      ...def,
      chapterCount,
    });
  }

  return modules;
}

/**
 * Loads a single active lesson by UUID and its associated quiz (with sanitized questions).
 */
export async function loadLessonDetail(
  supabase: SupabaseClient<Database>,
  lessonId: string
): Promise<LessonDetail | null> {
  const { data: lesson, error: lessonError } = await supabase
    .from('lessons')
    .select('*')
    .eq('id', lessonId)
    .eq('status', 'active')
    .single();

  if (lessonError || !lesson) {
    return null;
  }

  // Attempt to fetch attached quiz
  // Note: Anon users won't see quiz rows directly via client RLS, but if the quiz exists,
  // we attempt to fetch it or leave it null if unauthenticated/empty.
  let quizData: LessonDetail['quiz'] = null;

  const { data: quiz } = await supabase
    .from('quizzes')
    .select('id, lesson_id, questions_en, questions_kn')
    .eq('lesson_id', lessonId)
    .maybeSingle();

  if (quiz) {
    const serverQuestionsEn = parseServerQuestions(quiz.questions_en);
    const serverQuestionsKn = parseServerQuestions(quiz.questions_kn);
    quizData = {
      id: quiz.id,
      questions_en: sanitizeQuestionsForClient(serverQuestionsEn),
      questions_kn: sanitizeQuestionsForClient(serverQuestionsKn),
    };
  }

  return {
    id: lesson.id,
    category: lesson.category as LessonCategory,
    difficulty: (lesson.difficulty || 'beginner') as LessonDifficulty,
    status: (lesson.status || 'draft') as LessonStatus,
    title_en: lesson.title_en,
    title_kn: lesson.title_kn,
    content_en: parseLessonContent(lesson.content_en),
    content_kn: parseLessonContent(lesson.content_kn),
    sort_order: lesson.sort_order ?? null,
    quiz: quizData,
    updated_at: lesson.updated_at,
  };
}

/**
 * Loads chapter navigation (prev/next) for a given lesson within its module.
 */
export async function loadChapterNavigation(
  supabase: SupabaseClient<Database>,
  lessonId: string
): Promise<ChapterNavigation | null> {
  const { data: lesson, error } = await supabase
    .from('lessons')
    .select('id, category, sort_order')
    .eq('id', lessonId)
    .eq('status', 'active')
    .single();

  if (error || !lesson) {
    return null;
  }

  const { data: siblings, error: siblingsError } = await supabase
    .from('lessons')
    .select('id, sort_order')
    .eq('category', lesson.category)
    .eq('status', 'active')
    .order('sort_order', { ascending: true, nullsFirst: false });

  if (siblingsError || !siblings || siblings.length === 0) {
    return null;
  }

  const currentIndex = siblings.findIndex((s) => s.id === lessonId);
  if (currentIndex === -1) {
    return null;
  }

  const prevChapterId = currentIndex > 0 ? siblings[currentIndex - 1].id : null;
  const nextChapterId = currentIndex < siblings.length - 1 ? siblings[currentIndex + 1].id : null;

  return {
    prevChapterId,
    nextChapterId,
    currentIndex: currentIndex + 1,
    totalChapters: siblings.length,
  };
}

/**
 * Evaluates and scores a quiz submission for an authenticated user.
 */
export async function submitQuizAnswers(
  supabase: SupabaseClient<Database>,
  payload: QuizSubmissionPayload,
  isAuthenticated: boolean
): Promise<QuizSubmissionResult> {
  if (!isAuthenticated) {
    throw ErrorFactories.unauthorized('Authentication is required to submit quizzes.');
  }

  // Fetch the quiz containing authoritative server questions with correct answers
  const { data: quiz, error: quizError } = await supabase
    .from('quizzes')
    .select('id, lesson_id, questions_en, questions_kn')
    .eq('id', payload.quizId)
    .eq('lesson_id', payload.lessonId)
    .single();

  if (quizError || !quiz) {
    throw ErrorFactories.notFound('Quiz not found for this lesson.');
  }

  const rawQuestions = payload.lang === 'kn' ? quiz.questions_kn : quiz.questions_en;
  const serverQuestions = parseServerQuestions(rawQuestions);

  if (serverQuestions.length === 0) {
    throw ErrorFactories.badRequest('Quiz has no valid questions configured.');
  }

  return calculateQuizScore(serverQuestions, payload.answers, payload.lessonId, payload.quizId);
}
