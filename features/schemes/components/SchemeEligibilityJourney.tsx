'use client';

import React from 'react';
import { ClipboardList, MessageSquare, ScrollText, Server } from 'lucide-react';
import { schemeDetailText } from './scheme-detail-copy';
import { useLanguage } from '@/features/language/hooks/useLanguage';

const STEP_ICONS = [ScrollText, ClipboardList, Server, MessageSquare];

/**
 * "How this check works" — the four real steps of the eligibility flow.
 *
 * This replaces the Stitch design's payment-schedule section: the schema has no
 * instalment schedule, so instead of inventing amounts or dates this shows the
 * equivalent-value journey that actually exists — read the conditions, answer
 * the form, let the server evaluate, read a preliminary estimate.
 */
export function SchemeEligibilityJourney() {
  const { language } = useLanguage();
  const c = schemeDetailText(language);

  return (
    <section
      id="how-it-works"
      className="w-full bg-surface-container-low py-space-xl scroll-mt-24"
    >
      <div className="max-w-[1440px] mx-auto px-margin-mobile lg:px-margin">
        <div className="space-y-4 max-w-2xl mb-12">
          <span className="font-label-md text-label-md text-secondary font-semibold uppercase tracking-wider">
            {c.journeyEyebrow}
          </span>
          <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold">
            {c.journeyTitle}
          </h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant">{c.journeyDesc}</p>
        </div>

        <ol className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {c.steps.map((step, index) => {
            const Icon = STEP_ICONS[index] ?? ScrollText;
            return (
              <li
                key={step.title}
                className="p-6 rounded-2xl bg-surface-container-lowest flex flex-col justify-between shadow-sm list-none"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-headline-sm text-headline-sm text-secondary font-bold">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
                      <Icon className="w-[18px] h-[18px]" aria-hidden="true" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="font-title-md text-title-md text-on-surface font-bold">
                      {step.title}
                    </h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      {step.body}
                    </p>
                  </div>
                </div>
                <div className="mt-6 pt-3 text-secondary font-label-sm text-label-sm font-semibold">
                  {step.footer}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
