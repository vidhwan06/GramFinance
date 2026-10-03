export type LessonCategory =
  | 'banking'
  | 'saving'
  | 'borrowing'
  | 'insurance'
  | 'digital-payments'
  | 'fraud-awareness';

export type LessonStatus = 'draft' | 'active' | 'archived';

export type LessonDifficulty = 'beginner' | 'intermediate' | 'advanced';

export type LessonContent = {
  concept: string;
  whyItMatters?: string;
  explanation: string;
  steps?: string[];
  example: string;
  visual: string;
  commonMistakes: string[] | string;
  practicalTakeaway: string[] | string;
  quickRecap?: string[];
};

export type QuizQuestionServer = {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
};

export type QuizQuestionClient = {
  id: string;
  question: string;
  options: string[];
};

export type QuizQuestionResult = {
  questionId: string;
  question: string;
  options: string[];
  selectedIndex: number;
  correctAnswerIndex: number;
  isCorrect: boolean;
  explanation: string;
};

export type QuizSubmissionResult = {
  lessonId: string;
  quizId: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  passed: boolean;
  answers: QuizQuestionResult[];
};

export type LessonDetail = {
  id: string;
  category: LessonCategory;
  difficulty: LessonDifficulty;
  status: LessonStatus;
  title_en: string;
  title_kn: string;
  content_en: LessonContent;
  content_kn: LessonContent;
  sort_order: number | null;
  quiz?: {
    id: string;
    questions_en: QuizQuestionClient[];
    questions_kn: QuizQuestionClient[];
  } | null;
  updated_at: string;
};

export type LessonSummary = {
  id: string;
  category: LessonCategory;
  difficulty: LessonDifficulty;
  status: LessonStatus;
  title_en: string;
  title_kn: string;
  summary_en: string;
  summary_kn: string;
  sort_order: number | null;
  updated_at: string;
};

export type ModuleInfo = {
  category: LessonCategory;
  title_en: string;
  title_kn: string;
  description_en: string;
  description_kn: string;
  chapterCount: number;
};

export type ChapterNavigation = {
  prevChapterId: string | null;
  nextChapterId: string | null;
  currentIndex: number;
  totalChapters: number;
};
