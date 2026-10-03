'use client';

import React from 'react';
import { Lightbulb } from 'lucide-react';
import { useLanguage } from '@/features/language/hooks/useLanguage';

interface LessonTakeawayProps {
  /** Verbatim from `practicalTakeaway`. Never reworded. */
  text: string;
}

/**
 * "One thing to remember" — the single most important line in the lesson.
 *
 * This is the strongest element in the first screen on purpose: a learner who
 * reads nothing else should still leave with the rule that prevents the most
 * expensive mistake.
 *
 * The text is the lesson's own first `practicalTakeaway` entry, passed straight
 * through. Nothing is composed or invented here — if a lesson has no takeaway
 * entry the block does not render at all, rather than showing a generic
 * placeholder that would look like advice but carry none.
 */
export function LessonTakeaway({ text }: LessonTakeawayProps) {
  const { t } = useLanguage();

  if (text.trim().length === 0) return null;

  return (
    <aside
      aria-labelledby="lesson-takeaway-heading"
      className="rounded-xl border-l-4 border-deep-teal bg-deep-teal/5 p-4 shadow-sm sm:p-5"
    >
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-deep-teal text-warm-ivory"
          aria-hidden="true"
        >
          <Lightbulb className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2
            id="lesson-takeaway-heading"
            className="text-[11px] font-bold uppercase tracking-widest text-deep-teal"
          >
            {t.learning.oneThingToRemember}
          </h2>
          <p className="mt-1 text-lg font-semibold leading-7 text-ink">{text}</p>
        </div>
      </div>
    </aside>
  );
}