'use client';

import React from 'react';
import { ArrowDown } from 'lucide-react';
import { LessonProse, LessonSection } from './LessonSection';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import type { ParsedFlow } from '../lesson-content';

interface LessonFlowProps {
  flow: ParsedFlow;
}

/**
 * The `visual` field, rendered as a flow instead of a monospace paragraph.
 *
 * The stored value is a plain-text chain (`a -> b -> c`) so it always had
 * step order in it — it just had no visual weight for it. Here each step is its
 * own numbered card, numbered in reading order and connected by an arrow so the
 * direction is unambiguous.
 *
 * The remaining sentences in that field ("THE TWO SECRETS: …") are shown below
 * as key points rather than discarded.
 *
 * Layout: one column on mobile, where a vertical sequence is the only readable
 * option; two columns from `sm` up so the sequence is visible at a glance
 * without a wide horizontal scroller. Arrows are `aria-hidden` — the numbers
 * already convey order to a screen reader.
 */
export function LessonFlow({ flow }: LessonFlowProps) {
  const { t } = useLanguage();
  const hasSteps = flow.steps.length > 0;

  return (
    <LessonSection
      id="lesson-flow"
      eyebrow={t.learning.eyebrowHowItWorks}
      title={t.learning.visual}
      tone="structure"
      hint={hasSteps ? t.learning.flowHint : undefined}
    >
      {hasSteps && (
        <ol className="grid gap-2 sm:grid-cols-2">
          {flow.steps.map((step, index) => (
            <li key={index} className="flex items-start gap-2.5">
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-aubergine text-sm font-bold text-warm-ivory"
                aria-hidden="true"
              >
                {index + 1}
              </span>
              <span className="min-w-0 pt-0.5 text-base leading-6 text-ink">{step}</span>
            </li>
          ))}
        </ol>
      )}

      {flow.keyPoints.length > 0 && (
        <div className={hasSteps ? 'mt-4 border-t border-rule pt-4' : ''}>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-ink">
            {t.learning.keyPoints}
          </p>
          <ul className="space-y-2">
            {flow.keyPoints.map((point, index) => (
              <li key={index} className="flex items-start gap-2 text-base leading-6 text-ink">
                <ArrowDown
                  className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-ink"
                  aria-hidden="true"
                />
                <span>
                  {point.label && (
                    <span className="font-bold text-ink">{point.label}: </span>
                  )}
                  {point.body}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </LessonSection>
  );
}

/**
 * Standalone prose block used where a section is plain text rather than a list.
 * Kept here so the reader file stays a sequence of section calls.
 */
export function LessonTextSection({
  id,
  eyebrow,
  title,
  tone = 'neutral',
  paragraphs,
}: {
  id: string;
  eyebrow: string;
  title: string;
  tone?: 'neutral' | 'key' | 'warning' | 'structure';
  paragraphs: string[];
}) {
  const { t } = useLanguage();
  return (
    <LessonSection id={id} eyebrow={eyebrow} title={title} tone={tone} hint={t.learning.chunkHint}>
      <LessonProse paragraphs={paragraphs} />
    </LessonSection>
  );
}