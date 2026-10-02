'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { Lock, Shield } from 'lucide-react';

/**
 * Stitch footer: full-bleed aubergine band, lime shield mark, four columns
 * (brand / Products / Transparency / Language & Civic Access) and a bottom bar
 * carrying the copyright and the "Zero Tracking" badge.
 *
 * The language column doubles as the mobile language switch and the helpline
 * notice keeps 1930 visible site-wide.
 */
export function SiteFooter() {
  const { t, language, setLanguage } = useLanguage();

  const productLinks = [
    { href: '/schemes', label: t.nav.schemes },
    { href: '/check', label: t.nav.check },
    { href: '/loan', label: t.nav.loan },
    { href: '/assistant', label: t.nav.assistant },
  ];

  return (
    <footer
      className="w-full bg-primary-container text-inverse-on-surface border-t border-outline-variant/20 pt-space-xl pb-24 md:pb-space-lg"
      role="contentinfo"
    >
      <div className="max-w-[1440px] mx-auto px-margin-mobile lg:px-margin">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-xl pb-space-xl border-b border-white/10">
          {/* Brand column */}
          <div>
            <div className="flex items-center gap-space-sm mb-space-md">
              <span
                className="w-7 h-7 rounded bg-tertiary-fixed flex items-center justify-center shrink-0"
                aria-hidden="true"
              >
                <Shield className="w-4 h-4 text-primary-container" />
              </span>
              <span className="text-title-md text-inverse-on-surface">
                {t.footer.brandTitle}
              </span>
            </div>
            <p className="text-body-sm text-on-primary-container leading-relaxed">
              {t.footer.brandDesc}
            </p>
            <div className="mt-space-md inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
              <span
                className="w-1.5 h-1.5 rounded-full bg-tertiary-fixed"
                aria-hidden="true"
              />
              <span className="text-label-sm text-inverse-on-surface">
                {t.footer.ledgerBadge}
              </span>
            </div>
          </div>

          {/* Products */}
          <div>
            <h4 className="text-title-md text-inverse-on-surface mb-space-md">
              {t.footer.products}
            </h4>
            <ul className="space-y-space-sm text-body-sm">
              {productLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-on-primary-container hover:text-inverse-on-surface transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Transparency */}
          <div>
            <h4 className="text-title-md text-inverse-on-surface mb-space-md">
              {t.footer.transparency}
            </h4>
            <ul className="space-y-space-sm text-body-sm">
              {t.footer.transparencyItems.map((item) => (
                <li key={item} className="text-on-primary-container">
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Language & Civic Access */}
          <div>
            <h4 className="text-title-md text-inverse-on-surface mb-space-md">
              {t.footer.access}
            </h4>
            <ul className="space-y-space-sm text-body-sm">
              <li>
                <button
                  onClick={() => setLanguage('en')}
                  className="text-on-primary-container hover:text-inverse-on-surface transition-colors"
                  aria-pressed={language === 'en'}
                >
                  {t.common.english}
                </button>
              </li>
              <li>
                <button
                  onClick={() => setLanguage('kn')}
                  className="text-on-primary-container hover:text-inverse-on-surface transition-colors font-kannada"
                  aria-pressed={language === 'kn'}
                >
                  {t.common.kannada}
                </button>
              </li>
              <li>
                <Link
                  href="/feedback"
                  className="text-on-primary-container hover:text-inverse-on-surface transition-colors"
                >
                  {t.nav.feedback}
                </Link>
              </li>
              <li className="text-on-primary-container">{t.common.helplineNotice}</li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-space-lg flex flex-col md:flex-row items-center justify-between gap-space-md">
          <p className="text-body-sm text-on-primary-container text-center md:text-left">
            {t.footer.copyright}
          </p>
          <div className="inline-flex items-center gap-space-sm px-3 py-1 rounded bg-white/5 border border-white/10">
            <Lock className="w-3.5 h-3.5 text-tertiary-fixed" aria-hidden="true" />
            <span className="text-label-sm text-inverse-on-surface">
              {t.footer.zeroTracking}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
