'use client';

import React from 'react';
import { BadgeCheck, ClipboardCheck, FileCheck2, ShieldCheck } from 'lucide-react';
import { schemeDetailText } from './scheme-detail-copy';
import { useLanguage } from '@/features/language/hooks/useLanguage';

const BLOCK_ICONS = [ClipboardCheck, ShieldCheck, FileCheck2];

/**
 * The "Eligibility and verification" trust notice.
 *
 * Maps the Stitch design's "A note from GramFinance" band onto the app's own
 * three disclosure blocks — eligibility estimate, official verification and
 * administrative requirements — so the reader is told plainly what this check
 * can and cannot decide.
 */
export function SchemeTransparencyNote() {
  const { t, language } = useLanguage();
  const c = schemeDetailText(language);

  const blocks = [
    {
      title: t.schemes.aboutEligibilityEstimate,
      body: t.schemes.aboutEligibilityEstimateDesc,
    },
    {
      title: t.schemes.aboutOfficialVerification,
      body: t.schemes.aboutOfficialVerificationDesc,
    },
    {
      title: t.schemes.aboutAdminRequirements,
      body: t.schemes.aboutAdminRequirementsDesc,
    },
  ];

  return (
    <section className="max-w-[1440px] w-full mx-auto px-margin-mobile lg:px-margin pb-space-xl">
      <div className="bg-surface-container-low p-6 lg:p-10 rounded-2xl">
        <div className="flex items-start gap-5">
          <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-secondary shrink-0">
            <BadgeCheck className="w-6 h-6" aria-hidden="true" />
          </div>
          <div className="space-y-1.5">
            <span className="font-label-md text-label-md text-secondary font-semibold uppercase tracking-wider">
              {c.noteEyebrow}
            </span>
            <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
              {t.schemes.aboutEligibilityAndVerification}
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
              {c.noteIntro}
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {blocks.map((block, index) => {
            const Icon = BLOCK_ICONS[index] ?? ShieldCheck;
            return (
              <div
                key={block.title}
                className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/40"
              >
                <div className="flex items-center gap-2 mb-1.5 text-secondary">
                  <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
                  <h3 className="font-title-md text-title-md font-semibold text-on-surface">
                    {block.title}
                  </h3>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant">{block.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
