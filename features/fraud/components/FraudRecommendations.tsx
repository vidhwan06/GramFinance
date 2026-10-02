'use client';

import React from 'react';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { copy } from '@/features/fraud/presentation/copy';
import type { Recommendation } from '@/lib/fraud/types';
import { translateRecommendation } from '@/features/fraud/lib/fraud-translations';
import { Phone } from 'lucide-react';

/**
 * Displays practical safety recommendations returned by the fraud checker.
 *
 * Stitch composition: aubergine action card — "! What you should do" header
 * with a numbered checklist, then the cybercrime helpline note when the
 * recommendations mention `1930`.
 *
 * Shows each recommendation as a bullet point. If the cybercrime helpline
 * (`1930`) is included in the recommendations, it is displayed clearly but
 * without making the entire result alarmist.
 *
 * The purpose is to help the user think clearly, not to fear-monger.
 * Renders nothing at all when there are no recommendations.
 */
export function FraudRecommendations({
  recommendations,
}: {
  recommendations: Recommendation[];
}) {
  const { t, language } = useLanguage();
  const c = copy[language === 'kn' ? 'kn' : 'en'];

  if (recommendations.length === 0) return null;

  const hasHelpline = recommendations.some(
    (rec) => rec.text.includes('1930')
  );

  return (
    <section
      aria-labelledby="action-heading"
      className="rounded-xl bg-primary-container shadow-md p-space-md lg:p-space-lg space-y-space-md"
    >
      <div className="flex items-center gap-space-sm">
        <span
          className="w-8 h-8 rounded-full bg-tertiary-fixed text-primary-container flex items-center justify-center font-bold shrink-0"
          aria-hidden="true"
        >
          !
        </span>
        <div>
          <span className="font-label-sm text-label-sm text-on-primary-container uppercase tracking-wider font-semibold block">
            {c.recEyebrow}
          </span>
          <h3
            id="action-heading"
            className="font-title-md text-title-md text-inverse-on-surface leading-tight"
          >
            {t.fraud.recommendationsTitle}
          </h3>
        </div>
      </div>

      <p className="font-label-sm text-label-sm text-on-primary-container">
        {c.recSub}
      </p>

      <ol className="space-y-space-md" role="list">
        {recommendations.map((rec, idx) => (
          <li key={idx} className="flex items-start gap-space-sm">
            <span
              className="w-6 h-6 rounded-full bg-white/10 text-tertiary-fixed flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
              aria-hidden="true"
            >
              {idx + 1}
            </span>
            <p className="font-body-sm text-body-sm text-inverse-on-surface leading-relaxed flex-1">
              {translateRecommendation(rec.text, t)}
            </p>
          </li>
        ))}
      </ol>

      {/* Cybercrime helpline — shown clearly but not alarmist */}
      {hasHelpline && (
        <div className="pt-space-sm border-t border-white/10 flex items-start gap-2">
          <Phone className="h-4 w-4 shrink-0 mt-0.5 text-tertiary-fixed" aria-hidden="true" />
          <p className="font-body-sm text-body-sm text-on-primary-container leading-relaxed">
            {t.fraud.helplineNote}
          </p>
        </div>
      )}
    </section>
  );
}

/** displayName for dev tools. */
FraudRecommendations.displayName = 'FraudRecommendations';
