'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { LessonReader } from '@/features/learning/components/LessonReader';
import { QuizSection } from '@/features/learning/components/QuizSection';
import type { ChapterNavigation, LessonDetail } from '@/features/learning/types';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';

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

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      {/* Back Link */}
      <div>
        <Link
          href="/learn"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t.learning.backToLessons}
        </Link>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <Spinner size="lg" />
          <p className="text-sm text-gray-600">{t.learning.loading}</p>
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
          {/* Chapter Progress */}
          {navigation && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="font-medium text-gray-700">
                {t.learning.chapter} {navigation.currentIndex} {t.learning.of} {navigation.totalChapters}
              </span>
            </div>
          )}

          <LessonReader lesson={lesson} />
          {lesson.quiz && <QuizSection lesson={lesson} />}

          {/* Prev/Next Navigation */}
          {navigation && (
            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
              {navigation.prevChapterId ? (
                <Link
                  href={`/learn/lesson/${navigation.prevChapterId}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  {t.learning.prevChapter}
                </Link>
              ) : (
                <div />
              )}
              {navigation.nextChapterId ? (
                <Link
                  href={`/learn/lesson/${navigation.nextChapterId}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-700 text-white text-sm font-semibold hover:bg-green-800 transition-colors"
                >
                  {t.learning.nextChapter}
                  <ChevronRight className="w-4 h-4" />
                </Link>
              ) : (
                <div />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
