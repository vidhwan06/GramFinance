'use client';

import React, { useState } from 'react';
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
    <section
      id="lesson-quiz"
      aria-labelledby="lesson-quiz-heading"
      className="scroll-mt-24 rounded-xl border border-rule bg-white p-4 shadow-sm sm:p-5"
    >
      <div className="mb-4 flex items-start gap-2.5">
        <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-aubergine" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-widest text-aubergine">
            {t.learning.eyebrowRemember}
          </p>
          <h2 id="lesson-quiz-heading" className="text-lg font-bold leading-snug text-ink sm:text-xl">
            {t.learning.quizConclusionTitle}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-ink">
            {t.learning.quizConclusionSubtitle}
          </p>
        </div>
      </div>

      <div className="space-y-5">
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

        {/* Result Summary (if submitted) */}
        {submissionResult && (
          <div
            role="status"
            aria-live="polite"
            className={`rounded-lg border-l-4 p-4 ${
              submissionResult.passed
                ? 'border-deep-teal bg-deep-teal/5'
                : 'border-warning-600 bg-warning-50'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                    submissionResult.passed ? 'bg-deep-teal' : 'bg-warning-600'
                  } text-warm-ivory`}
                  aria-hidden="true"
                >
                  <Award className="w-5 h-5" />
                </span>
                <div>
                  <p className="text-base font-bold text-ink">
                    {submissionResult.passed
                      ? t.learning.passedTitle
                      : t.learning.failedTitle}
                  </p>
                  <p className="text-sm text-muted-ink">
                    {t.learning.scoreTitle}:{' '}
                    <span className="font-bold text-ink">
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
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
                {t.learning.retakeQuiz}
              </Button>
            </div>
          </div>
        )}

        {/* Questions List */}
        <ol className="space-y-4">
          {questions.map((q, idx) => {
            const evaluated = submissionResult?.answers.find(
              (a) => a.questionId === q.id
            );
            const userSelected = selectedAnswers[q.id];

            return (
              <li
                key={q.id}
                className="rounded-lg border border-rule bg-surface-container-lowest p-4"
              >
                <div className="mb-3 flex items-start gap-2.5">
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-aubergine text-sm font-bold text-warm-ivory"
                    aria-hidden="true"
                  >
                    {idx + 1}
                  </span>
                  <p className="font-semibold text-base leading-7 text-ink">{q.question}</p>
                </div>

                <div className="space-y-2 sm:pl-9">
                  {q.options.map((opt, optIdx) => {
                    const isSelected = userSelected === optIdx;
                    const isAnswerKey =
                      !!submissionResult && optIdx === evaluated?.correctAnswerIndex;
                    const isWrongPick =
                      !!submissionResult && isSelected && !evaluated?.isCorrect;

                    let optionStyle =
                      'border-rule bg-white text-ink hover:bg-surface-container-low';
                    let statusText: string | null = null;

                    if (submissionResult && evaluated) {
                      if (isAnswerKey) {
                        optionStyle = 'border-deep-teal bg-deep-teal/10 text-ink font-semibold';
                        statusText = t.learning.correct;
                      } else if (isWrongPick) {
                        optionStyle = 'border-coral bg-coral/10 text-ink font-semibold';
                        statusText = t.learning.incorrect;
                      } else {
                        optionStyle = 'border-rule bg-white text-muted-ink';
                      }
                    } else if (isSelected) {
                      optionStyle =
                        'border-aubergine bg-aubergine/5 text-ink font-semibold ring-1 ring-aubergine';
                    }

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => handleSelectOption(q.id, optIdx)}
                        disabled={!!submissionResult || submitting}
                        aria-pressed={isSelected}
                        className={`flex min-h-[48px] w-full items-center justify-between gap-2 rounded-lg border p-3 text-left text-base leading-6 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-teal focus-visible:ring-offset-2 disabled:opacity-100 motion-reduce:transition-none ${optionStyle}`}
                      >
                        <span>{opt}</span>
                        <span className="flex shrink-0 items-center gap-1.5">
                          {statusText && (
                            <span className="text-xs font-bold uppercase tracking-wide">
                              {statusText}
                            </span>
                          )}
                          {isAnswerKey && (
                            <CheckCircle2 className="h-5 w-5 text-deep-teal" aria-hidden="true" />
                          )}
                          {isWrongPick && (
                            <XCircle className="h-5 w-5 text-coral" aria-hidden="true" />
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Explanation shown after scoring */}
                {evaluated && (
                  <div className="mt-3 rounded-lg border-l-2 border-rule bg-surface-container-low p-3 sm:ml-9">
                    <p className="text-sm font-bold text-ink">
                      {t.learning.explanationTitle}
                    </p>
                    <p className="mt-0.5 text-sm leading-6 text-muted-ink">
                      {evaluated.explanation}
                    </p>
                  </div>
                )}
              </li>
            );
          })}
        </ol>

        {/* Submit Action */}
        {!submissionResult && (
          <div className="flex justify-end pt-1">
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
      </div>
    </section>
  );
}
