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
    <div className="space-y-6">
      {/* What this message says */}
      <section aria-labelledby="summary-heading">
        <h3 id="summary-heading" className="text-lg font-bold text-gray-900 mb-3">
          {t.fraud.explanationWhatMessageSays}
        </h3>
        <div className="rounded-lg border border-rule bg-white p-4 text-left">
          <p className="text-base text-gray-700 leading-relaxed">
            {t.fraud.explanationGenuineDesc}
          </p>
        </div>
      </section>

      {/* No warning indicators */}
      <section aria-labelledby="no-warning-heading">
        <h3 id="no-warning-heading" className="text-lg font-bold text-gray-900 mb-3">
          {t.fraud.explanationNoWarning}
        </h3>
        <div className="rounded-lg border border-green-300 bg-green-50 p-4 text-left">
          <p className="text-base text-gray-700 leading-relaxed">
            {t.fraud.explanationNoWarningDesc}
          </p>
        </div>
      </section>

      {/* What to verify anyway */}
      <section aria-labelledby="verify-heading">
        <h3 id="verify-heading" className="text-lg font-bold text-gray-900 mb-3">
          {t.fraud.explanationWhatToVerify}
        </h3>
        <div className="rounded-lg border border-rule bg-white p-4 text-left">
          <p className="text-base text-gray-700 leading-relaxed">
            {t.fraud.explanationVerifyAnyway}
          </p>
        </div>
      </section>

      {/* Disclaimer */}
      <div className="border-t border-rule pt-4">
        <p className="text-xs text-gray-400">{t.fraud.disclaimer}</p>
      </div>

      {/* Retry button */}
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
