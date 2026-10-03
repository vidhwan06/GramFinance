'use client';

import React from 'react';
import { AlertTriangle, Check } from 'lucide-react';
import { LessonSection } from './LessonSection';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { splitMistake } from '../lesson-content';

interface LessonMistakesProps {
  mistakes: string[];
}

/**
 * Common mistakes as compact warning cards.
 *
 * Six dense bullet points read as a wall. Splitting each into a headline (the
 * mistake) and a quieter explanation (why it costs money) makes the list
 * scannable, and the amber left border plus the triangle icon means the
 * "something is wrong here" signal survives without relying on colour alone.
 *
 * The text is the stored string with one split at a comma or sentence break —
 * both halves are still displayed in full.
 */
export function LessonMistakes({ mistakes }: LessonMistakesProps) {
  const { t } = useLanguage();

  if (mistakes.length === 0) return null;

  return (
    <LessonSection
      id="lesson-mistakes"
      eyebrow={t.learning.eyebrowWatchOut}
      title={t.learning.commonMistakes}
      tone="warning"
      icon={<AlertTriangle className="h-5 w-5 text-warning-600" />}
    >
      <ul className="grid gap-2 sm:grid-cols-2">
        {mistakes.map((mistake, index) => {
          const { headline, detail } = splitMistake(mistake);
          return (
            <li
              key={index}
              className="rounded-lg border border-warning-500/40 bg-warning-50/60 p-3"
            >
              <div className="flex items-start gap-2">
                <AlertTriangle
                  className="mt-0.5 h-4 w-4 shrink-0 text-warning-600"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="text-base font-semibold leading-6 text-ink">{headline}</p>
                  {detail && (
                    <p className="mt-1 text-sm leading-6 text-muted-ink">{detail}</p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </LessonSection>
  );
}

interface LessonTakeawayListProps {
  takeaways: string[];
}

/**
 * The practical takeaway as "remember these rules".
 *
 * Deliberately the second-strongest block after the hero takeaway: this is the
 * part a learner should be able to recite. Green because every item is a
 * protective instruction, and each row carries a tick glyph as well as the
 * colour.
 */
export function LessonTakeawayList({ takeaways }: LessonTakeawayListProps) {
  const { t } = useLanguage();

  if (takeaways.length === 0) return null;

  return (
    <LessonSection
      id="lesson-takeaway"
      eyebrow={t.learning.eyebrowRemember}
      title={t.learning.takeaway}
      tone="key"
    >
      <ul className="space-y-2">
        {takeaways.map((takeaway, index) => (
          <li key={index} className="flex items-start gap-2.5">
            <span
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-deep-teal text-warm-ivory"
              aria-hidden="true"
            >
              <Check className="h-4 w-4" />
            </span>
            <span className="min-w-0 text-base leading-7 text-ink">{takeaway}</span>
          </li>
        ))}
      </ul>
    </LessonSection>
  );
}