'use client';

import React, { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { LessonSection } from './LessonSection';
import { useLanguage } from '@/features/language/hooks/useLanguage';

interface LessonScenarioProps {
  scenario: { number: number; opening: string; rest: string[] };
}

/**
 * One scenario, with the resolution behind a "Think about it" reveal.
 *
 * Each scenario in the stored `example` field is a full story with a decision,
 * the reasoning, the likely mistake and the better approach — several hundred
 * characters. Shown all at once, three of them is a wall of text; shown as an
 * unresolved situation, it becomes a question the learner can actually answer
 * to themselves first.
 *
 * Nothing is invented for the reveal: the explanation is the remainder of that
 * scenario's own text, and the scenario still renders in full even if the split
 * found nothing to hide.
 */
export function LessonScenario({ scenario }: LessonScenarioProps) {
  const { t } = useLanguage();
  const [revealed, setRevealed] = useState(false);
  const panelId = `scenario-${scenario.number}-panel`;
  const hasRest = scenario.rest.length > 0;

  return (
    <article className="rounded-lg border border-rule bg-surface-container-lowest p-4">
      <h3 className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-ink">
        {t.learning.scenarioLabel.replace('{n}', String(scenario.number))}
      </h3>

      <p className="text-base leading-7 text-ink">{scenario.opening}</p>

      {hasRest && (
        <>
          <p className="mt-2 text-sm font-semibold text-muted-ink">
            {t.learning.whatWouldYouDo}
          </p>
          <button
            type="button"
            onClick={() => setRevealed((previous) => !previous)}
            aria-expanded={revealed}
            aria-controls={panelId}
            className="mt-2 inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-rule bg-surface px-3 py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-teal focus-visible:ring-offset-2 motion-reduce:transition-none"
          >
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            {revealed ? t.learning.hideExplanation : t.learning.thinkAboutIt}
          </button>

          <div id={panelId} hidden={!revealed} className="mt-3 border-l-2 border-rule pl-3">
            {scenario.rest.map((paragraph, index) => (
              <p key={index} className="mb-2 text-base leading-7 text-ink last:mb-0">
                {paragraph}
              </p>
            ))}
          </div>
        </>
      )}
    </article>
  );
}

interface LessonScenariosProps {
  scenarios: Array<{ number: number; opening: string; rest: string[] }>;
}

/** All scenarios for one lesson, in the order the stored text lists them. */
export function LessonScenarios({ scenarios }: LessonScenariosProps) {
  const { t } = useLanguage();

  if (scenarios.length === 0) return null;

  return (
    <LessonSection
      id="lesson-scenarios"
      eyebrow={t.learning.eyebrowRealLife}
      title={t.learning.example}
      hint={t.learning.scenarioHint}
    >
      <div className="space-y-3">
        {scenarios.map((scenario) => (
          <LessonScenario key={scenario.number} scenario={scenario} />
        ))}
      </div>
    </LessonSection>
  );
}