'use client';

import React from 'react';
import { ArrowRight } from 'lucide-react';
import { schemeDetailText } from './scheme-detail-copy';
import { useLanguage } from '@/features/language/hooks/useLanguage';

/**
 * The closing aubergine invitation. It links to the real eligibility form
 * (`#check`) rather than opening a modal the app does not have.
 */
export function SchemeClosingCta() {
  const { t, language } = useLanguage();
  const c = schemeDetailText(language);

  return (
    <section className="max-w-[1440px] w-full mx-auto px-margin-mobile lg:px-margin pb-space-xl">
      <div className="bg-primary-container text-inverse-on-surface rounded-2xl p-8 lg:p-12 shadow-xl flex flex-col lg:flex-row items-center justify-between gap-8 relative overflow-hidden">
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-secondary/20 blur-3xl pointer-events-none" />

        <div className="space-y-3 relative z-10 max-w-2xl text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-tertiary-fixed font-label-sm text-label-sm">
            <span>{c.ctaEyebrow}</span>
          </div>
          <h2 className="font-headline-lg text-headline-lg text-white font-bold tracking-tight">
            {c.ctaTitle}
          </h2>
          <p className="font-body-lg text-body-lg text-on-primary-container">{c.ctaBody}</p>
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <a
            href="#check"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-tertiary-fixed text-on-tertiary-fixed hover:bg-tertiary-fixed-dim transition-all font-label-lg text-label-lg font-bold shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2"
          >
            <span>{t.schemes.checkEligibility}</span>
            <ArrowRight className="w-[18px] h-[18px]" aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}
