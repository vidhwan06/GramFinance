import { z } from 'zod';

export const lessonCategorySchema = z.enum([
  'banking',
  'saving',
  'borrowing',
  'insurance',
  'digital-payments',
  'fraud-awareness',
]);

export const lessonStatusSchema = z.enum(['draft', 'active', 'archived']);

export const lessonDifficultySchema = z.enum(['beginner', 'intermediate', 'advanced']);

export const lessonContentSchema = z
  .object({
    concept: z.string().min(1, 'Concept is required'),
    whyItMatters: z.string().min(1).optional(),
    explanation: z.string().min(1, 'Explanation is required'),
    steps: z.array(z.string().min(1)).optional(),
    example: z.string().min(1, 'Example is required'),
    visual: z.string().min(1, 'Visual representation is required'),
    commonMistakes: z.union([z.array(z.string().min(1)), z.string().min(1)]),
    practicalTakeaway: z.union([z.array(z.string().min(1)), z.string().min(1)]),
    quickRecap: z.array(z.string().min(1)).optional(),
  })
  .strict();

export const quizQuestionServerSchema = z
  .object({
    id: z.string().min(1),
    question: z.string().min(1),
    options: z.array(z.string().min(1)).min(2, 'At least 2 options required'),
    correctAnswerIndex: z.number().int().min(0),
    explanation: z.string().min(1),
  })
  .strict();

export const quizSubmissionAnswerSchema = z
  .object({
    questionId: z.string().min(1, 'questionId is required'),
    selectedIndex: z.number().int().min(0, 'selectedIndex must be non-negative'),
  })
  .strict();

export const quizSubmissionRequestSchema = z
  .object({
    lessonId: z.string().uuid('Invalid lessonId UUID'),
    quizId: z.string().uuid('Invalid quizId UUID'),
    lang: z.enum(['en', 'kn']).default('en'),
    answers: z.array(quizSubmissionAnswerSchema).min(1, 'At least one answer must be submitted'),
  })
  .strict();

export type QuizSubmissionPayload = z.infer<typeof quizSubmissionRequestSchema>;
