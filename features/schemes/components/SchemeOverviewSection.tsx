'use client';

import React from 'react';
import { ArrowRight, CheckCircle2, Info } from 'lucide-react';
import { schemeDetailText } from './scheme-detail-copy';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import type { SchemeDetail } from '../schemes-service';

/**
 * The two-column body: the plain "About this scheme" card on the left and the
 * aubergine self-assessment invitation on the right.
 *
 * The left card carries the record's own description — nothing else. The right
 * card links into the real eligibility form (`#check`) instead of pretending to
 * hold a questionnaire of its own.
 */
export function SchemeOverviewSection({ scheme }: { scheme: SchemeDetail }) {
  const { t, language } = useLanguage();
  const c = schemeDetailText(language);

  const description = language === 'kn'
    ? scheme.descriptionKn || scheme.descriptionEn
    : scheme.descriptionEn || scheme.descriptionKn;

  const bullets = [c.selfCheckBullet1, c.selfCheckBullet2, c.selfCheckBullet3];

  return (
    <section className="max-w-[1440px] w-full mx-auto px-margin-mobile lg:px-margin py-space-xl">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* ── Left: About the scheme (7 cols) ── */}
        <div className="lg:col-span-7 bg-surface-container-lowest p-8 lg:p-10 rounded-2xl flex flex-col justify-between shadow-sm">
          <div className="space-y-6">
            <div className="space-y-2">
              <span className="font-label-md text-label-md text-secondary font-semibold uppercase tracking-wider">
                {c.aboutEyebrow}
              </span>
              <h2
                id="scheme-overview-heading"
                className="font-headline-md text-headline-md text-on-surface font-bold"
              >
                {c.aboutTitle}
              </h2>
            </div>
            {description && (
              <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
                {description}
              </p>
            )}
          </div>

          <div className="pt-6 mt-6 flex items-center gap-3 border-t border-outline-variant/40">
            <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center text-secondary shrink-0">
              <Info className="w-4 h-4" aria-hidden="true" />
            </div>
            <span className="font-body-sm text-body-sm text-on-surface-variant">{c.aboutNote}</span>
          </div>
        </div>

        {/* ── Right: self-assessment invitation (5 cols, aubergine) ── */}
        <div
          id="eligibility-checker"
          className="lg:col-span-5 bg-primary-container text-inverse-on-surface p-8 lg:p-10 rounded-2xl flex flex-col justify-between relative overflow-hidden shadow-lg"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-tertiary-fixed/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-tertiary-fixed font-label-sm text-label-sm self-start">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary-fixed" aria-hidden="true" />
              <span>{c.selfCheckEyebrow}</span>
            </div>

            <div className="space-y-3">
              <h3 className="font-headline-md text-headline-md text-white font-bold leading-snug">
                {c.selfCheckTitle}
              </h3>
              <p className="font-body-md text-body-md text-on-primary-container leading-relaxed">
                {c.selfCheckBody}
              </p>
            </div>

            <ul className="space-y-2.5 pt-2">
              {bullets.map((bullet) => (
                <li key={bullet} className="flex items-center gap-2.5">
                  <CheckCircle2
                    className="w-[18px] h-[18px] text-tertiary-fixed shrink-0"
                    aria-hidden="true"
                  />
                  <span className="font-body-sm text-body-sm text-inverse-on-surface">{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative z-10 pt-8 space-y-3">
            <a
              href="#check"
              className="w-full inline-flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-tertiary-fixed text-on-tertiary-fixed hover:bg-tertiary-fixed-dim transition-colors font-label-lg text-label-lg font-bold shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2"
            >
              <span>{t.schemes.checkEligibility}</span>
              <ArrowRight className="w-[18px] h-[18px]" aria-hidden="true" />
            </a>
            <p className="font-label-sm text-label-sm text-on-primary-container text-center">
              {c.selfCheckButtonHint}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
