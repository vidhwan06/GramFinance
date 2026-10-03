'use client';

import React, { useState } from 'react';
import Link from 'next/link';

import { useLoanCalculator } from '../hooks/useLoanCalculator';
import { pageCopy } from '../presentation/dictionary';
import { LoanModeTabs, LoanToolMode } from './LoanModeTabs';
import { ExistingLoanPanel } from '../existing-loan/components/ExistingLoanPanel';
import { LoanForm } from './LoanForm';
import { FeeEditor } from './FeeEditor';
import { LoanResult } from './LoanResult';
import { CostInsightCards } from './CostInsightCards';
import { RateDecoder } from './RateDecoder';
import { YearLedger } from './YearLedger';
import { GlossarySection } from './GlossarySection';
import { MandateStrip } from './MandateStrip';
import { PrepaymentSimulator } from './PrepaymentSimulator';
import { LoanComparisonCard } from './LoanComparisonCard';

import { Alert } from '@/components/ui/Alert';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { CheckCircle2, ChevronRight, Lock, RotateCcw, ScrollText } from 'lucide-react';

/**
 * The Loan & EMI page body — a faithful port of the Stitch design's section
 * sequence, built entirely on the existing engine, hooks and UI kit.
 *
 * Stitch sections:
 *   1. Civic trust bar
 *   2. Breadcrumb + hero (the page's only h1)
 *   3. Dual-column workspace — parameters + fees (left), aubergine result
 *      card (right); invalid input swaps the result for an alert
 *   4. Cost-insight cards (what a low EMI hides)
 *   5. What-if scenarios — comparison + prepayment simulator
 *   6. Flat vs reducing decoder (renders InterestAssumption inside)
 *   7. Year-by-year ledger + month-by-month schedule
 *   8. Plain-language glossary
 *   9. Mandate strip (RBI link + print)
 *
 * All mathematics stays in `useLoanCalculator` → `features/loan/engine`.
 * This file only composes and styles.
 */
