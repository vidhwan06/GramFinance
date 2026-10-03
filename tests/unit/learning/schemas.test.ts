import { describe, it, expect } from 'vitest';
import {
  lessonCategorySchema,
  lessonStatusSchema,
  lessonDifficultySchema,
  lessonContentSchema,
  quizQuestionServerSchema,
  quizSubmissionRequestSchema,
} from '@/features/learning/schemas';

describe('Financial Learning - Zod Validation Schemas', () => {
  describe('lessonCategorySchema', () => {
    it('accepts valid categories', () => {
      const valid = [
        'banking',
        'saving',
        'borrowing',
        'insurance',
        'digital-payments',
        'fraud-awareness',
      ];
      valid.forEach((cat) => {
        expect(lessonCategorySchema.safeParse(cat).success).toBe(true);
      });
    });

    it('rejects invalid categories', () => {
      expect(lessonCategorySchema.safeParse('crypto').success).toBe(false);
      expect(lessonCategorySchema.safeParse('').success).toBe(false);
    });
  });

  describe('lessonStatusSchema & lessonDifficultySchema', () => {
    it('validates status and difficulty enums', () => {
      expect(lessonStatusSchema.safeParse('active').success).toBe(true);
      expect(lessonStatusSchema.safeParse('draft').success).toBe(true);
      expect(lessonStatusSchema.safeParse('archived').success).toBe(true);
      expect(lessonStatusSchema.safeParse('published').success).toBe(false);

      expect(lessonDifficultySchema.safeParse('beginner').success).toBe(true);
      expect(lessonDifficultySchema.safeParse('intermediate').success).toBe(true);
      expect(lessonDifficultySchema.safeParse('advanced').success).toBe(true);
      expect(lessonDifficultySchema.safeParse('expert').success).toBe(false);
    });
  });

  describe('lessonContentSchema', () => {
    it('validates complete educational lesson content structure', () => {
      const validContent = {
        concept: 'Understanding interest on loans',
        explanation: 'Interest is the cost charged by a lender for borrowing money.',
        example: 'Borrowing ₹10,000 at 10% per year requires paying ₹1,000 extra as interest.',
        visual: 'Visual breakdown showing principal box + interest box = total repayment.',
        commonMistakes: 'Not comparing interest rates before taking a loan.',
        practicalTakeaway: 'Always verify annual interest rate before signing any loan document.',
      };

      const parsed = lessonContentSchema.safeParse(validContent);
      expect(parsed.success).toBe(true);
    });

    it('rejects missing or empty fields and unknown extra keys', () => {
      const incomplete = {
        concept: 'Savings',
        explanation: 'Keep money safe',
        // missing example, visual, commonMistakes, practicalTakeaway
      };
      expect(lessonContentSchema.safeParse(incomplete).success).toBe(false);

      const withExtra = {
        concept: 'Savings',
        explanation: 'Explanation',
        example: 'Example',
        visual: 'Visual',
        commonMistakes: 'Common mistakes',
        practicalTakeaway: 'Takeaway',
        extraKey: 'forbidden',
      };
      expect(lessonContentSchema.safeParse(withExtra).success).toBe(false);
    });
  });

  describe('quizQuestionServerSchema', () => {
    it('validates server quiz question structure', () => {
      const validQuestion = {
        id: 'q-101',
        question: 'What is OTP used for?',
        options: ['One-time authentication', 'Public password', 'Sharing on phone calls'],
        correctAnswerIndex: 0,
        explanation: 'OTP confirms your identity for a single transaction.',
      };
      const parsed = quizQuestionServerSchema.safeParse(validQuestion);
      expect(parsed.success).toBe(true);
    });

    it('rejects question with fewer than 2 options', () => {
      const invalid = {
        id: 'q-101',
        question: 'What is OTP?',
        options: ['Only one option'],
        correctAnswerIndex: 0,
        explanation: 'Explain',
      };
      expect(quizQuestionServerSchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe('quizSubmissionRequestSchema', () => {
    const validUuid1 = '123e4567-e89b-12d3-a456-426614174000';
    const validUuid2 = '987fcdeb-51a2-43f7-9abc-def012345678';

    it('validates a valid submission payload', () => {
      const payload = {
        lessonId: validUuid1,
        quizId: validUuid2,
        lang: 'kn',
        answers: [
          { questionId: 'q1', selectedIndex: 0 },
          { questionId: 'q2', selectedIndex: 2 },
        ],
      };
      const parsed = quizSubmissionRequestSchema.safeParse(payload);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.lang).toBe('kn');
      }
    });

    it('defaults lang to en when not provided', () => {
      const payload = {
        lessonId: validUuid1,
        quizId: validUuid2,
        answers: [{ questionId: 'q1', selectedIndex: 1 }],
      };
      const parsed = quizSubmissionRequestSchema.safeParse(payload);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.lang).toBe('en');
      }
    });

    it('rejects non-UUID identifiers', () => {
      const invalidPayload = {
        lessonId: 'not-a-uuid',
        quizId: validUuid2,
        answers: [{ questionId: 'q1', selectedIndex: 0 }],
      };
      expect(quizSubmissionRequestSchema.safeParse(invalidPayload).success).toBe(false);
    });

    it('rejects empty answers array', () => {
      const invalidPayload = {
        lessonId: validUuid1,
        quizId: validUuid2,
        answers: [],
      };
      expect(quizSubmissionRequestSchema.safeParse(invalidPayload).success).toBe(false);
    });

    it('rejects negative selectedIndex', () => {
      const invalidPayload = {
        lessonId: validUuid1,
        quizId: validUuid2,
        answers: [{ questionId: 'q1', selectedIndex: -1 }],
      };
      expect(quizSubmissionRequestSchema.safeParse(invalidPayload).success).toBe(false);
    });
  });
});
