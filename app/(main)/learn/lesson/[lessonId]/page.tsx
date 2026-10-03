'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { LessonReader } from '@/features/learning/components/LessonReader';
import { QuizSection } from '@/features/learning/components/QuizSection';
import { LessonNavigation } from '@/features/learning/components/LessonNavigation';
import type { ChapterNavigation, LessonDetail } from '@/features/learning/types';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { ArrowLeft } from 'lucide-react';

/**
 * Sections of a lesson, in the order the reader renders them.
 *
 * This is the answer to "very long scrolling": a compact in-page jump list, so
 * a learner who wants one part does not have to scroll past eight others to find
 * it. The `href` targets and the `id`s in `LessonReader` / `QuizSection` are
 * listed here once so the two cannot drift apart silently — a test asserts every
 * target exists.
 */
const LESSON_SECTIONS = [
  { id: 'lesson-concept', labelKey: 'concept' },
  { id: 'lesson-why', labelKey: 'whyItMatters' },
  { id: 'lesson-flow', labelKey: 'visual' },
  { id: 'lesson-mistakes', labelKey: 'commonMistakes' },
  { id: 'lesson-steps', labelKey: 'stepByStep' },
  { id: 'lesson-detail', labelKey: 'explanation' },
  { id: 'lesson-scenarios', labelKey: 'example' },
  { id: 'lesson-takeaway', labelKey: 'takeaway' },
  { id: 'lesson-recap', labelKey: 'quickRecap' },
  { id: 'lesson-quiz', labelKey: 'quizConclusionTitle' },
] as const;

interface PageProps {
  params: Promise<{ lessonId: string }>;
}

export default function LessonDetailPage({ params }: PageProps) {
  const { lessonId } = use(params);
  const { t } = useLanguage();
  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [navigation, setNavigation] = useState<ChapterNavigation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLesson = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/learning/lessons/${lessonId}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || t.learning.lessonNotFound);
      }
      setLesson(data.data);
      setNavigation(data.data.navigation);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.learning.loadLessonError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLesson();
  }, [lessonId]);

  /**
   * Jump links are plain in-page anchors, so they work before JavaScript runs
   * and with a keyboard. Sections a lesson does not have are filtered out so the
   * list never links to an anchor that is not on the page.
   */
  const availableSections = lesson
    ? LESSON_SECTIONS.filter((section) => {
        if (section.id === 'lesson-why') return Boolean(lesson.content_en.whyItMatters);
        if (section.id === 'lesson-quiz') return Boolean(lesson.quiz);
        return true;
      })
    : [];

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-12">
      {/* Back Link */}
      <div>
        <Link
          href="/learn"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-ink transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-teal focus-visible:ring-offset-2 rounded motion-reduce:transition-none"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t.learning.backToLessons}
        </Link>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center space-y-3 py-20">
          <Spinner size="lg" />
          <p className="text-sm text-muted-ink">{t.learning.loading}</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="space-y-4">
          <Alert variant="danger" title={t.learning.errorTitle}>
            {error}
          </Alert>
          <Button variant="outline" onClick={fetchLesson}>
            {t.common.retry}
          </Button>
        </div>
      )}

      {/* Content + Quiz */}
      {!loading && !error && lesson && (
        <>
          {/* In this lesson */}
          {availableSections.length > 0 && (
            <nav
              aria-label={t.learning.lessonNavigationLabel}
              className="rounded-xl border border-rule bg-surface-container-low p-3"
            >
              <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-ink">
                {t.learning.inThisLesson}
              </p>
              <ul className="flex flex-wrap gap-1.5">
                {availableSections.map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="inline-flex min-h-[40px] items-center rounded-lg border border-rule bg-white px-2.5 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-teal focus-visible:ring-offset-2 motion-reduce:transition-none"
                    >
                      {t.learning[section.labelKey]}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          <LessonReader lesson={lesson} navigation={navigation} />
          {lesson.quiz && <QuizSection lesson={lesson} />}

          <LessonNavigation navigation={navigation} />
        </>
      )}
    </div>
  );
}