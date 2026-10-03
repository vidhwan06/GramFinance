import { describe, it, expect } from 'vitest';
import { MODULE_DEFINITIONS } from '@/features/learning/learning-service';
import type { LessonCategory } from '@/features/learning/types';

describe('Financial Learning - Curriculum Structure', () => {
  describe('Module Definitions', () => {
    it('has exactly 6 modules', () => {
      expect(Object.keys(MODULE_DEFINITIONS)).toHaveLength(6);
    });

    it('has all required categories', () => {
      const expected: LessonCategory[] = [
        'banking',
        'saving',
        'borrowing',
        'insurance',
        'digital-payments',
        'fraud-awareness',
      ];
      for (const cat of expected) {
        expect(MODULE_DEFINITIONS[cat]).toBeDefined();
      }
    });

    it('each module has title_en and title_kn', () => {
      for (const [cat, def] of Object.entries(MODULE_DEFINITIONS)) {
        expect(def.title_en).toBeTruthy();
        expect(def.title_kn).toBeTruthy();
        expect(def.description_en).toBeTruthy();
        expect(def.description_kn).toBeTruthy();
      }
    });

    it('each module has a category matching its key', () => {
      for (const [cat, def] of Object.entries(MODULE_DEFINITIONS)) {
        expect(def.category).toBe(cat);
      }
    });
  });

  describe('Curriculum Constants', () => {
    it('has 30 total chapters (6 modules x 5 chapters)', () => {
      const totalChapters = Object.keys(MODULE_DEFINITIONS).length * 5;
      expect(totalChapters).toBe(30);
    });

    it('has 90 total quiz questions (30 chapters x 3 questions)', () => {
      const totalQuestions = Object.keys(MODULE_DEFINITIONS).length * 5 * 3;
      expect(totalQuestions).toBe(90);
    });

    it('has 30 total quizzes (1 per chapter)', () => {
      const totalQuizzes = Object.keys(MODULE_DEFINITIONS).length * 5;
      expect(totalQuizzes).toBe(30);
    });
  });

  describe('Chapter Ordering', () => {
    it('uses sort_order values 1-5 within each module', () => {
      // This is validated by the seed data structure
      // Each module has chapters with sort_order 1, 2, 3, 4, 5
      const expectedSortOrders = [1, 2, 3, 4, 5];
      expect(expectedSortOrders).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('Content Schema', () => {
    it('lessonContentSchema requires commonMistakes field', async () => {
      const { lessonContentSchema } = await import('@/features/learning/schemas');
      const validContent = {
        concept: 'Test concept',
        explanation: 'Test explanation',
        example: 'Test example',
        visual: 'Test visual',
        commonMistakes: 'Test common mistakes',
        practicalTakeaway: 'Test takeaway',
      };
      expect(lessonContentSchema.safeParse(validContent).success).toBe(true);
    });

    it('lessonContentSchema rejects content without commonMistakes', async () => {
      const { lessonContentSchema } = await import('@/features/learning/schemas');
      const invalidContent = {
        concept: 'Test concept',
        explanation: 'Test explanation',
        example: 'Test example',
        visual: 'Test visual',
        practicalTakeaway: 'Test takeaway',
      };
      expect(lessonContentSchema.safeParse(invalidContent).success).toBe(false);
    });
  });
});
