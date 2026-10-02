'use client';

import React from 'react';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { copy } from '@/features/fraud/presentation/copy';
import { CircleCheck, ArrowRight, ShieldCheck } from 'lucide-react';

/**
 * Empty result state: no warning signs detected.
 *
 * Stitch composition: calm "no obvious scam patterns" header, the three
 * honest sections (what the message says / what was not found / what to
 * verify anyway), the tool disclaimer and a retry action.
 *
 * Displays a calm message with an important disclaimer:
 *   - Does NOT say the message is legitimate
 *   - Does not guarantee legitimacy
 *   - Encourages independent verification of important claims
 */
export function EmptyResult({
  onRetry,
}: {
  onRetry: () => void;
}) {
  const { t, language } = useLanguage();
  const c = copy[language === 'kn' ? 'kn' : 'en'];
  const alt = copy[language === 'kn' ? 'en' : 'kn'];

  return (
    <div className="rounded-xl bg-surface-container-lowest shadow-sm border border-outline-variant/50 p-space-md lg:p-space-lg space-y-space-md">
      {/* Calm header */}
      <div className="flex items-start gap-space-md">
        <div
          className="w-12 h-12 rounded-xl bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0"
          aria-hidden="true"
        >
          <CircleCheck className="h-7 w-7" />
        </div>
        <div>
          <div className="flex items-center gap-space-sm flex-wrap">
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
              {c.cleanHeadline}
            </h2>
            <span className="font-headline-sm text-headline-sm text-on-surface-variant font-normal">
              · {alt.cleanHeadline}
            </span>
          </div>
          <p className="mt-1 font-body-md text-body-md text-on-surface-variant leading-relaxed max-w-3xl">
            {c.cleanBody}
          </p>
        </div>
      </div>

      {/* What this message says */}
      <section aria-labelledby="summary-heading">
        <h3
          id="summary-heading"
          className="font-title-md text-title-md text-on-surface mb-space-sm"
        >
          {t.fraud.explanationWhatMessageSays}
        </h3>
        <div className="rounded-lg bg-surface-container-low border border-outline-variant/40 p-space-sm">
          <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
            {t.fraud.explanationGenuineDesc}
          </p>
        </div>
      </section>

      {/* No warning indicators — honest transparency callout */}
      <section
        aria-labelledby="no-warning-heading"
        className="rounded-xl bg-secondary text-on-secondary p-space-sm"
      >
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="h-5 w-5 text-tertiary-fixed shrink-0" aria-hidden="true" />
          <h3
            id="no-warning-heading"
            className="font-title-md text-title-md text-on-secondary"
          >
            {t.fraud.explanationNoWarning}
          </h3>
        </div>
        <p className="font-body-sm text-body-sm leading-relaxed">
          {t.fraud.explanationNoWarningDesc}
        </p>
      </section>

      {/* What to verify anyway */}
      <section aria-labelledby="verify-heading">
        <h3
          id="verify-heading"
          className="font-title-md text-title-md text-on-surface mb-space-sm"
        >
          {t.fraud.explanationWhatToVerify}
        </h3>
        <div className="rounded-lg bg-surface-container-low border border-outline-variant/40 p-space-sm">
          <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
            {t.fraud.explanationVerifyAnyway}
          </p>
        </div>
      </section>

      {/* Disclaimer */}
      <div className="border-t border-outline-variant/60 pt-space-sm">
        <p className="font-label-sm text-label-sm text-on-surface-variant leading-relaxed">
          {t.fraud.disclaimer}
        </p>
      </div>

      {/* Retry action */}
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-space-md py-2.5 rounded-lg bg-primary-container text-inverse-on-surface font-label-lg text-label-lg font-semibold hover:opacity-95 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary min-h-[48px]"
        type="button"
      >
        {t.fraud.tryAgain}
        <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
      </button>
    </div>
  );
}

/** displayName for dev tools. */
EmptyResult.displayName = 'EmptyResult';
