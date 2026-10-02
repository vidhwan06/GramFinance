'use client';

import React from 'react';
import {
  AlertTriangle,
  CircleHelp,
  MessageSquare,
  Phone,
  RefreshCw,
  ShieldCheck,
  ThumbsUp,
  Wrench,
} from 'lucide-react';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { HELPLINE_CYBERCRIME } from '@/lib/utils/constants';
import { copy } from './copy';

/**
 * Left column of the Stitch "Feedback Improvement Console".
 *
 * Four stacked cards, in design order:
 *  1. Response expectations — the side panel: what actually happens to a
 *     submission (reviewed by the project team; no promised reply or date).
 *  2. Guidance — the design's "What can you tell us?" list, rewritten with
 *     generic, truthful copy.
 *  3. Emergency safeguard — the aubergine help strip; keeps the cybercrime
 *     helpline 1930 surfaced and states plainly that this form is not an
 *     emergency channel.
 *  4. Privacy strip — asks people to keep Aadhaar/bank/OTP/phone details out
 *     of free-text feedback.
 *
 * Copy is feature-local (`presentation/copy.ts`); the shared translation
 * files are not touched.
 */

const GUIDE_ICONS = [CircleHelp, RefreshCw, Wrench, ThumbsUp, MessageSquare];

export function FeedbackSidebar() {
  const { language } = useLanguage();
  const c = copy[language === 'kn' ? 'kn' : 'en'];

  return (
    <>
      {/* ── 1. Response expectations (side panel) ─────────────────────────── */}
      <section
        aria-labelledby="feedback-side-title"
        className="bg-surface-container-lowest rounded-2xl border border-outline-variant/40 p-space-md shadow-sm"
      >
        <p className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant pb-space-sm">
          {c.sideEyebrow}
        </p>
        <h2
          id="feedback-side-title"
          className="font-title-lg text-title-lg text-primary-container mb-space-sm"
        >
          {c.sideTitle}
        </h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">
          {c.sideIntro}
        </p>
        <ul className="space-y-space-sm">
          {c.sidePoints.map((point) => (
            <li
              key={point}
              className="flex items-start gap-space-sm rounded-lg p-space-xs transition-colors hover:bg-surface-container-low"
            >
              <span
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded bg-surface-container"
                aria-hidden="true"
              >
                <ShieldCheck className="h-4 w-4 text-secondary" />
              </span>
              <p className="font-body-sm text-body-sm text-on-surface-variant">{point}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* ── 2. Guidance — what can you tell us? ───────────────────────────── */}
      <section
        aria-labelledby="feedback-guide-title"
        className="rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-space-md shadow-sm"
      >
        <div className="flex items-center justify-between pb-space-sm">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
            {c.guideEyebrow}
          </span>
          <span className="font-label-sm text-label-sm font-semibold text-secondary">
            {c.guideCount}
          </span>
        </div>
        <h2
          id="feedback-guide-title"
          className="mb-space-sm font-title-lg text-title-lg text-primary-container"
        >
          {c.guideTitle}
        </h2>
        <p className="mb-space-md font-body-sm text-body-sm text-on-surface-variant">
          {c.guideIntro}
        </p>
        <ul className="space-y-space-sm">
          {c.guideItems.map((item, index) => {
            const Icon = GUIDE_ICONS[index] ?? CircleHelp;
            return (
              <li
                key={item.title}
                className="flex items-start gap-space-sm rounded-lg p-space-xs transition-colors hover:bg-surface-container-low"
              >
                <span
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded bg-surface-container"
                  aria-hidden="true"
                >
                  <Icon className="h-[18px] w-[18px] text-primary-container" />
                </span>
                <div>
                  <h3 className="font-label-lg text-label-lg text-on-surface">{item.title}</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">{item.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ── 3. Emergency safeguard / help strip ───────────────────────────── */}
      <section
        aria-labelledby="feedback-emergency-title"
        className="rounded-2xl bg-primary-container p-space-md text-inverse-on-surface shadow-sm"
      >
        <div className="mb-2 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-tertiary-fixed" aria-hidden="true" />
          <span className="font-label-lg text-label-lg font-semibold tracking-wide text-tertiary-fixed">
            {c.emergencyLabel}
          </span>
        </div>
        <h3
          id="feedback-emergency-title"
          className="mb-2 font-title-md text-title-md text-inverse-on-surface"
        >
          {c.emergencyTitle}
        </h3>
        <p className="mb-4 font-body-sm text-body-sm leading-relaxed text-on-primary-container">
          {c.emergencyBody}
        </p>
        <div className="mb-3 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          <a
            href={`tel:${HELPLINE_CYBERCRIME}`}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-tertiary-fixed px-3 py-2 font-label-md text-label-md font-semibold text-on-tertiary-fixed transition-opacity hover:opacity-95"
          >
            <Phone className="h-[18px] w-[18px]" aria-hidden="true" />
            <span>
              {c.emergencyDial} {HELPLINE_CYBERCRIME} {c.emergencyHelpline}
            </span>
          </a>
          <span className="rounded-lg bg-white/10 px-3 py-2 text-center font-label-md text-label-md text-inverse-on-surface">
            {c.emergencyCsc}
          </span>
        </div>
        <span className="block font-label-sm text-label-sm text-on-primary-container">
          {c.emergencySource}
        </span>
      </section>

      {/* ── 4. Privacy strip ──────────────────────────────────────────────── */}
      <section
        aria-labelledby="feedback-privacy-title"
        className="rounded-2xl bg-surface-container-low p-space-md"
      >
        <div className="flex items-start gap-space-sm">
          <ShieldCheck className="mt-0.5 h-[22px] w-[22px] shrink-0 text-secondary" aria-hidden="true" />
          <div>
            <h4
              id="feedback-privacy-title"
              className="font-label-lg text-label-lg text-on-surface"
            >
              {c.privacyTitle}
            </h4>
            <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
              {c.privacyBody}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
