import { describe, it, expect, vi } from 'vitest';
import {
  sanitizeQuestionsForClient,
  parseLessonContent,
  parseServerQuestions,
  loadActiveLessons,
  loadLessonDetail,
  submitQuizAnswers,
} from '@/features/learning/learning-service';
import type { QuizQuestionServer } from '@/features/learning/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

describe('Financial Learning - Learning Service', () => {
  describe('Sanitization and Parsing helpers', () => {
    it('sanitizeQuestionsForClient removes correctAnswerIndex and explanation', () => {
      const serverQuestions: QuizQuestionServer[] = [
        {
          id: 'q1',
          question: 'What is a Bank?',
          options: ['Safe institution', 'Fraud entity'],
          correctAnswerIndex: 0,
          explanation: 'Banks are regulated financial institutions.',
        },
      ];

      const clientQuestions = sanitizeQuestionsForClient(serverQuestions);
      expect(clientQuestions).toEqual([
        {
          id: 'q1',
          question: 'What is a Bank?',
          options: ['Safe institution', 'Fraud entity'],
        },
      ]);
      expect((clientQuestions[0] as unknown as { correctAnswerIndex?: number }).correctAnswerIndex).toBeUndefined();
      expect((clientQuestions[0] as unknown as { explanation?: string }).explanation).toBeUndefined();
    });

    it('parseLessonContent extracts fields cleanly from valid and fallback data', () => {
      const valid = {
        concept: 'Concept 1',
        explanation: 'Explanation 1',
        example: 'Example 1',
        visual: 'Visual 1',
        commonMistakes: 'Mistakes 1',
        practicalTakeaway: 'Takeaway 1',
      };
      expect(parseLessonContent(valid)).toEqual(valid);

      const fallback = parseLessonContent({ concept: 'Only Concept' });
      expect(fallback.concept).toBe('Only Concept');
      expect(fallback.explanation).toBe('');
      expect(fallback.commonMistakes).toBe('');
    });

    it('parseServerQuestions filters out invalid question objects', () => {
      const mixed = [
        {
          id: 'q1',
          question: 'Valid Question',
          options: ['A', 'B'],
          correctAnswerIndex: 1,
          explanation: 'Exp',
        },
        {
          id: 'q2',
          // missing options
          correctAnswerIndex: 0,
        },
      ];
      const parsed = parseServerQuestions(mixed);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].id).toBe('q1');
    });
  });

  describe('Database Operations', () => {
    it('loadActiveLessons queries active lessons with deterministic sorting', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockImplementation((col: string) => {
        if (col === 'sort_order') {
          return Promise.resolve({
            data: [
              {
                id: '1',
                category: 'banking',
                difficulty: 'beginner',
                status: 'active',
                title_en: 'Bank Accounts',
                title_kn: 'ಬ್ಯಾಂಕ್ ಖಾತೆಗಳು',
                content_en: { concept: 'Safe deposits' },
                content_kn: { concept: 'ಸುರಕ್ಷಿತ ಠೇವಣಿ' },
                sort_order: 1,
                updated_at: '2026-01-01T00:00:00Z',
              },
            ],
            error: null,
          });
        }
        return { order: mockOrder };
      });

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: mockSelect,
          eq: mockEq,
          order: mockOrder,
        }),
      } as unknown as SupabaseClient<Database>;

      const lessons = await loadActiveLessons(mockSupabase);

      expect(mockSupabase.from).toHaveBeenCalledWith('lessons');
      expect(mockEq).toHaveBeenCalledWith('status', 'active');
      expect(mockOrder).toHaveBeenCalledWith('category', { ascending: true });
      expect(lessons).toHaveLength(1);
      expect(lessons[0].title_en).toBe('Bank Accounts');
      expect(lessons[0].summary_en).toBe('Safe deposits');
    });

    it('loadLessonDetail returns sanitized lesson detail and quiz', async () => {
      const lessonRow = {
        id: 'lesson-1',
        category: 'saving',
        difficulty: 'beginner',
        status: 'active',
        title_en: 'Emergency Fund',
        title_kn: 'ತುರ್ತು ನಿಧಿ',
        content_en: {
          concept: 'Save 3 months expenses',
          explanation: 'Protect against sudden shocks',
          example: 'Medical emergency',
          visual: 'Jar of money',
          practicalTakeaway: 'Start with small recurring deposits',
        },
        content_kn: {
          concept: '3 ತಿಂಗಳ ವೆಚ್ಚ ಉಳಿಸಿ',
          explanation: 'ಆಕಸ್ಮಿಕ ವೆಚ್ಚ ರಕ್ಷಣೆ',
          example: 'ಆರೋಗ್ಯ ತುರ್ತು',
          visual: 'ಹಣದ ಪಾತ್ರೆ',
          practicalTakeaway: 'ಸಣ್ಣ ಮೊತ್ತದಿಂದ ಉಳಿತಾಯ ಆರಂಭಿಸಿ',
        },
        updated_at: '2026-01-01T00:00:00Z',
      };

      const quizRow = {
        id: 'quiz-1',
        lesson_id: 'lesson-1',
        questions_en: [
          {
            id: 'q1',
            question: 'How much to save?',
            options: ['3-6 months', '0 months'],
            correctAnswerIndex: 0,
            explanation: 'Rule of thumb',
          },
        ],
        questions_kn: [
          {
            id: 'q1',
            question: 'ಎಷ್ಟು ಉಳಿಸಬೇಕು?',
            options: ['3-6 ತಿಂಗಳು', '0 ತಿಂಗಳು'],
            correctAnswerIndex: 0,
            explanation: 'ನಿಯಮ',
          },
        ],
      };

      const mockSupabase = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'lessons') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: lessonRow, error: null }),
            };
          }
          if (table === 'quizzes') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: quizRow, error: null }),
            };
          }
          return {};
        }),
      } as unknown as SupabaseClient<Database>;

      const detail = await loadLessonDetail(mockSupabase, 'lesson-1');
      expect(detail).toBeDefined();
      expect(detail?.title_en).toBe('Emergency Fund');
      expect(detail?.quiz).toBeDefined();
      expect(detail?.quiz?.questions_en[0].question).toBe('How much to save?');
      // Verify correct answer is NOT present
      expect((detail?.quiz?.questions_en[0] as unknown as { correctAnswerIndex?: number }).correctAnswerIndex).toBeUndefined();
    });

    it('submitQuizAnswers rejects unauthenticated callers with 401', async () => {
      const mockSupabase = {} as SupabaseClient<Database>;
      const payload = {
        lessonId: '11111111-1111-1111-1111-111111111111',
        quizId: '22222222-2222-2222-2222-222222222222',
        lang: 'en' as const,
        answers: [{ questionId: 'q1', selectedIndex: 0 }],
      };

      await expect(submitQuizAnswers(mockSupabase, payload, false)).rejects.toMatchObject({
        statusCode: 401,
        code: 'UNAUTHORIZED',
      });
    });

    it('submitQuizAnswers scores authenticated submission against server answers', async () => {
      const quizRow = {
        id: '22222222-2222-2222-2222-222222222222',
        lesson_id: '11111111-1111-1111-1111-111111111111',
        questions_en: [
          {
            id: 'q1',
            question: 'What is OTP?',
            options: ['One Time Password', 'Public Token'],
            correctAnswerIndex: 0,
            explanation: 'OTP is one time authentication code.',
          },
        ],
        questions_kn: [],
      };

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: quizRow, error: null }),
        }),
      } as unknown as SupabaseClient<Database>;

      const payload = {
        lessonId: '11111111-1111-1111-1111-111111111111',
        quizId: '22222222-2222-2222-2222-222222222222',
        lang: 'en' as const,
        answers: [{ questionId: 'q1', selectedIndex: 0 }],
      };

      const result = await submitQuizAnswers(mockSupabase, payload, true);
      expect(result.score).toBe(1);
      expect(result.percentage).toBe(100);
      expect(result.passed).toBe(true);
      expect(result.answers[0].isCorrect).toBe(true);
      expect(result.answers[0].explanation).toBe('OTP is one time authentication code.');
    });
  });
});
