'use client';

import React from 'react';
import { ArrowRight, BadgeCheck, Network, ScrollText, ShieldCheck } from 'lucide-react';
import { firstSentence, formatSchemeDate, schemeDetailText } from './scheme-detail-copy';
import type { SchemeDetail } from '../schemes-service';

export interface SchemeHeroProps {
  scheme: SchemeDetail;
  language: 'en' | 'kn';
  verifiedLabel: string;
  eligibilityCta: string;
}

/**
 * The scheme detail hero — category chip, title, bilingual names, a one-line
 * summary, two calls to action and two trust rows, beside a decorative
 * verification composition.
 *
 * Data-driven: every value comes from the `scheme` prop fetched on the server,
 * so this composition serves PM-KISAN today and any future scheme unchanged.
 * The right-hand graphic is abstract on purpose — no amounts, no figures, no
 * claims; it only carries the record's own last-verified date.
 */
export function SchemeHero({ scheme, language, verifiedLabel, eligibilityCta }: SchemeHeroProps) {
  const c = schemeDetailText(language);

  const primaryName = language === 'kn' ? scheme.nameKn : scheme.nameEn;
  const secondaryName = language === 'kn' ? scheme.nameEn : scheme.nameKn;
  const description = language === 'kn'
    ? scheme.descriptionKn || scheme.descriptionEn
    : scheme.descriptionEn || scheme.descriptionKn;
  const summary = firstSentence(description);

  return (
    <section
      className="max-w-[1440px] w-full mx-auto px-margin-mobile lg:px-margin pt-4 pb-space-xl"
      aria-labelledby="scheme-title"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* ── Title & value narrative (7 cols) ── */}
        <div className="lg:col-span-7 flex flex-col items-start space-y-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-surface-container text-on-surface-variant">
              <BadgeCheck className="w-[18px] h-[18px] text-secondary" aria-hidden="true" />
              <span className="font-label-md text-label-md">{c.category}</span>
            </div>
            <h1
              id="scheme-title"
              className="font-headline-xl text-headline-xl-mobile lg:text-headline-xl text-on-surface tracking-tight leading-tight"
            >
              {primaryName}
            </h1>
            {secondaryName && (
              <p className="font-title-lg text-title-lg text-secondary font-medium tracking-normal">
                {secondaryName}
              </p>
            )}
          </div>

          {summary && (
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl leading-relaxed">
              {summary}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <a
              href="#check"
              className="inline-flex items-center justify-center gap-3 px-6 py-3.5 rounded-lg bg-primary-container text-inverse-on-surface hover:opacity-95 transition-all shadow-md group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2"
            >
              <span className="font-label-lg text-label-lg tracking-wide text-white">
                {eligibilityCta}
              </span>
              <span className="w-6 h-6 rounded-full bg-tertiary-fixed flex items-center justify-center text-primary-container group-hover:translate-x-0.5 transition-transform">
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </span>
            </a>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 px-5 py-3.5 rounded-lg bg-surface-container-low border border-outline-variant/60 text-on-surface hover:bg-surface-container transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2"
            >
              <Network className="w-5 h-5 text-outline" aria-hidden="true" />
              <span className="font-label-lg text-label-lg">{c.heroCtaSecondary}</span>
            </a>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-3 text-on-surface-variant">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-[18px] h-[18px] text-secondary" aria-hidden="true" />
              <span className="font-label-sm text-label-sm">{c.heroMetaEstimate}</span>
            </div>
            <div className="flex items-center gap-2">
              <ScrollText className="w-[18px] h-[18px] text-secondary" aria-hidden="true" />
              <span className="font-label-sm text-label-sm">{c.heroMetaRecord}</span>
            </div>
          </div>
        </div>

        {/* ── Decorative verification composition (5 cols) ── */}
        <div className="lg:col-span-5 relative w-full flex items-center justify-center">
          <div className="w-full max-w-[460px] aspect-[5/4] relative rounded-2xl bg-surface-container-low p-6 overflow-hidden flex items-center justify-center">
            {/* Subtle background accents */}
            <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-secondary/10 blur-2xl" />
            <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-tertiary-fixed/30 blur-2xl" />

            {/* Abstract "records being verified" composition — deliberately
                free of amounts, counts or any scheme-specific claim. */}
            <svg
              className="w-full h-full relative z-10"
              fill="none"
              viewBox="0 0 420 330"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              {/* Grounding lines */}
              <path
                d="M40 288C130 278 220 298 385 283"
                stroke="#D9D5CC"
                strokeLinecap="round"
                strokeWidth="2"
              />
              <path
                d="M62 303C160 295 250 308 365 298"
                stroke="#D9D5CC"
                strokeDasharray="4 4"
                strokeWidth="1.5"
              />

              {/* Three ledger cards of increasing height */}
              <rect x="62" y="168" width="66" height="116" rx="10" fill="#F0EEE8" />
              <rect x="147" y="128" width="66" height="156" rx="10" fill="#E4E2DD" />
              <rect x="232" y="96" width="66" height="188" rx="10" fill="#24152F" />

              {/* Abstract content lines — no numbers, no amounts */}
              <path d="M78 196h34M78 212h34M78 228h20" stroke="#C9C4BB" strokeLinecap="round" strokeWidth="5" />
              <path d="M163 156h34M163 172h34M163 188h20" stroke="#CFCAC1" strokeLinecap="round" strokeWidth="5" />
              <path d="M248 126h34M248 142h34M248 158h20" stroke="#5A4A63" strokeLinecap="round" strokeWidth="5" />

              {/* Verification dots on each card */}
              <circle cx="95" cy="256" r="13" fill="#146965" />
              <path d="M89 256l4 4 8-9" stroke="#FFFFFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
              <circle cx="180" cy="240" r="13" fill="#146965" />
              <path d="M174 240l4 4 8-9" stroke="#FFFFFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
              <circle cx="265" cy="236" r="14" fill="#DCED5F" />
              <path d="M259 236l4 4 8-9" stroke="#1A1E00" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />

              {/* Dashed conduit leading to the seal */}
              <path
                d="M46 74C130 62 230 52 314 66"
                stroke="#146965"
                strokeDasharray="6 6"
                strokeWidth="2"
              />
              <circle cx="46" cy="74" r="6" fill="#146965" />

              {/* Shield seal */}
              <path
                d="M356 40l39 14v34c0 26-16 45-39 53-23-8-39-27-39-53V54l39-14z"
                fill="#146965"
              />
              <path
                d="M342 90l10 10 20-24"
                stroke="#DCED5F"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="5"
              />

              {/* Organic leaf accents */}
              <path d="M116 160c0-20 13-29 27-26-3 15-12 26-27 26z" fill="#A5F0EA" />
              <path d="M294 84c4-19 18-26 31-22-4 14-14 24-31 22z" fill="#89D4CE" />
            </svg>

            {/* Verified-date pill (record data, decorative here — the same
                date is announced in the breadcrumb and source strip) */}
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-surface-container-lowest rounded-full shadow-sm pl-2 pr-4 py-1.5">
              <span className="w-6 h-6 rounded-full bg-tertiary-fixed flex items-center justify-center">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M5 13l4 4L19 7"
                    stroke="#1A1E00"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="3"
                  />
                </svg>
              </span>
              <span className="font-label-sm text-label-sm text-on-surface whitespace-nowrap">
                {verifiedLabel} ·{' '}
                <time dateTime={scheme.lastVerified}>
                  {formatSchemeDate(scheme.lastVerified, language)}
                </time>
              </span>
            </div>

            {/* Kannada accent badge */}
            <div className="absolute top-4 right-4 z-10 bg-surface-container px-3 py-1 rounded-full text-secondary font-label-sm text-label-sm">
              {c.graphicBadge}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
