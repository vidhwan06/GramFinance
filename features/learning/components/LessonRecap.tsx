'use client';

import React, { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { LessonSection } from './LessonSection';
import { useLanguage } from '@/features/language/hooks/useLanguage';

interface LessonRecapProps {
  recap: string[];
}

/**
 * The quick recap as a self-check list rather than another list to read.
 *
 * Recap items are full sentences, so as bullets they were just more prose to
 * scroll past. As tick boxes the learner has to actively confirm each one, which
 * is the cheapest honest way to turn "read this" into "can I say this back".
 *
 * State is local and deliberately not persisted: nothing is stored, nothing is
 * submitted, and a reload simply starts the check again. Real checkboxes carry
 * their own keyboard and screen-reader behaviour, so no ARIA is invented here.
 */
export function LessonRecap({ recap }: LessonRecapProps) {
  const { t } = useLanguage();
  const [checked, setChecked] = useState<Set<number>>(() => new Set());

  if (recap.length === 0) return null;

  const toggle = (index: number) => {
    setChecked((previous) => {
      const next = new Set(previous);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <LessonSection
      id="lesson-recap"
      eyebrow={t.learning.eyebrowRemember}
      title={t.learning.quickRecap}
      icon={<RotateCcw className="h-5 w-5 text-deep-teal" />}
      hint={t.learning.recapHint}
    >
      <fieldset className="space-y-1">
        <legend className="sr-only">{t.learning.quickRecap}</legend>
        {recap.map((item, index) => {
          const id = `recap-${index}`;
          return (
            <div key={index} className="flex items-start gap-2.5 rounded-lg p-2 hover:bg-surface-container-low">
              <input
                id={id}
                type="checkbox"
                checked={checked.has(index)}
                onChange={() => toggle(index)}
                className="mt-1 h-5 w-5 shrink-0 rounded border-2 border-rule text-deep-teal accent-deep-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-teal focus-visible:ring-offset-2"
              />
              <label
                htmlFor={id}
                className="min-w-0 cursor-pointer text-base leading-7 text-ink"
              >
                {item}
              </label>
            </div>
          );
        })}
      </fieldset>
      <p aria-live="polite" className="mt-2 text-sm font-semibold text-muted-ink">
        {t.learning.recapProgress
          .replace('{done}', String(checked.size))
          .replace('{total}', String(recap.length))}
      </p>
    </LessonSection>
  );
}