export function LoanView() {
  const { language } = useLanguage();
  const kn = language === 'kn';
  const c = pageCopy[kn ? 'kn' : 'en'];

  const {
    inputState,
    validation,
    engineResult,
    bilingualSummary,
    prepaymentError,
    presets,
    handleChange,
    addFee,
    removeFee,
    applyPreset,
    setPrepayments,
    resetForm,
  } = useLoanCalculator();

  const isValid = validation.isValid && engineResult !== null && bilingualSummary !== null;
  const validationErrors = validation.errors;

  // Which of the two Loan Tool modes is showing. 'calculate' is the default and
  // the original experience, so a link to /loan behaves exactly as it did before
  // this mode existed.
  const [mode, setMode] = useState<LoanToolMode>('calculate');

  return (
    <div className="w-full">
      <LoanModeTabs mode={mode} onChange={setMode} />

      {/* The Calculate-a-Loan experience, unchanged. Only wrapped so the two
          modes are mutually exclusive; every section below is the original
          markup, and `useLoanCalculator` above is untouched, so this mode's
          behaviour is identical to before. */}
      <div
        id="loan-mode-panel-calculate"
        role="tabpanel"
        aria-labelledby="loan-mode-tab-calculate"
        hidden={mode !== 'calculate'}
      >
      {/* ─────────────── SECTION 1: CIVIC TRUST BAR ─────────────── */}
      <section className="w-full bg-surface-container-high py-2.5">
        <div className="max-w-[1440px] mx-auto px-margin-mobile lg:px-margin flex flex-wrap items-center justify-between gap-3 text-on-surface-variant font-label-sm text-label-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-secondary" aria-hidden="true" />
            <span>{c.metaLead}</span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary" aria-hidden="true" />
              {c.trustInBrowser}
            </span>
            <span className="hidden sm:inline text-outline-variant" aria-hidden="true">
              ·
            </span>
            <span className="hidden sm:inline">{c.trustNoLogin}</span>
            <span className="hidden sm:inline text-outline-variant" aria-hidden="true">
              ·
            </span>
            <span className="hidden sm:inline">{c.trustNoCommissions}</span>
          </div>
        </div>
      </section>

      {/* ─────────────── SECTION 2: BREADCRUMB + HERO ─────────────── */}
      <section className="w-full py-space-md bg-surface">
        <div className="max-w-[1440px] mx-auto px-margin-mobile lg:px-margin">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-2 font-label-md text-label-md text-on-surface-variant mb-space-sm flex-wrap"
          >
            <Link
              href="/home"
              className="hover:text-on-surface transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
            >
              GramFinance
            </Link>
            <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            {/* There is no separate loans index route, so "Loans" is shown as
                a plain parent crumb rather than a dead link. */}
            <span>{c.breadcrumbLoans}</span>
            <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="text-on-surface font-semibold" aria-current="page">
              {c.breadcrumbCurrent}
            </span>
          </nav>

          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-lg pt-space-xs pb-space-md">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-secondary/10 text-secondary font-label-sm text-label-sm uppercase tracking-wide mb-3">
                <span>{c.heroEyebrow}</span>
              </div>
              <h1 className="font-headline-xl text-headline-xl-mobile lg:text-headline-xl text-on-surface tracking-tight">
                {c.heroTitlePre} <span className="text-secondary">{c.heroTitleEm}</span>{' '}
                {c.heroTitlePost}
              </h1>
              {/* Always in the other language, so both appear together. */}
              <p
                lang={kn ? 'en' : 'kn'}
                className="font-headline-sm text-headline-sm text-on-surface-variant mt-2 font-normal"
              >
                {c.heroSubline}
              </p>
              <p className="font-body-md text-body-md text-on-surface-variant mt-3 max-w-2xl leading-relaxed">
                {c.heroLead}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              <div className="p-3 rounded-lg bg-surface-container-low flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-surface-container-highest flex items-center justify-center shrink-0">
                  <Lock className="w-5 h-5 text-secondary" aria-hidden="true" />
                </div>
                <div className="flex flex-col">
                  <span className="font-label-md text-label-md text-on-surface">
                    {c.clientSideTitle}
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    {c.clientSideNote}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-3 rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors font-label-md text-label-md text-on-surface flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
              >
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
                <span>{c.resetBaseline}</span>
              </button>
              {/* Jumps to the ledger. Only offered once a schedule exists, so
                  the anchor can never point at a section that is not rendered. */}
              {isValid && (
                <a
                  href="#loan-ledger-heading"
                  className="px-4 py-3 rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors font-label-md text-label-md text-on-surface flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
                >
                  {c.viewAmortization}
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────── SECTION 3: DUAL-COLUMN WORKSPACE ─────────────── */}
      <section className="w-full pb-space-xl bg-surface" aria-labelledby="loan-workspace-heading">
        <div className="max-w-[1440px] mx-auto px-margin-mobile lg:px-margin">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
            {/* Left column — parameters + fees */}
            <div className="lg:col-span-7 bg-surface-container-lowest rounded-xl p-6 sm:p-8 shadow-sm flex flex-col gap-space-lg">
              <div className="flex items-center justify-between pb-space-sm gap-3 flex-wrap">
                <div>
                  <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">
                    {c.workspaceEyebrow}
                  </span>
                  <h2
                    id="loan-workspace-heading"
                    className="font-title-lg text-title-lg text-on-surface"
                  >
                    {c.workspaceTitle}
                  </h2>
                </div>
              </div>

              <LoanForm
                inputState={inputState}
                validationErrors={validationErrors}
                onChange={handleChange}
                onApplyPreset={applyPreset}
                onReset={resetForm}
                presets={presets}
              />

              <div className="pt-4 border-t border-outline-variant/40">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">
                  {c.feesEyebrow}
                </span>
                <h3 className="font-title-lg text-title-lg text-on-surface mb-1">
                  {c.feesTitle}
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">
                  {c.feesHint}
                </p>
                <FeeEditor
                  fees={inputState.fees}
                  onAddFee={addFee}
                  onRemoveFee={removeFee}
                  validationErrors={validationErrors}
                />
              </div>

              {/* Before-you-sign callout — the design's plain warning note. */}
              <div className="rounded-xl border border-outline-variant/60 bg-surface-container-low p-4 flex items-start gap-3">
                <ScrollText
                  className="w-5 h-5 text-secondary shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <div>
                  <h3 className="font-title-md text-title-md text-on-surface">{c.signTitle}</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed mt-1">
                    {c.signBody}
                  </p>
                  <p className="font-body-sm text-body-sm text-on-surface mt-2 font-semibold">
                    {c.signCheck}
                  </p>
                </div>
              </div>
            </div>

            {/* Right column — result, or the invalid-input alert */}
            <div className="lg:col-span-5">
              {isValid && engineResult && bilingualSummary ? (
                <LoanResult
                  inputState={inputState}
                  engineResult={engineResult}
                  bilingualSummary={bilingualSummary}
                />
              ) : (
                <Alert variant="warning" title={c.invalidTitle}>
                  {c.invalidBody}
                </Alert>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────── SECTION 4: COST INSIGHTS ─────────────── */}
      {isValid && engineResult && <CostInsightCards engineResult={engineResult} />}

      {/* ─────────────── SECTION 5: WHAT-IF SCENARIOS ─────────────── */}
      {isValid && engineResult && (
        <section className="w-full py-space-xl bg-surface" aria-labelledby="loan-scen-heading">
          <div className="max-w-[1440px] mx-auto px-margin-mobile lg:px-margin space-y-space-lg">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-semibold">
                  {c.scenEyebrow}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary/10 text-secondary font-label-sm text-label-sm font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary" aria-hidden="true" />
                  {c.scenChip}
                </span>
              </div>
              <h2
                id="loan-scen-heading"
                className="font-headline-lg text-headline-lg text-on-surface mt-1"
              >
                {c.scenTitle}
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant mt-2 leading-relaxed">
                {c.scenLead}
              </p>
            </div>

            <PrepaymentSimulator
              engineResult={engineResult}
              onPrepaymentChange={setPrepayments}
              prepaymentError={prepaymentError}
            />

            <LoanComparisonCard />

            <p className="font-body-sm text-body-sm text-on-surface-variant">{c.scenTip}</p>
          </div>
        </section>
      )}

      {/* ─────────────── SECTION 6: FLAT VS REDUCING DECODER ─────────────── */}
      {isValid && engineResult && <RateDecoder inputState={inputState} engineResult={engineResult} />}

      {/* ─────────────── SECTION 7: YEAR LEDGER + SCHEDULE ─────────────── */}
      {isValid && engineResult && <YearLedger engineResult={engineResult} />}

      {/* ─────────────── SECTION 8: GLOSSARY ─────────────── */}
      <GlossarySection />

      {/* ─────────────── SECTION 9: MANDATE STRIP ─────────────── */}
      <MandateStrip />
      </div>

      {/*
        Both panels stay MOUNTED, with the inactive one hidden via the `hidden`
        attribute rather than unmounted. `ExistingLoanPanel` keeps its form
        state in its own useState, so unmounting it would wipe everything the
        user typed — the exact thing the tabs exist to avoid. `hidden` is safe
        here because neither wrapper carries a `display-*` utility, which would
        otherwise beat the user-agent `[hidden] { display: none }` rule.

        `aria-controls` on each tab points at the matching id below.
      */}
      <div
        id="loan-mode-panel-existing"
        role="tabpanel"
        aria-labelledby="loan-mode-tab-existing"
        hidden={mode !== 'existing'}
      >
        <ExistingLoanPanel />
      </div>
    </div>
  );
}
