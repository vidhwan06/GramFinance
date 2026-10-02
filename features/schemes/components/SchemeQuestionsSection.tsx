'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { schemeDetailText } from './scheme-detail-copy';
import { useLanguage } from '@/features/language/hooks/useLanguage';

/**
 * "Questions about this check".
 *
 * The Stitch design ships a scheme FAQ; the schema has no FAQ field, so rather
 * than authoring answers about the scheme this section answers questions about
 * the eligibility check itself — how the tri-state result behaves and what the
 * estimate means. Nothing here states a scheme fact.
 */
export function SchemeQuestionsSection() {
  const { language } = useLanguage();
  const c = schemeDetailText(language);
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="max-w-[1440px] w-full mx-auto px-margin-mobile lg:px-margin pb-space-xl">
      <div className="space-y-4 max-w-2xl mb-8">
        <span className="font-label-md text-label-md text-secondary font-semibold uppercase tracking-wider">
          {c.questionsEyebrow}
        </span>
        <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold">
          {c.questionsTitle}
        </h2>
        <p className="font-body-lg text-body-lg text-on-surface-variant">{c.questionsDesc}</p>
      </div>

      <div className="max-w-4xl space-y-4">
        {c.faq.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <div
              key={item.q}
              className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/40 overflow-hidden transition-all"
            >
              <button
                type="button"
                className="w-full p-5 lg:p-6 text-left flex items-center justify-between gap-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 rounded-lg"
                aria-expanded={isOpen}
                aria-controls={`scheme-question-${index}`}
                onClick={() => setOpenIndex(isOpen ? null : index)}
              >
                <span className="font-title-md text-title-md text-on-surface font-semibold">
                  {item.q}
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-outline shrink-0 transition-transform duration-200 ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                  aria-hidden="true"
                />
              </button>
              <div
                id={`scheme-question-${index}`}
                hidden={!isOpen}
                className="px-5 lg:px-6 pb-6 text-on-surface-variant font-body-md text-body-md leading-relaxed"
              >
                {item.a}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
