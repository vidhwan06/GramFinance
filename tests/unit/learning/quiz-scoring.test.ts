import { describe, it, expect } from 'vitest';
import { calculateQuizScore } from '@/features/learning/learning-service';
import type { QuizQuestionServer } from '@/features/learning/types';

describe('Financial Learning - Pure Quiz Scoring Engine', () => {
  const sampleQuestions: QuizQuestionServer[] = [
    {
      id: 'q1',
      question: 'What is a Savings Account primary purpose?',
      options: ['Safe storage and liquidity', 'High risk gambling', 'Free shopping'],
      correctAnswerIndex: 0,
      explanation: 'Savings accounts provide a secure place to deposit funds with liquidity.',
    },
    {
      id: 'q2',
      question: 'Should you share your UPI PIN with anyone claiming to send you money?',
      options: ['Yes, always', 'No, never share UPI PIN to receive money', 'Only with friends'],
      correctAnswerIndex: 1,
      explanation: 'You only enter a UPI PIN to send money, never to receive money.',
    },
    {
      id: 'q3',
      question: 'What does a high interest moneylender loan do to your financial safety?',
      options: ['Reduces total debt', 'Increases debt trap risk', 'Guarantees wealth'],
      correctAnswerIndex: 1,
      explanation: 'Excessive interest rates create compound repayment stress.',
    },
  ];

  const lessonId = '11111111-1111-1111-1111-111111111111';
  const quizId = '22222222-2222-2222-2222-222222222222';

  it('calculates 100% score when all submitted answers are correct', () => {
    const userAnswers = [
      { questionId: 'q1', selectedIndex: 0 },
      { questionId: 'q2', selectedIndex: 1 },
      { questionId: 'q3', selectedIndex: 1 },
    ];

    const result = calculateQuizScore(sampleQuestions, userAnswers, lessonId, quizId);

    expect(result.lessonId).toBe(lessonId);
    expect(result.quizId).toBe(quizId);
    expect(result.score).toBe(3);
    expect(result.totalQuestions).toBe(3);
    expect(result.percentage).toBe(100);
    expect(result.passed).toBe(true);
    expect(result.answers).toHaveLength(3);

    expect(result.answers[0].isCorrect).toBe(true);
    expect(result.answers[0].selectedIndex).toBe(0);
    expect(result.answers[0].correctAnswerIndex).toBe(0);
    expect(result.answers[0].explanation).toBe(sampleQuestions[0].explanation);
  });

  it('calculates 0% score when all submitted answers are incorrect', () => {
    const userAnswers = [
      { questionId: 'q1', selectedIndex: 2 },
      { questionId: 'q2', selectedIndex: 0 },
      { questionId: 'q3', selectedIndex: 0 },
    ];

    const result = calculateQuizScore(sampleQuestions, userAnswers, lessonId, quizId);

    expect(result.score).toBe(0);
    expect(result.percentage).toBe(0);
    expect(result.passed).toBe(false);
    expect(result.answers.every((a) => !a.isCorrect)).toBe(true);
  });

  it('evaluates partial score correctly and enforces 60% threshold for passing', () => {
    // 2 out of 3 = 67% -> passed
    const passingAnswers = [
      { questionId: 'q1', selectedIndex: 0 },
      { questionId: 'q2', selectedIndex: 1 },
      { questionId: 'q3', selectedIndex: 0 }, // wrong
    ];

    const passResult = calculateQuizScore(sampleQuestions, passingAnswers, lessonId, quizId);
    expect(passResult.score).toBe(2);
    expect(passResult.totalQuestions).toBe(3);
    expect(passResult.percentage).toBe(67);
    expect(passResult.passed).toBe(true);

    // 1 out of 3 = 33% -> failed
    const failingAnswers = [
      { questionId: 'q1', selectedIndex: 0 },
      { questionId: 'q2', selectedIndex: 0 }, // wrong
      { questionId: 'q3', selectedIndex: 0 }, // wrong
    ];

    const failResult = calculateQuizScore(sampleQuestions, failingAnswers, lessonId, quizId);
    expect(failResult.score).toBe(1);
    expect(failResult.percentage).toBe(33);
    expect(failResult.passed).toBe(false);
  });

  it('handles missing/unanswered questions by treating them as -1 and incorrect', () => {
    // Only answer question 2
    const partialAnswers = [{ questionId: 'q2', selectedIndex: 1 }];

    const result = calculateQuizScore(sampleQuestions, partialAnswers, lessonId, quizId);

    expect(result.score).toBe(1);
    expect(result.totalQuestions).toBe(3);
    expect(result.percentage).toBe(33);

    const q1Result = result.answers.find((a) => a.questionId === 'q1');
    expect(q1Result).toBeDefined();
    expect(q1Result?.selectedIndex).toBe(-1);
    expect(q1Result?.isCorrect).toBe(false);
  });

  it('handles empty questions list gracefully without division by zero', () => {
    const result = calculateQuizScore([], [], lessonId, quizId);
    expect(result.score).toBe(0);
    expect(result.totalQuestions).toBe(0);
    expect(result.percentage).toBe(0);
    expect(result.passed).toBe(false);
    expect(result.answers).toEqual([]);
  });

  it('correctly matches answers regardless of submission order', () => {
    // Answers provided in reverse order
    const reverseAnswers = [
      { questionId: 'q3', selectedIndex: 1 },
      { questionId: 'q1', selectedIndex: 0 },
      { questionId: 'q2', selectedIndex: 1 },
    ];

    const result = calculateQuizScore(sampleQuestions, reverseAnswers, lessonId, quizId);
    expect(result.score).toBe(3);
    expect(result.percentage).toBe(100);
    expect(result.passed).toBe(true);
  });
});
