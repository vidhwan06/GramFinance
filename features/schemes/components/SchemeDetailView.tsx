'use client';

import React from 'react';
import { SchemeBreadcrumbs } from './SchemeBreadcrumbs';
import { SchemeHero } from './SchemeHero';
import { SchemeMetaStrip } from './SchemeMetaStrip';
import { SchemeOverviewSection } from './SchemeOverviewSection';
import { SchemeCriteriaSection } from './SchemeCriteriaSection';
import { SchemeEligibilityJourney } from './SchemeEligibilityJourney';
import { SchemeTransparencyNote } from './SchemeTransparencyNote';
import { SchemeQuestionsSection } from './SchemeQuestionsSection';
import { SchemeClosingCta } from './SchemeClosingCta';
import { OfficialSourceLink } from './OfficialSourceLink';
import { EligibilityForm } from './EligibilityForm';
import { schemeDetailText } from './scheme-detail-copy';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { ELIGIBILITY_DISCLAIMER_EN, ELIGIBILITY_DISCLAIMER_KN } from '../types';
import type { SchemeDetail } from '../schemes-service';

export interface SchemeDetailViewProps {
  scheme: SchemeDetail;
}

/**
 * The scheme detail body.
 *
 * A Client Component so it can read the active language. All data was fetched
 * on the server and arrives as a plain serialisable prop.
 *
 * Composition follows the final Stitch scheme-detail design, section by section,
 * while staying strictly data-driven — every fact on the page reads from the
 * `scheme` record, so the same layout serves PM-KISAN today and any future
 * scheme unchanged:
 *
 *   breadcrumb → hero → at-a-glance strip → about + self-assessment →
 *   criteria + documents → how the check works → eligibility & verification →
 *   official source → questions → closing invitation → check eligibility form
 *
 * The eligibility section is passed `requiredFields`, which the SERVER computed
 * from the scheme's own rules using the same service the API uses. The form has
 * no list of fields of its own, so adding a scheme needs no change here.
 */
export function SchemeDetailView({ scheme }: SchemeDetailViewProps) {
  const { t, language } = useLanguage();
  const c = schemeDetailText(language);

  const schemeName = language === 'kn' ? scheme.nameKn : scheme.nameEn;

  return (
    <div className="w-full">
      {/* ─────────────── BREADCRUMB + VERIFIED DATE ─────────────── */}
      <SchemeBreadcrumbs schemeName={schemeName} lastVerified={scheme.lastVerified} />

      {/* ─────────────── HERO ─────────────── */}
      <SchemeHero
        scheme={scheme}
        language={language}
        verifiedLabel={t.schemes.lastVerified}
        eligibilityCta={t.schemes.checkEligibility}
      />

      {/* ─────────────── AT-A-GLANCE STRIP ─────────────── */}
      <SchemeMetaStrip scheme={scheme} />

      {/* ─────────────── ABOUT + SELF-ASSESSMENT ─────────────── */}
      <SchemeOverviewSection scheme={scheme} />

      {/* ─────────────── CONDITIONS + DOCUMENTS ─────────────── */}
      <SchemeCriteriaSection scheme={scheme} />

      {/* ─────────────── HOW THE CHECK WORKS ─────────────── */}
      <SchemeEligibilityJourney />

      {/* ─────────────── ELIGIBILITY AND VERIFICATION ─────────────── */}
      <SchemeTransparencyNote />

      {/* ─────────────── OFFICIAL SOURCE ─────────────── */}
      {/* OfficialSourceLink renders its own heading (exactly one on the page). */}
      <section
        className="max-w-[1440px] w-full mx-auto px-margin-mobile lg:px-margin pb-space-xl"
        aria-label={t.schemes.sourceTitle}
      >
        <div className="bg-surface-container-lowest p-6 lg:p-8 rounded-2xl shadow-sm border border-outline-variant/40">
          <OfficialSourceLink
            source={scheme.officialSource}
            label={t.schemes.sourceTitle}
            warningLabel={t.schemes.sourceWarning}
            lastVerifiedLabel={t.schemes.lastVerified}
            lastVerified={scheme.lastVerified}
            language={language}
            visitLabel={c.sourceCta}
          />
        </div>
      </section>

      {/* ─────────────── QUESTIONS ABOUT THE CHECK ─────────────── */}
      <SchemeQuestionsSection />

      {/* ─────────────── CLOSING INVITATION ─────────────── */}
      <SchemeClosingCta />

      {/* ─────────────── CHECK ELIGIBILITY ─────────────── */}
      <section
        id="check"
        className="max-w-[1440px] w-full mx-auto px-margin-mobile lg:px-margin pb-space-xl scroll-mt-24"
        aria-labelledby="scheme-check-heading"
      >
        <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/40 p-6 lg:p-10 space-y-4">
          <div className="space-y-1">
            <span className="font-label-md text-label-md text-secondary font-semibold uppercase tracking-wider">
              {c.checkEyebrow}
            </span>
            <h2
              id="scheme-check-heading"
              className="font-headline-md text-headline-md text-on-surface font-bold"
            >
              {t.schemes.checkEligibility}
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant">{c.checkDesc}</p>
          </div>

          <p className="rounded-xl border-l-4 border-seal-red bg-surface-container-low p-3 text-body-sm text-on-surface">
            {language === 'kn' ? ELIGIBILITY_DISCLAIMER_KN : ELIGIBILITY_DISCLAIMER_EN}
          </p>

          <EligibilityForm
            schemeId={scheme.id}
            requiredFields={scheme.requiredFields}
            language={language}
            labels={{
              formTitle: t.schemes.formTitle,
              formHelp: t.schemes.formHelp,
              checkButton: t.schemes.checkButton,
              checking: t.schemes.checking,
              addInformation: t.schemes.addInformation,
              errorTitle: t.schemes.errorTitle,
              fieldRequired: t.schemes.fieldRequired,
            }}
          />
        </div>
      </section>
    </div>
  );
}
