'use client';

import React from 'react';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import type { Recommendation } from '@/lib/fraud/types';
import { translateRecommendation } from '@/features/fraud/lib/fraud-translations';

/**
 * Displays practical safety recommendations returned by the fraud checker.
 *
 * Shows each recommendation as a bullet point. If the cybercrime helpline
 * (`1930`) is included in the recommendations, it is displayed clearly but
 * without making the entire result alarmist.
 *
 * The purpose is to help the user think clearly, not to fear-monger.
 */
export function FraudRecommendations({
  recommendations,
}: {
  recommendations: Recommendation[];
}) {
  const { t } = useLanguage();

  if (recommendations.length === 0) return null;

  const hasHelpline = recommendations.some(
    (rec) => rec.text.includes('1930')
  );

  return (
    <div>
      <h3 className="text-lg font-bold text-gray-900 mb-3">
        {t.fraud.recommendationsTitle}
      </h3>
      <ul className="space-y-2" role="list">
        {recommendations.map((rec, idx) => (
          <li
            key={idx}
            className="flex items-start gap-2 pb-2 border-b border-gray-100 last:pb-0 last:border-0"
          >
            <span
              aria-hidden="true"
              className="font-medium text-ink shrink-0 mt-0.5"
            >
              •
            </span>
            <span className="flex-1 text-sm text-gray-700">
              {translateRecommendation(rec.text, t)}
            </span>
          </li>
        ))}
      </ul>

      {/* Cybercrime helpline - shown clearly but not alarmist */}
      {hasHelpline && (
        <div className="mt-4 rounded-lg border border-rule bg-paper p-3">
          <p className="text-sm text-gray-600 flex items-start gap-2">
            <svg
              className="h-4 w-4 shrink-0 mt-0.5 text-gray-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
            </svg>
            <span>
              {t.fraud.helplineNote}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}

/** displayName for dev tools. */
FraudRecommendations.displayName = 'FraudRecommendations';
