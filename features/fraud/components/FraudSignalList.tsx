'use client';

import React from 'react';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { cn } from '@/lib/utils/cn';
import type { FraudSignalMatch } from '@/lib/fraud/types';

/**
 * Lists the fraud warning signals detected in the message.
 *
 * For each signal displays:
 *   - Signal name
 *   - Explanation of what was detected
 *
 * If matchedText is available, it is shown as a detected phrase.
 * Signal severity is indicated by color glyph and tone, not by color alone.
 */
export function FraudSignalList({
  signals,
}: {
  signals: FraudSignalMatch[];
}) {
  const { t } = useLanguage();

  const severityGlyphs: Record<string, string> = {
    low: '○',
    medium: '◐',
    high: '◉',
  };

  const severityTones: Record<string, string> = {
    low: 'border-green-300 bg-green-50',
    medium: 'border-amber-300 bg-amber-50',
    high: 'border-red-300 bg-red-50',
  };

  const severityLabels: Record<string, string> = {
    low: t.fraud.severityLow,
    medium: t.fraud.severityMedium,
    high: t.fraud.severityHigh,
  };

  return (
    <div>
      <h3 className="text-lg font-bold text-gray-900 mb-3">
        {t.fraud.signalsHeader}
      </h3>
      <ul className="space-y-3" role="list">
        {signals.map((signal) => {
          const sev = signal.severity || 'low';

          return (
            <li
              key={signal.code}
              className={cn('rounded-lg border p-3', severityTones[sev])}
            >
              <div className="flex items-start gap-2">
                <span
                  aria-hidden="true"
                  className="text-lg font-bold leading-6"
                >
                  {severityGlyphs[sev]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">
                    {signal.name}
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {signal.explanation}
                  </p>
                  {signal.matchedText && (
                    <p className="text-xs text-gray-500 mt-1.5 italic">
                      {t.fraud.detectedPhrase}: &ldquo;{signal.matchedText}&rdquo;
                    </p>
                  )}
                </div>
                <span className="text-xs font-medium text-gray-500 shrink-0">
                  {severityLabels[sev]}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** displayName for dev tools. */
FraudSignalList.displayName = 'FraudSignalList';
