'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { copy } from '@/features/fraud/presentation/copy';
import { ShieldCheck, ListChecks, Landmark, ChevronRight } from 'lucide-react';

/**
 * Top meta bar (breadcrumb) + hero for the Stay Safe / Scam Inspector page.
 *
 * Stitch composition: breadcrumb with a Kannada pill, an eyebrow chip, the
 * big bilingual headline, the lead paragraph, a trust card on the right and
 * a row of trust chips underneath.
 *
 * The trust copy is deliberately truthful — the message IS sent to the
 * GramFinance check API, so there is no "client-side only" claim here.
 */
export function CheckHero() {
  const { language } = useLanguage();
  const c = copy[language === 'kn' ? 'kn' : 'en'];
  const alt = copy[language === 'kn' ? 'en' : 'kn'];

  const chips = [
    { icon: ListChecks, label: c.trustChip1 },
    { icon: Landmark, label: c.trustChip2 },
  ];

  return (
    <div>
      {/* Breadcrumb bar */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 mb-space-md text-on-surface-variant flex-wrap">
        <Link
          href="/"
          className="font-label-md text-label-md hover:text-on-surface transition-colors"
        >
          {c.breadcrumbHome}
        </Link>
        <span className="font-label-sm text-label-sm text-outline" aria-hidden="true">
          /
        </span>
        <span
          className="font-label-md text-label-md text-secondary font-semibold"
          aria-current="page"
        >
          {c.breadcrumbCurrent}
        </span>
        <span className="ml-2 px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-[11px] hidden sm:inline-block">
          {c.fraudCheckPill}
        </span>
      </nav>

      {/* Main headline block */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-end">
        <div className="lg:col-span-8 space-y-space-sm">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-highest text-on-surface font-label-sm text-label-sm">
            <span className="w-2 h-2 rounded-full bg-secondary" aria-hidden="true" />
            <span>
              {c.eyebrow} · {alt.eyebrow}
            </span>
          </div>

          <h1 className="font-headline-xl text-headline-xl tracking-tight text-on-surface">
            {c.headline}
            <span className="block font-headline-lg text-headline-lg text-on-surface-variant font-normal mt-1">
              {alt.headline}
            </span>
          </h1>

          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl leading-relaxed">
            {c.lead}
          </p>

          {/* Trust chips */}
          <ul className="flex flex-wrap items-center gap-space-sm pt-1" role="list">
            {chips.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-lowest border border-outline-variant/60 shadow-sm font-label-sm text-label-sm text-on-surface"
              >
                <Icon className="h-3.5 w-3.5 text-secondary shrink-0" aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>
        </div>

        {/* Trust card */}
        <div className="lg:col-span-4 flex flex-col items-start lg:items-end justify-end">
          <div className="p-space-md rounded-xl bg-surface-container-lowest shadow-sm border border-outline-variant/50 max-w-sm w-full">
            <div className="flex items-start gap-space-sm">
              <ShieldCheck className="text-secondary text-[22px] shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="font-label-md text-label-md text-on-surface font-semibold">
                  {c.trustTitle}
                </p>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 leading-snug">
                  {c.trustBody}
                </p>
              </div>
            </div>
            <div className="mt-space-sm pt-space-sm border-t border-outline-variant/50 flex items-center gap-1.5 text-secondary font-label-md text-label-md font-semibold">
              <span>{c.trustChip3}</span>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
