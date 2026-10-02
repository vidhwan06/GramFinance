'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { homeCopy } from '@/features/home/presentation/dictionary';
import type { SchemeListItem } from '@/features/schemes/schemes-service';
import { targetGroupLabel } from '@/features/schemes/eligibility/form-fields';
import {
  ShieldAlert,
  ArrowDown,
  BadgeCheck,
  Lock,
  CheckCircle2,
  Info,
  ShieldCheck,
  Code,
  ScrollText,
  UserX,
} from 'lucide-react';

// Target-group labels come from the schemes feature's bilingual
// `targetGroupLabel()` so the home page and the scheme pages never drift.

function formatDate(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleDateString(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

// ---------------------------------------------------------------------------
// Home page — final Stitch composition
// ---------------------------------------------------------------------------
export default function HomePage() {
  const { language } = useLanguage();
  const kn = language === 'kn';
  const c = homeCopy[kn ? 'kn' : 'en'];
  const locale = kn ? 'kn-IN' : 'en-GB';

  const [schemes, setSchemes] = useState<SchemeListItem[]>([]);
  const [schemesLoading, setSchemesLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/schemes')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.success && data.data?.schemes) {
          setSchemes(data.data.schemes as SchemeListItem[]);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setSchemesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const count = schemes.length;
  const featured = schemes.find((s) => /pm\s*[-–]?\s*kisan/i.test(s.nameEn)) ?? schemes[0];
  const featuredName = featured ? (kn ? featured.nameKn : featured.nameEn) : '';

  return (
    <div className="w-full">
      {/* ═══════════════ HERO ═══════════════ */}
      <section
        className="w-full bg-surface py-space-xl lg:py-24 border-b border-outline-variant/40"
        aria-label="Hero"
      >
        <div className="max-w-[1440px] mx-auto px-margin-mobile lg:px-margin">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Hero content — 7 cols */}
            <div className="lg:col-span-7 flex flex-col items-start">
              <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-surface-container border border-outline-variant/80 mb-6">
                <span
                  className="w-2 h-2 rounded-full bg-tertiary-fixed animate-pulse motion-reduce:animate-none"
                  aria-hidden="true"
                />
                <span className="text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">
                  {c.hero.eyebrow}
                </span>
              </div>

              <h1 className="text-headline-xl-mobile sm:text-headline-xl lg:text-[54px] lg:leading-[62px] text-on-surface font-bold tracking-tight max-w-2xl">
                {c.hero.title}
              </h1>

              <p
                className={`text-title-lg text-secondary font-semibold mt-2.5 mb-5 ${
                  kn ? '' : 'font-kannada'
                }`}
              >
                {c.hero.sub}
              </p>

              <p className="text-body-lg text-on-surface-variant max-w-xl leading-relaxed mb-8">
                {c.hero.lead}
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
                <Link
                  href="/schemes"
                  className="bg-primary-container text-surface px-7 py-3.5 rounded-xl text-label-lg font-medium inline-flex items-center justify-center gap-3 group hover:bg-deep-plum transition-all shadow-sm"
                >
                  <span>{c.hero.ctaPrimary}</span>
                  <span
                    className="text-tertiary-fixed text-lg font-bold group-hover:translate-x-1.5 transition-transform motion-reduce:transition-none"
                    aria-hidden="true"
                  >
                    →
                  </span>
                </Link>
                <Link
                  href="/check"
                  className="bg-surface-container-lowest border border-outline-variant/80 text-on-surface px-6 py-3.5 rounded-xl text-label-lg font-medium inline-flex items-center justify-center gap-2 hover:border-primary-container transition-all"
                >
                  <span>{c.hero.ctaSecondary}</span>
                  <span className="text-outline" aria-hidden="true">
                    →
                  </span>
                </Link>
              </div>

              <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 pt-6 border-t border-outline-variant/40 w-full max-w-xl">
                <div className="flex items-center gap-2">
                  <BadgeCheck className="w-[18px] h-[18px] text-secondary" aria-hidden="true" />
                  <span className="text-label-sm text-on-surface-variant font-medium">
                    {c.hero.meta1}
                  </span>
                </div>
                <div className="h-3 w-px bg-outline-variant/60 hidden sm:block" aria-hidden="true" />
                <div className="flex items-center gap-2">
                  <Lock className="w-[18px] h-[18px] text-secondary" aria-hidden="true" />
                  <span className="text-label-sm text-on-surface-variant font-medium">
                    {c.hero.meta2}
                  </span>
                </div>
              </div>
            </div>

            {/* Hero visual — 5 cols, the "record" composition */}
            <div className="lg:col-span-5 w-full">
              <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-6 lg:p-7 shadow-sm relative">
                <div className="flex items-center justify-between pb-5 border-b border-outline-variant/40 mb-6">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded bg-secondary" aria-hidden="true" />
                    <span className="text-label-md uppercase tracking-wider text-on-surface font-bold">
                      {c.record.label}
                    </span>
                  </div>
                  <span className="text-label-sm px-2.5 py-0.5 rounded bg-surface-container font-mono text-on-surface-variant">
                    {c.record.version}
                  </span>
                </div>

                <div className="space-y-4">
                  {/* Step 1 — live scheme records */}
                  <div className="p-4 rounded-xl bg-surface border border-outline-variant/50 relative">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-6 h-6 shrink-0 rounded-full bg-primary-container text-surface flex items-center justify-center">
                          <ScrollText className="w-3.5 h-3.5" aria-hidden="true" />
                        </span>
                        <h3 className="text-title-md text-on-surface font-semibold truncate">
                          {c.record.step1Title}
                        </h3>
                      </div>
                      <CheckCircle2 className="w-5 h-5 text-secondary shrink-0" aria-hidden="true" />
                    </div>
                    <p className="text-body-sm text-on-surface-variant mt-2 pl-9">
                      {schemesLoading
                        ? c.record.step1DescLoading
                        : c.record.step1DescLive(count)}
                    </p>
                  </div>

                  <div className="flex justify-center -my-2 relative z-10" aria-hidden="true">
                    <div className="w-6 h-6 rounded-full bg-surface-container border border-outline-variant flex items-center justify-center">
                      <ArrowDown className="w-3.5 h-3.5 text-on-surface-variant" />
                    </div>
                  </div>

                  {/* Step 2 — privacy */}
                  <div className="p-4 rounded-xl bg-surface border border-outline-variant/50 relative">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-6 h-6 shrink-0 rounded-full bg-primary-container text-surface flex items-center justify-center">
                          <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                        </span>
                        <h3 className="text-title-md text-on-surface font-semibold truncate">
                          {c.record.step2Title}
                        </h3>
                      </div>
                      <ShieldCheck className="w-5 h-5 text-secondary shrink-0" aria-hidden="true" />
                    </div>
                    <p className="text-body-sm text-on-surface-variant mt-2 pl-9">
                      {c.record.step2Desc}
                    </p>
                  </div>

                  <div className="flex justify-center -my-2 relative z-10" aria-hidden="true">
                    <div className="w-6 h-6 rounded-full bg-surface-container border border-outline-variant flex items-center justify-center">
                      <ArrowDown className="w-3.5 h-3.5 text-on-surface-variant" />
                    </div>
                  </div>

                  {/* Step 3 — inverted highlight */}
                  <div className="p-4 rounded-xl bg-primary-container text-surface border border-deep-plum relative">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-6 h-6 shrink-0 rounded-full bg-tertiary-fixed text-primary-container flex items-center justify-center">
                          <BadgeCheck className="w-3.5 h-3.5" aria-hidden="true" />
                        </span>
                        <h3 className="text-title-md text-surface font-semibold truncate">
                          {c.record.step3Title}
                        </h3>
                      </div>
                      <span className="text-label-sm px-2 py-0.5 rounded bg-tertiary-fixed text-primary-container font-bold uppercase tracking-wider shrink-0">
                        {c.record.step3Chip}
                      </span>
                    </div>
                    <p className="text-body-sm text-on-primary-container mt-2 pl-9">
                      {c.record.step3Desc}
                    </p>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-outline-variant/40 flex items-center justify-between text-on-surface-variant gap-3">
                  <span className="text-label-sm flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary" aria-hidden="true" />
                    {c.record.ledgerLeft}
                  </span>
                  <span className="text-label-sm font-mono text-secondary font-semibold">
                    {c.record.ledgerRight}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ DESTINATIONS ═══════════════ */}
      <section
        className="w-full bg-surface py-space-xl lg:py-24"
        id="destinations"
        aria-labelledby="destinations-heading"
      >
        <div className="max-w-[1440px] mx-auto px-margin-mobile lg:px-margin">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4 pb-6 border-b border-outline-variant/60">
            <div>
              <span className="text-label-md uppercase tracking-wider text-secondary font-bold">
                {c.dest.eyebrow}
              </span>
              <h2
                id="destinations-heading"
                className="text-headline-lg-mobile lg:text-headline-lg text-on-surface font-bold mt-1"
              >
                {c.dest.heading}
              </h2>
              <p
                className={`text-title-md text-on-surface-variant mt-1 ${kn ? '' : 'font-kannada'}`}
              >
                {c.dest.headingSub}
              </p>
            </div>
            <p className="text-body-md text-on-surface-variant max-w-md">{c.dest.intro}</p>
          </div>

          {/* Asymmetric mosaic — 7/5, 5/7 */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* TILE 1 — Government support (aubergine anchor) */}
            <div className="lg:col-span-7 bg-primary-container text-surface rounded-2xl p-7 lg:p-9 flex flex-col justify-between border border-deep-plum shadow-sm relative overflow-hidden group">
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2 h-2 rounded-full bg-tertiary-fixed" aria-hidden="true" />
                  <span className="text-label-sm uppercase tracking-wider text-outline-variant font-semibold">
                    {c.tile1.eyebrow}
                  </span>
                </div>
                <h3 className="text-headline-md font-bold text-surface mb-3">{c.tile1.title}</h3>
                <p className="text-body-md text-on-primary-container max-w-xl leading-relaxed mb-6">
                  {c.tile1.desc}
                </p>

                {/* Live scheme chips */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-8">
                  {schemesLoading ? (
                    <>
                      <div className="bg-deep-plum p-4 rounded-xl border border-white/10 h-[76px] animate-pulse motion-reduce:animate-none" />
                      <div className="bg-deep-plum p-4 rounded-xl border border-white/10 h-[76px] animate-pulse motion-reduce:animate-none" />
                    </>
                  ) : schemes.length > 0 ? (
                    schemes.slice(0, 2).map((scheme) => (
                      <div
                        key={scheme.id}
                        className="bg-deep-plum p-4 rounded-xl border border-white/10 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="text-label-sm text-on-primary-container font-medium truncate">
                            {c.tile1.chipLabel}: {scheme.targetGroups.slice(0, 2).map((g) => targetGroupLabel(g, kn ? 'kn' : 'en')).join(', ') || '—'}
                          </div>
                          <div className="text-title-lg font-bold text-surface mt-0.5 truncate">
                            {kn ? scheme.nameKn : scheme.nameEn}
                          </div>
                        </div>
                        <CheckCircle2 className="w-5 h-5 text-tertiary-fixed shrink-0" aria-hidden="true" />
                      </div>
                    ))
                  ) : (
                    <div className="bg-deep-plum p-4 rounded-xl border border-white/10 sm:col-span-2">
                      <p className="text-body-sm text-on-primary-container">{c.tile1.empty}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="relative z-10 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                <span className="text-label-md text-on-primary-container">{c.tile1.meta}</span>
                <Link
                  href="/schemes"
                  className="inline-flex items-center gap-2 text-label-lg font-semibold text-surface group-hover:text-tertiary-fixed transition-colors"
                >
                  <span>{c.tile1.cta}</span>
                  <span
                    className="text-tertiary-fixed text-lg font-bold group-hover:translate-x-1 transition-transform motion-reduce:transition-none"
                    aria-hidden="true"
                  >
                    →
                  </span>
                </Link>
              </div>
            </div>

            {/* TILE 2 — Scam inspector */}
            <div className="lg:col-span-5 bg-surface-container-lowest text-on-surface rounded-2xl p-7 lg:p-9 flex flex-col justify-between border border-outline-variant shadow-sm relative group">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2 h-2 rounded-full bg-error" aria-hidden="true" />
                  <span className="text-label-sm uppercase tracking-wider text-error font-bold">
                    {c.tile2.eyebrow}
                  </span>
                </div>
                <h3 className="text-headline-md font-bold text-on-surface mb-3">{c.tile2.title}</h3>
                <p className="text-body-md text-on-surface-variant leading-relaxed mb-6">
                  {c.tile2.desc}
                </p>

                <div className="p-4 rounded-xl bg-error-container/40 border border-error/30 mb-8">
                  <div className="flex items-start gap-2.5">
                    <ShieldAlert className="w-5 h-5 text-error shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <span className="text-label-sm font-bold text-on-error-container uppercase">
                        {c.tile2.insetLabel}
                      </span>
                      <p className="text-body-sm text-on-error-container mt-1">
                        {c.tile2.insetText}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-outline-variant/60 flex flex-wrap items-center justify-between gap-3">
                <span className="text-label-sm text-on-surface-variant font-mono">
                  {c.tile2.meta}
                </span>
                <Link
                  href="/check"
                  className="inline-flex items-center gap-2 text-label-lg font-semibold text-on-surface group-hover:text-error transition-colors"
                >
                  <span>{c.tile2.cta}</span>
                  <span
                    className="text-error text-lg font-bold group-hover:translate-x-1 transition-transform motion-reduce:transition-none"
                    aria-hidden="true"
                  >
                    →
                  </span>
                </Link>
              </div>
            </div>

            {/* TILE 3 — Loan cost (deep teal) */}
            <div className="lg:col-span-5 bg-secondary text-on-secondary rounded-2xl p-7 lg:p-9 flex flex-col justify-between border border-secondary shadow-sm relative group">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2 h-2 rounded-full bg-tertiary-fixed" aria-hidden="true" />
                  <span className="text-label-sm uppercase tracking-wider text-secondary-fixed font-semibold">
                    {c.tile3.eyebrow}
                  </span>
                </div>
                <h3 className="text-headline-md font-bold text-on-secondary mb-3">
                  {c.tile3.title}
                </h3>
                <p className="text-body-md text-surface/90 leading-relaxed mb-6">{c.tile3.desc}</p>

                <div className="bg-black/20 p-4 rounded-xl border border-white/15 mb-8">
                  <span className="text-label-sm font-bold uppercase tracking-wider text-tertiary-fixed">
                    {c.tile3.exLabel}
                  </span>
                  <div className="flex items-center justify-between text-body-sm mt-1 gap-3">
                    <div>
                      <div className="text-label-sm text-surface/70">{c.tile3.leftLabel}</div>
                      <div className="text-title-md font-semibold text-surface">
                        {c.tile3.leftValue}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-label-sm text-surface/70">{c.tile3.rightLabel}</div>
                      <div className="text-title-lg font-bold text-tertiary-fixed">
                        {c.tile3.rightValue}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/15 flex flex-wrap items-center justify-between gap-3">
                <span className="text-label-sm text-surface/80">{c.tile3.meta}</span>
                <Link
                  href="/loan"
                  className="inline-flex items-center gap-2 text-label-lg font-semibold text-on-secondary group-hover:text-tertiary-fixed transition-colors"
                >
                  <span>{c.tile3.cta}</span>
                  <span
                    className="text-tertiary-fixed text-lg font-bold group-hover:translate-x-1 transition-transform motion-reduce:transition-none"
                    aria-hidden="true"
                  >
                    →
                  </span>
                </Link>
              </div>
            </div>

            {/* TILE 4 — Ask GramFinance */}
            <div className="lg:col-span-7 bg-surface-container-lowest text-on-surface rounded-2xl p-7 lg:p-9 flex flex-col justify-between border border-outline-variant shadow-sm group">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2 h-2 rounded-full bg-secondary" aria-hidden="true" />
                  <span className="text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">
                    {c.tile4.eyebrow}
                  </span>
                </div>
                <h3 className="text-headline-md font-bold text-on-surface mb-3">{c.tile4.title}</h3>
                <p className="text-body-md text-on-surface-variant max-w-xl leading-relaxed mb-6">
                  {c.tile4.desc}
                </p>

                <div className="flex flex-col sm:flex-row flex-wrap gap-2.5 mb-8">
                  {c.tile4.pills.map((pill) => (
                    <Link
                      key={pill}
                      href="/assistant"
                      className="text-left px-3.5 py-2 rounded-lg bg-surface border border-outline-variant hover:border-primary-container transition-all text-body-sm"
                    >
                      {pill}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-outline-variant/60 flex flex-wrap items-center justify-between gap-3">
                <span className="text-label-sm text-on-surface-variant">{c.tile4.meta}</span>
                <Link
                  href="/assistant"
                  className="inline-flex items-center gap-2 text-label-lg font-semibold text-on-surface group-hover:text-secondary transition-colors"
                >
                  <span>{c.tile4.cta}</span>
                  <span
                    className="text-on-surface text-lg font-bold group-hover:translate-x-1 transition-transform motion-reduce:transition-none"
                    aria-hidden="true"
                  >
                    →
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ DECISION TRANSPARENCY ═══════════════ */}
      <section
        className="w-full bg-surface-container-low py-space-xl lg:py-24 border-y border-outline-variant/50"
        aria-labelledby="transparency-heading"
      >
        <div className="max-w-[1440px] mx-auto px-margin-mobile lg:px-margin">
          <div className="max-w-3xl mb-12">
            <span className="text-label-md uppercase tracking-wider text-secondary font-bold">
              {c.transparency.eyebrow}
            </span>
            <h2
              id="transparency-heading"
              className="text-headline-lg-mobile lg:text-headline-lg text-on-surface font-bold mt-1"
            >
              {c.transparency.heading}
            </h2>
            <p className="text-body-lg text-on-surface-variant mt-3 leading-relaxed">
              {c.transparency.lead}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Decision card — live scheme record */}
            <div className="lg:col-span-7 bg-surface-container-lowest rounded-2xl border border-outline-variant p-7 lg:p-8 flex flex-col justify-between shadow-sm">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-outline-variant/50 mb-6">
                  <div className="min-w-0">
                    <span className="text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
                      {c.transparency.cardEyebrow}
                    </span>
                    <h3 className="text-title-lg text-on-surface font-bold mt-0.5">
                      {schemesLoading
                        ? c.transparency.loading
                        : featured
                        ? featuredName
                        : c.transparency.empty}
                    </h3>
                  </div>
                  <div className="text-left sm:text-right shrink-0">
                    <span className="text-label-sm text-on-surface-variant uppercase">
                      {c.transparency.cardAmountLabel}
                    </span>
                    <div className="text-headline-sm text-secondary font-bold">
                      {featured ? formatDate(featured.lastVerified, locale) : '—'}
                    </div>
                  </div>
                </div>

                {featured && (
                  <>
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-secondary text-on-secondary mb-6">
                      <CheckCircle2 className="w-4 h-4 text-tertiary-fixed" aria-hidden="true" />
                      <span className="text-label-sm font-semibold tracking-wide">
                        {c.transparency.activePill}
                      </span>
                    </div>

                    <div className="space-y-4 mb-6">
                      <div className="flex items-start gap-3 p-3.5 rounded-xl bg-surface border border-outline-variant/50">
                        <BadgeCheck className="w-5 h-5 text-secondary shrink-0 mt-0.5" aria-hidden="true" />
                        <div>
                          <div className="text-label-md text-on-surface font-bold">
                            {c.transparency.checkWho}
                          </div>
                          <p className="text-body-sm text-on-surface-variant mt-0.5">
                            {featured.targetGroups.length > 0
                              ? featured.targetGroups.map((g) => targetGroupLabel(g, kn ? 'kn' : 'en')).join(', ')
                              : c.transparency.noGroups}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3.5 rounded-xl bg-surface border border-outline-variant/50">
                        <BadgeCheck className="w-5 h-5 text-secondary shrink-0 mt-0.5" aria-hidden="true" />
                        <div>
                          <div className="text-label-md text-on-surface font-bold">
                            {c.transparency.checkWhere}
                          </div>
                          <p className="text-body-sm text-on-surface-variant mt-0.5">
                            {featured.states.length > 0
                              ? featured.states.join(', ')
                              : c.transparency.allStates}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3.5 rounded-xl bg-surface border border-outline-variant/50">
                        <BadgeCheck className="w-5 h-5 text-secondary shrink-0 mt-0.5" aria-hidden="true" />
                        <div>
                          <div className="text-label-md text-on-surface font-bold">
                            {c.transparency.checkWhen}
                          </div>
                          <p className="text-body-sm text-on-surface-variant mt-0.5">
                            {formatDate(featured.lastVerified, locale)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <div className="p-4 rounded-xl bg-surface-container border border-outline-variant text-on-surface-variant">
                  <div className="flex items-start gap-2.5">
                    <Info className="w-5 h-5 text-secondary shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <span className="text-label-sm font-bold text-on-surface uppercase">
                        {c.transparency.infoLabel}
                      </span>
                      <p className="text-body-sm text-on-surface-variant mt-0.5">
                        {c.transparency.infoText}
                      </p>
                    </div>
                  </div>
                </div>

                {featured && (
                  <Link
                    href={`/schemes/${featured.id}`}
                    className="inline-flex items-center gap-2 mt-5 text-label-lg font-semibold text-primary-container hover:text-secondary transition-colors"
                  >
                    <span>{c.transparency.cardCta}</span>
                    <span aria-hidden="true">→</span>
                  </Link>
                )}
              </div>
            </div>

            {/* Photo + metrics — 5 cols */}
            <div className="lg:col-span-5 flex flex-col justify-between gap-6">
              <div className="w-full h-72 sm:h-80 rounded-2xl overflow-hidden border border-outline-variant relative shadow-sm">
                <Image
                  src="/images/shop-owner.webp"
                  alt={c.transparency.photoAlt}
                  fill
                  sizes="(max-width: 1024px) 100vw, 40vw"
                  className="object-cover"
                />
                <div className="absolute bottom-3 left-3 bg-primary-container/90 backdrop-blur-sm text-surface px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-tertiary-fixed" aria-hidden="true" />
                  <span className="text-label-sm font-medium">{c.transparency.photoOverlay}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-sm text-center">
                <div className="border-r border-outline-variant/60 pr-2">
                  <div className="text-headline-sm text-on-surface font-bold">100%</div>
                  <div className="text-label-sm text-on-surface-variant mt-1">
                    {c.transparency.m1l}
                  </div>
                </div>
                <div className="border-r border-outline-variant/60 px-2">
                  <div className="text-headline-sm text-secondary font-bold">₹0</div>
                  <div className="text-label-sm text-on-surface-variant mt-1">
                    {c.transparency.m2l}
                  </div>
                </div>
                <div className="pl-2">
                  <div className="text-headline-sm text-on-surface font-bold">0</div>
                  <div className="text-label-sm text-on-surface-variant mt-1">
                    {c.transparency.m3l}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ TRUST MANIFESTO ═══════════════ */}
      <section
        className="w-full bg-primary-container text-surface py-space-xl lg:py-24 border-b border-outline-variant/20 relative"
        aria-labelledby="trust-heading"
      >
        <div className="max-w-[1440px] mx-auto px-margin-mobile lg:px-margin">
          <div className="max-w-3xl mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary-fixed" aria-hidden="true" />
              <span className="text-label-sm uppercase tracking-wider text-surface">
                {c.trust.pill}
              </span>
            </div>
            <h2
              id="trust-heading"
              className="text-headline-xl-mobile lg:text-[44px] lg:leading-[52px] font-bold text-surface"
            >
              {c.trust.heading}
            </h2>
            <p className="text-body-lg text-on-primary-container mt-4 leading-relaxed">
              {c.trust.lead}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-16 border-b border-white/10">
            {[
              {
                n: '01',
                t: c.trust.p1t,
                d: c.trust.p1d,
                m: c.trust.p1m,
                Icon: BadgeCheck,
              },
              {
                n: '02',
                t: c.trust.p2t,
                d: c.trust.p2d,
                m: c.trust.p2m,
                Icon: Code,
              },
              {
                n: '03',
                t: c.trust.p3t,
                d: c.trust.p3d,
                m: c.trust.p3m,
                Icon: ShieldCheck,
              },
            ].map(({ n, t, d, m, Icon }) => (
              <div key={n} className="flex flex-col justify-between">
                <div>
                  <div className="font-mono text-tertiary-fixed font-bold text-headline-sm mb-3">
                    {n}
                  </div>
                  <h3 className="text-title-lg font-bold text-surface mb-3">{t}</h3>
                  <p className="text-body-md text-on-primary-container leading-relaxed">{d}</p>
                </div>
                <div className="mt-6 flex items-center gap-2 text-label-sm text-outline-variant">
                  <Icon className="w-4 h-4 text-tertiary-fixed" aria-hidden="true" />
                  <span>{m}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ScrollText className="w-6 h-6 text-tertiary-fixed shrink-0" aria-hidden="true" />
              <span className="text-body-sm text-surface font-medium">{c.trust.endorse}</span>
            </div>
            <div className="flex items-center gap-2 text-label-sm text-on-primary-container font-mono">
              <span>{c.trust.license}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ CLOSING INVITATION ═══════════════ */}
      <section className="w-full bg-surface py-space-xl lg:py-24" aria-labelledby="closing-heading">
        <div className="max-w-[1440px] mx-auto px-margin-mobile lg:px-margin">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            {/* Intro — 5 cols */}
            <div className="lg:col-span-5">
              <span className="text-label-md uppercase tracking-wider text-secondary font-bold">
                {c.closing.eyebrow}
              </span>
              <h2
                id="closing-heading"
                className="text-headline-lg-mobile lg:text-headline-lg text-on-surface font-bold mt-1"
              >
                {c.closing.heading}
              </h2>
              <p
                className={`text-title-md text-on-surface-variant mt-1 mb-4 ${kn ? '' : 'font-kannada'}`}
              >
                {c.closing.headingSub}
              </p>
              <p className="text-body-md text-on-surface-variant leading-relaxed mb-6">
                {c.closing.lead}
              </p>
              <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/70 text-on-surface-variant inline-flex items-center gap-3">
                <UserX className="w-5 h-5 text-secondary shrink-0" aria-hidden="true" />
                <span className="text-body-sm">{c.closing.noAccount}</span>
              </div>
            </div>

            {/* Gateway rows — 7 cols */}
            <div className="lg:col-span-7 bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-sm divide-y divide-outline-variant/60">
              {c.closing.rows.map((row, i) => (
                <Link
                  key={row.href}
                  href={row.href}
                  className={`p-6 flex items-center justify-between group hover:bg-surface-container-low transition-colors gap-4 ${
                    i === 0 ? 'rounded-t-2xl' : ''
                  } ${i === c.closing.rows.length - 1 ? 'rounded-b-2xl' : ''}`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="font-mono text-label-md text-on-surface-variant font-bold shrink-0">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div className="min-w-0">
                      <div className="text-title-md text-on-surface font-semibold group-hover:text-primary-container transition-colors">
                        {row.t}
                      </div>
                      <div className="text-body-sm text-on-surface-variant">{row.d}</div>
                    </div>
                  </div>
                  <span
                    className="text-on-surface-variant group-hover:text-primary-container group-hover:translate-x-1.5 transition-all motion-reduce:transition-none text-xl font-bold shrink-0"
                    aria-hidden="true"
                  >
                    →
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Footnote */}
          <div className="mt-16 pt-6 border-t border-outline-variant/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <p className="text-body-sm text-on-surface-variant">{c.closing.footnote}</p>
            <div className="flex items-center gap-2 font-mono text-label-sm text-secondary font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary" aria-hidden="true" />
              <span>{c.closing.chip}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
