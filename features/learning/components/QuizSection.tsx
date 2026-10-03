'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { CheckCircle2, XCircle, Award, HelpCircle, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import type { LessonDetail, QuizSubmissionResult } from '../types';

interface QuizSectionProps {
  lesson: LessonDetail;
}

export function QuizSection({ lesson }: QuizSectionProps) {
  const { language, t } = useLanguage();
  const isKn = language === 'kn';

  const quiz = lesson.quiz;
  const questions = quiz ? (isKn ? quiz.questions_kn : quiz.questions_en) : [];

  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submissionResult, setSubmissionResult] = useState<QuizSubmissionResult | null>(null);

  if (!quiz || questions.length === 0) {
    return null;
  }

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    if (submissionResult) return; // Locked after submission
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  const handleResetQuiz = () => {
    setSelectedAnswers({});
    setSubmissionResult(null);
    setAuthError(false);
    setGeneralError(null);
  };

  const handleSubmit = async () => {
    if (!quiz) return;
    setSubmitting(true);
    setAuthError(false);
    setGeneralError(null);

    const formattedAnswers = questions.map((q) => ({
      questionId: q.id,
      selectedIndex: selectedAnswers[q.id] ?? -1,
    }));

    try {
      const response = await fetch('/api/learning/quiz/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lessonId: lesson.id,
          quizId: quiz.id,
          lang: isKn ? 'kn' : 'en',
          answers: formattedAnswers,
        }),
      });

      const data = await response.json();

      if (response.status === 401) {
        setAuthError(true);
        return;
      }

      if (!response.ok || !data.success) {
        setGeneralError(data.error?.message || t.learning.quizSubmitFailed);
        return;
      }

      setSubmissionResult(data.data as QuizSubmissionResult);
    } catch {
      setGeneralError(t.learning.quizNetworkError);
    } finally {
      setSubmitting(false);
    }
  };

  const allAnswered = questions.every((q) => selectedAnswers[q.id] !== undefined);

  return (
    <Card className="border-2 border-indigo-200 bg-indigo-50/20">
      <CardHeader className="border-b border-indigo-100 pb-4">
        <div className="flex items-center gap-2 text-indigo-700">
          <HelpCircle className="w-6 h-6" />
          <CardTitle className="text-xl text-indigo-950">
            {t.learning.quizTitle}
          </CardTitle>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          {t.learning.quizSubtitle}
        </p>
      </CardHeader>

      <CardContent className="space-y-6 pt-6">
        {/* Auth Error Banner */}
        {authError && (
          <Alert variant="warning" title={t.learning.quizAuthRequired}>
            {t.learning.quizLoginRequired}
          </Alert>
        )}

        {/* General Error Banner */}
        {generalError && (
          <Alert variant="danger" title={t.learning.quizErrorTitle}>
            {generalError}
          </Alert>
        )}

        {/* Result Summary Banner (if submitted) */}
        {submissionResult && (
          <div
            className={`p-5 rounded-xl border-2 ${
              submissionResult.passed
                ? 'bg-emerald-50 border-emerald-400 text-emerald-950'
                : 'bg-amber-50 border-amber-400 text-amber-950'
            }`}
          >
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={`p-3 rounded-full ${
                    submissionResult.passed ? 'bg-emerald-200' : 'bg-amber-200'
                  }`}
                >
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">
                    {submissionResult.passed
                      ? t.learning.passedTitle
                      : t.learning.failedTitle}
                  </h3>
                  <p className="text-sm">
                    {t.learning.scoreTitle}:{' '}
                    <span className="font-bold">
                      {submissionResult.score} / {submissionResult.totalQuestions}
                    </span>{' '}
                    ({submissionResult.percentage}%)
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetQuiz}
                className="flex items-center gap-1.5"
              >
                <RefreshCw className="w-4 h-4" />
                {t.learning.retakeQuiz}
              </Button>
            </div>
          </div>
        )}

        {/* Questions List */}
        <div className="space-y-6">
          {questions.map((q, idx) => {
            const evaluated = submissionResult?.answers.find(
              (a) => a.questionId === q.id
            );
            const userSelected = selectedAnswers[q.id];

            return (
              <div
                key={q.id}
                className="p-4 rounded-xl border border-gray-200 bg-white space-y-3 shadow-sm"
              >
                <div className="flex items-start gap-2">
                  <span className="font-bold text-gray-500 text-sm">
                    {idx + 1}.
                  </span>
                  <p className="font-semibold text-gray-900 text-base">
                    {q.question}
                  </p>
                </div>

                <div className="space-y-2 pl-5">
                  {q.options.map((opt, optIdx) => {
                    const isSelected = userSelected === optIdx;
                    let optionStyle =
                      'border-gray-200 hover:bg-gray-50 text-gray-800';

                    if (submissionResult && evaluated) {
                      if (optIdx === evaluated.correctAnswerIndex) {
                        optionStyle =
                          'border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold';
                      } else if (isSelected && !evaluated.isCorrect) {
                        optionStyle =
                          'border-red-400 bg-red-50 text-red-900 line-through';
                      }
                    } else if (isSelected) {
                      optionStyle =
                        'border-indigo-600 bg-indigo-50 text-indigo-900 font-semibold ring-1 ring-indigo-600';
                    }

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => handleSelectOption(q.id, optIdx)}
                        disabled={!!submissionResult || submitting}
                        className={`w-full text-left p-3 rounded-lg border text-sm transition-all flex items-center justify-between ${optionStyle}`}
                      >
                        <span>{opt}</span>
                        {submissionResult &&
                          optIdx === evaluated?.correctAnswerIndex && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />
                          )}
                        {submissionResult &&
                          isSelected &&
                          !evaluated?.isCorrect && (
                            <XCircle className="w-4 h-4 text-red-500 shrink-0 ml-2" />
                          )}
                      </button>
                    );
                  })}
                </div>

                {/* Explanation shown after scoring */}
                {evaluated && (
                  <div className="mt-3 p-3 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-700 space-y-1">
                    <span className="font-bold text-gray-900">
                      {t.learning.explanationTitle}
                    </span>{' '}
                    {evaluated.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Submit Action */}
        {!submissionResult && (
          <div className="flex justify-end pt-2">
            <Button
              variant="primary"
              size="lg"
              disabled={submitting || !allAnswered}
              onClick={handleSubmit}
            >
              {submitting ? t.learning.submittingQuiz : t.learning.submitQuiz}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
