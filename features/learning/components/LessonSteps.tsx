'use client';

import React from 'react';
import { ListChecks } from 'lucide-react';
import { LessonSection } from './LessonSection';
import { useLanguage } from '@/features/language/hooks/useLanguage';

interface LessonStepsProps {
  steps: string[];
}

/**
 * The step-by-step guide, one visually distinct row per step.
 *
 * Zero-padded numbers (`01`, `02`) instead of `list-decimal`, because an
 * `<ol>` marker is small, low-contrast and inconsistent between browsers — this
 * needs to be readable at a glance by someone who is scrolling quickly.
 *
 * Steps are already one-sentence each in the stored data, so nothing is split
 * here; the row frame is what does the work.
 */
export function LessonSteps({ steps }: LessonStepsProps) {
  const { t } = useLanguage();

  if (steps.length === 0) return null;

  return (
    <LessonSection
      id="lesson-steps"
      eyebrow={t.learning.eyebrowDoThis}
      title={t.learning.stepByStep}
      tone="structure"
      icon={<ListChecks className="h-5 w-5 text-aubergine" />}
    >
      <ol className="space-y-2">
        {steps.map((step, index) => (
          <li
            key={index}
            className="flex items-start gap-3 rounded-lg border border-rule bg-surface-container-lowest p-3"
          >
            <span
              className="shrink-0 font-mono text-sm font-bold tabular-nums text-aubergine"
              aria-hidden="true"
            >
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className="min-w-0 text-base leading-7 text-ink">{step}</span>
          </li>
        ))}
      </ol>
    </LessonSection>
  );
}