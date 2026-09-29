'use client';

import React from 'react';
import { useLanguage } from '@/features/language/hooks/useLanguage';

/**
 * Empty result state: no warning signs detected.
 *
 * Displays a calm message with an important disclaimer:
 *   - Does NOT say "This message is safe."
 *   - Does not guarantee legitimacy
 *   - Encourages independent verification of important claims
 */
export function EmptyResult({
  onRetry,
}: {
  onRetry: () => void;
}) {
  const { t } = useLanguage();

  return (
    <div className="border border-rule bg-white p-6 text-center rounded-xl">
      <div className="text-3xl mb-3" aria-hidden="true">
        <svg
          className="h-10 w-10 mx-auto text-green-600"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      </div>
      <p className="text-xl font-bold text-gray-900 mb-2">
        {t.fraud.noSignalsTitle}
      </p>
      <p className="text-base text-gray-600 leading-relaxed mb-3">
        {t.fraud.noSignalsDesc}
      </p>
      <p className="text-sm text-gray-500 mb-4">
        {t.fraud.noSignalsDisclaimer}
      </p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-seal-red hover:text-seal-red/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-seal-red focus-visible:ring-offset-2 rounded-lg min-h-[48px]"
        type="button"
      >
        {t.fraud.tryAgain}
        <svg
          className="h-4 w-4 shrink-0"
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}

/** displayName for dev tools. */
EmptyResult.displayName = 'EmptyResult';
