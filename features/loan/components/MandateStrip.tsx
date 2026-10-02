'use client';

import React from 'react';
import { pageCopy } from '../presentation/dictionary';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { ExternalLink, Printer } from 'lucide-react';

/**
 * The closing mandate strip.
 *
 * The design's regulatory seal row (RBI / SEBI / NPCI badges) is deliberately
 * NOT reproduced: this app holds no regulatory approval and must not imply
 * any. What remains is the honest register — no commissions, no data
 * collection, figures computed in your browser — plus an external link to the
 * RBI's own site and a browser print button for a paper copy of the note.
 */
export function MandateStrip() {
  const { language } = useLanguage();
  const kn = language === 'kn';
  const c = pageCopy[kn ? 'kn' : 'en'];

  return (
    <section
      className="w-full py-space-xl"
      aria-labelledby="loan-mandate-heading"
    >
      <div className="max-w-[1440px] mx-auto px-margin-mobile lg:px-margin">
        <div className="rounded-2xl border border-outline-variant bg-surface-container-low px-5 py-6 sm:px-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="max-w-2xl">
              <h2
                id="loan-mandate-heading"
                className="font-title-md text-title-md text-on-surface"
              >
                {c.mandateTitle}
              </h2>
              <p className="mt-2 font-body-sm text-body-sm leading-relaxed text-on-surface-variant">
                {c.mandateBody}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <a
                href="https://www.rbi.org.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-outline-variant bg-surface px-4 py-2.5 font-label-md text-label-md font-semibold text-secondary hover:bg-surface-container-lowest focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
              >
                {c.rbiLinkLabel}
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">
                  {kn ? '(ಹೊಸ ಟ್ಯಾಬ್‌ನಲ್ಲಿ ತೆರೆಯುತ್ತದೆ)' : '(opens in a new tab)'}
                </span>
              </a>

              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-full bg-primary-container px-4 py-2.5 font-label-md text-label-md font-semibold text-inverse-on-surface shadow-sm hover:opacity-95 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
              >
                <Printer className="h-4 w-4" aria-hidden="true" />
                {c.printLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
