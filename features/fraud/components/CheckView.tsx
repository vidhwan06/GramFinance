'use client';

import React from 'react';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { FraudChecker } from './FraudChecker';
import { CheckHero } from './CheckHero';
import { CheckEducation } from './CheckEducation';
import { CheckGuidance } from './CheckGuidance';
import { copy } from '@/features/fraud/presentation/copy';
import { ScrollText } from 'lucide-react';

/**
 * The "Stay Safe" scam-inspector page body.
 *
 * Visual shell only — every check still runs through the real
 * `/api/fraud/check` endpoint via `FraudChecker`; no detection logic here.
 *
 * Stitch sections:
 *   1. Meta bar / breadcrumb + hero (eyebrow, bilingual headline, lead, chips)
 *   2. Main inspector canvas — input console + results (FraudChecker), the
 *      honest "why we never say 100% safe" perspective card, the education
 *      strip and the how-it-works / limitations / action-guidance block
 */
export function CheckView() {
  const { language } = useLanguage();
  const c = copy[language === 'kn' ? 'kn' : 'en'];

  return (
    <div className="w-full">
      {/* ─────────────── SECTION 1: META BAR + HERO ─────────────── */}
      <section className="w-full bg-surface-container-low py-space-xl border-b border-outline-variant/40">
        <div className="max-w-[1440px] mx-auto px-margin-mobile lg:px-margin">
          <CheckHero />
        </div>
      </section>

      {/* ─────────────── SECTION 2: MAIN INSPECTOR CANVAS ─────────────── */}
      <section className="w-full bg-surface py-space-xl">
        <div className="max-w-[1440px] mx-auto px-margin-mobile lg:px-margin space-y-space-xl">
          {/* Interactive input console + results viewport */}
          <FraudChecker />

          {/* Perspective card: why we never claim a message is fully safe */}
          <div className="rounded-xl bg-surface-container shadow-sm border border-outline-variant/50 p-space-md lg:p-space-lg">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-space-md items-center">
              <div className="md:col-span-8 space-y-1">
                <div className="flex items-center gap-2">
                  <ScrollText className="text-secondary text-[20px]" aria-hidden="true" />
                  <span className="font-label-sm text-label-sm text-secondary font-bold uppercase tracking-wider">
                    {c.perspectiveEyebrow}
                  </span>
                </div>
                <h2 className="font-title-lg text-title-lg text-on-surface">
                  {c.perspectiveTitle}
                </h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                  {c.perspectiveBody}
                </p>
              </div>
              <div className="md:col-span-4 flex justify-start md:justify-end">
                <div className="p-space-sm rounded-lg bg-surface-container-lowest text-on-surface shadow-sm border border-outline-variant/50 text-center w-full sm:w-auto">
                  <span className="font-label-sm text-label-sm text-on-surface-variant block">
                    {c.doctrineLabel}
                  </span>
                  <span className="font-title-md text-title-md font-semibold text-secondary">
                    {c.doctrineValue}
                  </span>
                  <span className="font-label-sm text-[11px] text-on-surface-variant block mt-0.5">
                    {c.doctrineSub}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Education strip: common scam patterns */}
          <CheckEducation />

          {/* How it works / limitations / action guidance + 1930 */}
          <CheckGuidance />
        </div>
      </section>
    </div>
  );
}
