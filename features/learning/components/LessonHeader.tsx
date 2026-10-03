'use client';

import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { Clock } from 'lucide-react';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import type { ChapterNavigation, LessonDetail } from '../types';

interface LessonHeaderProps {
  lesson: LessonDetail;
  navigation?: ChapterNavigation | null;
  minutes: number;
}

/**
 * Compact context block above the lesson.
 *
 * Category, difficulty and title are unchanged. What is new is the *where am I*
 * line — chapter N of M with a progress bar — because on a long lesson that is
 * the only thing telling a learner how much is left. Reading time is derived
 * from the lesson's own content, never authored.
 */
export function LessonHeader({ lesson, navigation, minutes }: LessonHeaderProps) {
  const { language, t } = useLanguage();
  const isKn = language === 'kn';

  const title = isKn ? lesson.title_kn : lesson.title_en;
  const categoryLabel = t.learning.categoryLabels[lesson.category] || lesson.category;
  const difficultyLabel = t.learning.difficultyLabels[lesson.difficulty] || lesson.difficulty;

  return (
    <header className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="primary">{categoryLabel}</Badge>
        <Badge variant="neutral">{difficultyLabel}</Badge>
      </div>

      <h1 className="text-2xl font-bold leading-tight text-ink sm:text-3xl">{title}</h1>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-ink">
        {navigation && (
          <span className="font-semibold text-ink">
            {t.learning.chapter} {navigation.currentIndex}{' '}
            <span className="font-normal text-muted-ink">
              {t.learning.of} {navigation.totalChapters}
            </span>
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-4 w-4" aria-hidden="true" />
          {t.learning.minutesToRead.replace('{minutes}', String(minutes))}
        </span>
      </div>

      {navigation && (
        <Progress
          value={navigation.currentIndex}
          max={navigation.totalChapters}
          className="h-1.5"
          aria-label={t.learning.chapterProgress.replace(
            '{current}',
            String(navigation.currentIndex)
          ).replace('{total}', String(navigation.totalChapters))}
        />
      )}
    </header>
  );
}