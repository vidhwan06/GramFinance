'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/common/LoadingState';
import type { SchemeListItem } from '@/features/schemes/schemes-service';
import {
  BookOpen,
  ShieldAlert,
  Calculator,
  Landmark,
  MessageSquare,
  Globe,
  ArrowRight,
  Scale,
  ShieldCheck,
  Info,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Target-group label mapping — internal values → polished presentation labels
// ---------------------------------------------------------------------------
const TARGET_GROUP_LABELS: Record<string, string> = {
  woman: 'Women',
  women: 'Women',
  poor_household: 'Poor households',
  poorhousehold: 'Poor households',
  artisans: 'Artisans',
  craftspeople: 'Craftspeople',
  traditional_trades: 'Traditional trades',
  farmer: 'Farmers',
  farmers: 'Farmers',
};

function getGroupLabel(internalValue: string): string {
  return TARGET_GROUP_LABELS[internalValue] ?? internalValue;
}

// ---------------------------------------------------------------------------
// Icons for each capability
// ---------------------------------------------------------------------------
const capabilityIcons: Record<string, React.ElementType> = {
  learn: BookOpen,
  check: ShieldAlert,
  understand: Calculator,
  find: Landmark,
  ask: MessageSquare,
  language: Globe,
};

// ---------------------------------------------------------------------------
// Capability data — numbered, matches the six main product capabilities
// ---------------------------------------------------------------------------
const CAPABILITIES = [
  { num: '01', key: 'learn', href: '/learn', icon: 'learn' },
  { num: '02', key: 'check', href: '/check', icon: 'check' },
  { num: '03', key: 'understand', href: '/loan', icon: 'understand' },
  { num: '04', key: 'find', href: '/schemes', icon: 'find' },
  { num: '05', key: 'ask', href: '/assistant', icon: 'ask' },
  { num: '06', key: 'language', href: '/language', icon: 'language' },
];

// ---------------------------------------------------------------------------
// Home page
// ---------------------------------------------------------------------------
export default function HomePage() {
  const { t, language } = useLanguage();
  const kn = language === 'kn';
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
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-paper">
      {/* ──────────────────── HERO ──────────────────── */}
      <section className="border-b border-rule" aria-label="Hero">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* LEFT */}
            <div className="space-y-6">
              <div className="inline-flex items-center rounded border border-rule bg-white px-2.5 py-1 text-xs font-semibold text-muted-ink">
                <Scale className="h-3 w-3 mr-1 text-seal-red" aria-hidden="true" />
                Financial companion
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-ink leading-tight">
                {t.home.heroTitle}
              </h1>
              <p className="text-base text-muted-ink leading-relaxed max-w-lg">
                {t.home.heroSubtitle}
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Link href="/loan">
                  <Button variant="primary" size="lg">
                    Understand a loan
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Button>
                </Link>
                <Link href="/check">
                  <Button variant="outline" size="lg">
                    Check a message
                  </Button>
                </Link>
              </div>
            </div>

            {/* RIGHT — Product record preview */}
            <div className="order-first lg:order-last">
              <div className="rounded border border-rule bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Scale className="h-4 w-4 text-seal-red" aria-hidden="true" />
                  <span className="text-sm font-bold text-ink">GRAMFINANCE</span>
                </div>
                <p className="text-xs text-muted-ink mb-4">Financial clarity for everyday life</p>

                <div className="border-t border-rule pt-3 mb-3">
                  <p className="text-xs font-semibold text-ink mb-2">WHAT WOULD YOU LIKE HELP WITH?</p>
                  <div className="space-y-1.5">
                    {[
                      { href: '/check', label: 'Check a message', icon: ShieldAlert },
                      { href: '/loan', label: 'Understand a loan', icon: Calculator },
                      { href: '/schemes', label: 'Find support', icon: Landmark },
                      { href: '/learn', label: 'Learn', icon: BookOpen },
                    ].map(({ href, label, icon: Icon }) => (
                      <Link
                        key={href}
                        href={href}
                        className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-paper transition-colors text-sm text-ink hover:text-seal-red focus:outline-none focus:ring-1 focus:ring-seal-red"
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        {label}
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Compact financial record */}
                <div className="border-t border-rule pt-3">
                  <p className="text-xs font-semibold text-ink mb-2">LOAN RECORD</p>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-ink">Principal</span>
                      <span className="font-semibold text-ink">₹50,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-ink">Rate</span>
                      <span className="font-semibold text-ink">8.5%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-ink">Tenure</span>
                      <span className="font-semibold text-ink">12 months</span>
                    </div>
                    <div className="flex justify-between border-t border-rule pt-1.5">
                      <span className="font-semibold text-ink">EMI</span>
                      <span className="font-bold text-seal-red">₹4,348</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────── SIX CAPABILITIES ──────────── */}
      <section className="border-b border-rule bg-white" aria-labelledby="capabilities-heading">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="space-y-2 mb-10">
            <h2 id="capabilities-heading" className="text-xl sm:text-2xl font-bold text-ink">
              {t.home.capabilities.heading}
            </h2>
            <p className="text-sm text-muted-ink">
              {t.home.capabilities.subtitle}
            </p>
          </div>

          <div className="divide-y divide-rule">
            {CAPABILITIES.map(({ num, key, href, icon }) => {
              const Icon = capabilityIcons[icon];
              const capLabel = t.home.capabilities[icon as keyof typeof t.home.capabilities] as { title: string; desc: string } | undefined;
              return (
                <Link
                  key={key}
                  href={href}
                  className="flex items-start gap-4 py-4 hover:bg-paper/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-seal-red -mx-2 px-2 rounded"
                >
                  <span className="text-sm font-bold text-rule shrink-0 w-8" aria-hidden="true">{num}</span>
                  <div className="p-2 rounded border border-rule bg-paper text-ink shrink-0">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-ink">{capLabel?.title ?? key}</h3>
                    <p className="text-sm text-muted-ink leading-relaxed">{capLabel?.desc ?? ''}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ──── DIFFERENT QUESTIONS ──── */}
      <section className="border-b border-rule" aria-labelledby="questions-heading">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="space-y-2 mb-8">
            <h2 id="questions-heading" className="text-xl font-bold text-ink">
              {t.home.questions.heading}
            </h2>
            <p className="text-sm text-muted-ink">
              {t.home.questions.subtitle}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { href: '/learn', label: 'Start learning', icon: BookOpen },
              { href: '/check', label: 'Check a message', icon: ShieldAlert },
              { href: '/loan', label: 'Understand a loan', icon: Calculator },
              { href: '/schemes', label: 'Find support', icon: Landmark },
              { href: '/assistant', label: 'Ask GramFinance', icon: MessageSquare },
            ].map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="inline-flex items-center gap-2 rounded border border-rule bg-white px-3 py-2 text-sm font-medium text-ink hover:border-seal-red hover:text-seal-red transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-seal-red min-h-[44px]"
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────── GOVERNMENT SUPPORT ──────────── */}
      <section className="border-b border-rule bg-white" aria-labelledby="gov-heading">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="space-y-2 mb-8">
            <h2 id="gov-heading" className="text-xl font-bold text-ink">
              {t.home.governmentSupport.heading}
            </h2>
            <p className="text-sm text-muted-ink max-w-xl">
              {t.home.governmentSupport.subtitle}
            </p>
          </div>

          {schemesLoading ? (
            <LoadingState message={kn ? 'ಯೋಜನೆಗಳು ಲೋಡ್ ಆಗುತ್ತಿವೆ...' : 'Loading schemes...'} />
          ) : schemes.length > 0 ? (
            <div className="space-y-3">
              {schemes.slice(0, 4).map((scheme) => (
                <Link
                  key={scheme.id}
                  href={`/schemes/${scheme.id}`}
                  className="block border border-rule bg-white p-4 hover:border-seal-red/30 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-seal-red"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-base font-bold text-ink">
                        {language === 'kn' ? scheme.nameKn : scheme.nameEn}
                      </h3>
                      <p className="text-sm text-muted-ink mt-0.5 line-clamp-2">
                        {language === 'kn' ? scheme.descriptionKn : scheme.descriptionEn}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-rule shrink-0 mt-0.5" aria-hidden="true" />
                  </div>
                  {scheme.targetGroups.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {scheme.targetGroups.slice(0, 4).map((group) => (
                        <Badge key={group} variant="neutral">{getGroupLabel(group)}</Badge>
                      ))}
                    </div>
                  )}
                </Link>
              ))}
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-muted-ink">{t.home.governmentSupport.disclaimer}</p>
                <Link href="/schemes" className="inline-flex items-center gap-1.5 text-sm font-semibold text-seal-red hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-seal-red">
                  {t.home.governmentSupport.viewAll}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="border border-rule bg-white p-6 text-center">
              <p className="text-sm text-muted-ink">{t.home.governmentSupport.disclaimer}</p>
            </div>
          )}
        </div>
      </section>

      {/* ──────────────────── EXPLAINABILITY ──────────────────── */}
      <section className="border-b border-rule bg-white" aria-labelledby="explain-heading">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="space-y-2 mb-8">
            <h2 id="explain-heading" className="text-xl font-bold text-ink">
              {t.home.explainability.heading}
            </h2>
            <p className="text-sm text-muted-ink">
              {t.home.explainability.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: Scale, label: t.home.explainability.whatWasConsidered },
              { icon: ShieldCheck, label: t.home.explainability.whatWasKnown },
              { icon: Info, label: t.home.explainability.whatWasUnknown },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="border border-rule bg-paper p-4">
                <Icon className="h-6 w-6 text-ink mb-2" aria-hidden="true" />
                <h3 className="text-sm font-bold text-ink mb-1">{label}</h3>
                <p className="text-xs text-muted-ink leading-relaxed">
                  {label === t.home.explainability.whatWasConsidered && kn
                    ? 'ನಿಮ್ಮ ವಯಸ್ಸು, ಆದಾಯ, ರಾಜ್ಯ ಮತ್ತು ಯೋಜನೆಯ ನಿಯಮಗಳು.'
                    : label === t.home.explainability.whatWasKnown && kn
                    ? 'ನೀವು ನಮೂದಿಸಿದ ಮಾಹಿತಿ ಮತ್ತು ಯೋಜನೆಯ ಸಾಕ್ಷ್ಯಗಳು.'
                    : kn
                    ? 'ನಿಮ್ಮನ್ನು ಪೂರ್ಣವಾಗಿ ಅರ್ಹವಾಗುವುದನ್ನು ನಿರ್ಧರಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ.'
                    : label === t.home.explainability.whatWasConsidered
                    ? 'Your age, income, state, and scheme rules.'
                    : label === t.home.explainability.whatWasKnown
                    ? 'The information you provided and the scheme evidence.'
                    : 'What would be needed to make a fuller determination.'}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 border border-rule bg-white p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-seal-red shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <h3 className="text-sm font-bold text-ink mb-1">{t.home.explainability.why}</h3>
                <p className="text-sm text-muted-ink leading-relaxed">
                  {kn
                    ? 'GramFinance ನಿಮ್ಮ ಮಾಹಿತಿಯ ಆಧಾರದ ಮೇಲೆ ಅಂದಾಜು ಮಾಡುತ್ತದೆ. ಅದು ಅನುಮೋದನೆ ಮಾಡುವುದಿಲ್ಲ. ಅಂತಿಮ ಅರ್ಹತೆ ಸಂಬಂಧಿತ ಅಧಿಕಾರಿಗಳು ಪರಿಶೀಲಿಸುತ್ತಾರೆ.'
                    : 'GramFinance estimates based on your information. It does not grant approval. Final eligibility is verified by the relevant authorities.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────── TRUST / PRODUCT BOUNDARIES ──────────────── */}
      <section className="border-b border-rule" aria-labelledby="trust-heading">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="space-y-2 mb-8">
            <h2 id="trust-heading" className="text-xl font-bold text-ink">
              {t.home.trust.heading}
            </h2>
            <p className="text-sm text-muted-ink">
              {t.home.trust.subheading}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-rule bg-paper p-5">
              <h3 className="text-sm font-bold text-eligible mb-3">{t.home.trust.is}</h3>
              <ul className="space-y-2">
                {(kn ? t.home.trust.isList : t.home.trust.isList).map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-ink leading-relaxed">
                    <span className="text-eligible shrink-0" aria-hidden="true">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="border border-rule bg-paper p-5">
              <h3 className="text-sm font-bold text-muted-ink mb-3">{t.home.trust.isNot}</h3>
              <ul className="space-y-2">
                {(kn ? t.home.trust.isNotList : t.home.trust.isNotList).map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-ink leading-relaxed">
                    <span className="text-muted-ink shrink-0" aria-hidden="true">—</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────── FINAL CTA ──────────────── */}
      <section className="border-b border-rule bg-ink text-paper" aria-labelledby="cta-heading">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 text-center">
          <h2 id="cta-heading" className="text-2xl sm:text-3xl font-bold text-paper mb-3">
            {t.home.cta.heading}
          </h2>
          <p className="text-sm text-paper/70 mb-8 max-w-xl mx-auto leading-relaxed">
            {t.home.cta.subheading}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/learn">
              <Button variant="outline" size="lg">
                Start learning
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Button>
            </Link>
            <Link href="/check">
              <Button variant="outline" size="lg">
                Check a message
              </Button>
            </Link>
            <Link href="/loan">
              <Button variant="outline" size="lg">
                Understand a loan
              </Button>
            </Link>
            <Link href="/schemes">
              <Button variant="outline" size="lg">
                Find support
              </Button>
            </Link>
            <Link href="/assistant">
              <Button variant="outline" size="lg">
                Ask GramFinance
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ──────────────── FOOTER ──────────────── */}
      <footer className="border-t border-rule bg-paper" role="contentinfo">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-6">
            <div>
              <p className="text-sm font-bold text-ink">{t.appName}</p>
              <p className="text-xs text-muted-ink mt-0.5">{t.appTagline}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-ink mb-2">Explore</p>
              <ul className="space-y-1">
                {['learn', 'check', 'loan'].map((key) => (
                  <li key={key}>
                    <Link href={key === 'learn' ? '/learn' : key === 'check' ? '/check' : '/loan'} className="text-xs text-muted-ink hover:text-seal-red transition-colors">
                      {t.nav[key as keyof typeof t.nav]}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold text-ink mb-2">Information</p>
              <ul className="space-y-1">
                <li><Link href="/schemes" className="text-xs text-muted-ink hover:text-seal-red transition-colors">{t.nav.schemes}</Link></li>
                <li><Link href="/assistant" className="text-xs text-muted-ink hover:text-seal-red transition-colors">{t.nav.assistant}</Link></li>
                <li><Link href="/feedback" className="text-xs text-muted-ink hover:text-seal-red transition-colors">{t.nav.feedback}</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold text-ink mb-2">Language</p>
              <p className="text-xs text-muted-ink">English</p>
              <p className="text-xs text-muted-ink">ಕನ್ನಡ</p>
            </div>
          </div>
          <div className="pt-4 border-t border-rule">
            <p className="text-xs text-seal-red">{t.common.helplineNotice}</p>
            <p className="text-xs text-muted-ink mt-1">{t.home.footer.tagline}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
