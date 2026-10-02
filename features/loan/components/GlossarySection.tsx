'use client';

import React from 'react';
import { pageCopy } from '../presentation/dictionary';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { BookOpen } from 'lucide-react';

/**
 * The glossary — six plain-language definitions, bilingual from one shared
 * list (each term carries both languages, so en/kn can never drift apart).
 */
export function GlossarySection() {
  const { language } = useLanguage();
  const kn = language === 'kn';
  const c = pageCopy[kn ? 'kn' : 'en'];

  return (
    <section
      className="w-full bg-surface-container-low py-space-xl border-b border-outline-variant/40"
      aria-labelledby="loan-glossary-heading"
    >
      <div className="max-w-[1440px] mx-auto px-margin-mobile lg:px-margin">
        <div className="max-w-3xl mb-space-lg">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-semibold flex items-center gap-1.5">
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            {c.glossaryEyebrow}
          </span>
          <h2
            id="loan-glossary-heading"
            className="font-headline-lg text-headline-lg text-on-surface mt-1"
          >
            {c.glossaryTitle}
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2 leading-relaxed">
            {c.glossaryLead}
          </p>
        </div>

        <dl className="max-w-3xl divide-y divide-outline-variant rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-sm">
          {c.glossary.map((entry) => (
            <div key={entry.id} className="px-5 py-4">
              <dt className="font-title-md text-title-md text-on-surface">
                {kn ? entry.termKn : entry.termEn}
              </dt>
              <dd className="mt-1 font-body-sm text-body-sm leading-relaxed text-on-surface-variant">
                {kn ? entry.defKn : entry.defEn}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
