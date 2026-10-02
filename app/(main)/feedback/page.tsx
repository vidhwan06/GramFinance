'use client';

import React from 'react';
import Link from 'next/link';
import { Info } from 'lucide-react';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { FeedbackForm } from '@/features/feedback/FeedbackForm';
import { FeedbackSidebar } from '@/features/feedback/presentation/FeedbackSidebar';
import { SignInNotice } from '@/features/auth/components/SignInNotice';
import { useAuthState } from '@/features/auth/hooks/useAuthState';
import { copy } from '@/features/feedback/presentation/copy';

/**
 * Feedback page — Stitch "Feedback Improvement Console".
 *
 * Section mapping (design `code.html` → existing functionality):
 *  1. Sub-header utility stripe  → breadcrumb + truthful status pills
 *  2. Editorial hero             → eyebrow, headline, Kannada subline, lead
 *  3. Two-column body            → left: `FeedbackSidebar` (side panel,
 *     guidance, emergency/help, privacy); right: `FeedbackForm` — the console
 *     with the exact same fields, state machine and `POST /api/feedback`
 *     payload as before.
 * Success/error states live inside `FeedbackForm` (test contract).
 *
 * The design's mock statistics band ("42+ Schemes", "Q1 2026 Audit",
 * "Next release: April 2026") is deliberately not ported — those figures are
 * not real app data.
 */
export default function FeedbackPage() {
  const { t, language } = useLanguage();
  const c = copy[language === 'kn' ? 'kn' : 'en'];
  const auth = useAuthState();

  return (
    <>
      {/* ─────────────── SUB-HEADER UTILITY / BREADCRUMB STRIPE ─────────────── */}
      <section className="w-full border-b border-outline-variant/40 bg-surface-container-low">
        <div className="mx-auto flex max-w-[1440px] flex-col items-start justify-between gap-3 px-margin-mobile py-3.5 sm:flex-row sm:items-center lg:px-margin">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2">
            <Link
              href="/home"
              className="font-label-md text-label-md text-on-surface-variant transition-colors hover:text-on-surface"
            >
              {t.appName}
            </Link>
            <span className="font-label-sm text-label-sm text-outline-variant" aria-hidden="true">
              /
            </span>
            <span className="flex items-center gap-1.5 font-label-md text-label-md text-on-surface">
              <span>{t.nav.feedback}</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                ({c.crumbGloss})
              </span>
            </span>
          </nav>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded bg-surface-container-lowest px-2.5 py-1 font-label-sm text-label-sm text-on-surface-variant">
              <span className="h-1.5 w-1.5 rounded-full bg-secondary" aria-hidden="true" />
              <span>{t.footer.zeroTracking}</span>
            </span>
            <span className="inline-flex items-center rounded bg-surface-container-highest px-2 py-1 font-kannada text-label-sm text-on-surface">
              {c.langPill}
            </span>
          </div>
        </div>
      </section>

      {/* ─────────────── RESTRAINED EDITORIAL HERO ─────────────── */}
      <section className="w-full bg-surface pb-space-md pt-space-lg">
        <div className="mx-auto max-w-[1440px] px-margin-mobile lg:px-margin">
          <div className="max-w-3xl">
            <p className="mb-space-sm inline-flex items-center gap-2 rounded bg-surface-container-high px-2.5 py-1 font-label-sm text-label-sm uppercase tracking-wider text-on-surface">
              <span className="h-2 w-2 rounded-full bg-tertiary-fixed" aria-hidden="true" />
              {c.eyebrow}
            </p>
            <h1 className="font-headline-xl text-headline-xl-mobile leading-tight tracking-tight text-primary-container lg:text-headline-xl">
              {c.headline}
            </h1>
            <p className="mt-2 font-kannada text-title-md text-secondary">{c.kannadaSubline}</p>
            <p className="mt-space-sm font-body-lg text-body-lg leading-relaxed text-on-surface-variant">
              {c.lead}
            </p>
            <div className="mt-space-sm flex items-center gap-2 font-label-md text-label-md text-on-surface-variant">
              <Info className="h-[18px] w-[18px] shrink-0 text-secondary" aria-hidden="true" />
              <span>{c.heroNote}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────── TWO-COLUMN PRIMARY LAYOUT ─────────────── */}
      <section className="w-full bg-surface pb-space-xl">
        <div className="mx-auto max-w-[1440px] px-margin-mobile lg:px-margin">
          <div className="grid grid-cols-1 items-start gap-space-lg lg:grid-cols-12">
            {/* LEFT: guidance & safeguards */}
            <aside className="flex flex-col gap-space-md lg:col-span-5">
              <FeedbackSidebar />
            </aside>

            {/* RIGHT: the feedback console (same form, restyled) */}
            <div className="lg:col-span-7">
              {/*
                Pre-submission sign-in notice.

                Shown only once the session lookup has resolved and the visitor
                is confirmed signed out, so a signed-in user never sees a flash
                of it while the lookup is in flight. The form stays fully usable
                either way: `FeedbackForm` still handles a 401 and offers the
                same action from its own unauthorized state.
              */}
              {auth.ready && !auth.signedIn && (
                <div className="mb-space-md">
                  <SignInNotice onSignedIn={auth.refresh} />
                </div>
              )}
              <FeedbackForm />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
