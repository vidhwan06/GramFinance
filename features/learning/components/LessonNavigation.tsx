'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import type { ChapterNavigation } from '../types';

interface LessonNavigationProps {
  navigation?: ChapterNavigation | null;
}

/**
 * Where the learner goes next, always visible at the foot of the lesson.
 *
 * "Next lesson" is the primary action — finishing a chapter is the expected
 * path — while "previous" stays a quiet outline button so going back never
 * competes with moving on. When there is no next chapter the module is finished,
 * and that is said plainly instead of leaving an empty half of the bar.
 *
 * Navigation state still comes from the API's `navigation` object exactly as
 * before; only the presentation is new.
 */
export function LessonNavigation({ navigation }: LessonNavigationProps) {
  const { t } = useLanguage();

  if (!navigation) return null;

  const { prevChapterId, nextChapterId, currentIndex, totalChapters } = navigation;

  return (
    <nav
      aria-label={t.learning.lessonNavigationLabel}
      className="border-t border-rule pt-6"
    >
      <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        {prevChapterId ? (
          <Link
            href={`/learn/lesson/${prevChapterId}`}
            className="inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-lg border border-rule bg-white px-4 py-2 text-base font-semibold text-ink transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-teal focus-visible:ring-offset-2 motion-reduce:transition-none sm:justify-start"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            {t.learning.prevChapter}
          </Link>
        ) : (
          <span className="hidden sm:block" />
        )}

        <p className="text-center text-sm font-semibold text-muted-ink sm:order-2">
          {t.learning.chapter} {currentIndex} {t.learning.of} {totalChapters}
        </p>

        {nextChapterId ? (
          <Link href={`/learn/lesson/${nextChapterId}`} className="sm:order-3">
            <Button className="w-full" size="lg">
              {t.learning.nextChapter}
              <ChevronRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
            </Button>
          </Link>
        ) : (
          <div className="flex items-center justify-center gap-2 rounded-lg border border-deep-teal/40 bg-deep-teal/5 px-4 py-3 text-center sm:order-3">
            <PartyPopper className="h-5 w-5 shrink-0 text-deep-teal" aria-hidden="true" />
            <p className="text-base font-semibold text-ink">{t.learning.moduleComplete}</p>
          </div>
        )}
      </div>
    </nav>
  );
}