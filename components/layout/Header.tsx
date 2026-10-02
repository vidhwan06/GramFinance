'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { LanguageSwitcher } from './LanguageSwitcher';
import { Landmark } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

/**
 * Stitch header: 80px bar on a translucent surface, aubergine logo tile with a
 * lime icon, a two-line wordmark, four short desktop nav links with an active
 * underline, and the "Ask GramFinance" pill as the primary entry point.
 *
 * Sticky (not fixed) so content flows beneath without a compensating pad —
 * visually identical at rest, safer for anchor links and focus scrolling.
 */
const NAV_ITEMS = [
  { href: '/schemes', labelKey: 'schemesShort' as const },
  { href: '/check', labelKey: 'staySafe' as const },
  { href: '/loan', labelKey: 'loans' as const },
  { href: '/learn', labelKey: 'learn' as const },
  { href: '/feedback', labelKey: 'feedback' as const },
];

export function Header() {
  const { t } = useLanguage();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 w-full bg-surface/90 backdrop-blur-md border-b border-outline-variant">
      <div className="h-20 max-w-[1440px] mx-auto px-margin-mobile lg:px-margin flex items-center justify-between gap-4">
        {/* Brand */}
        <Link
          href="/home"
          className="flex items-center gap-space-sm group text-left shrink-0"
        >
          <span
            className="w-9 h-9 rounded bg-primary-container flex items-center justify-center shrink-0"
            aria-hidden="true"
          >
            <Landmark className="w-5 h-5 text-tertiary-fixed" />
          </span>
          <span className="flex flex-col min-w-0">
            <span className="text-title-md text-on-surface tracking-tight leading-none group-hover:text-secondary transition-colors whitespace-nowrap">
              {t.appName}
            </span>
            <span className="text-label-sm text-on-surface-variant leading-none mt-1 whitespace-nowrap">
              {t.appSubtitle}
            </span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav
          className="hidden min-[840px]:flex items-center gap-space-lg"
          aria-label="Main navigation"
        >
          {NAV_ITEMS.map(({ href, labelKey }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'text-label-lg text-on-surface-variant hover:text-on-surface transition-colors py-space-xs border-b-2 border-transparent',
                  active && 'text-on-surface border-primary-container font-semibold'
                )}
              >
                {t.nav[labelKey]}
              </Link>
            );
          })}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-space-md shrink-0">
          <Link
            href="/assistant"
            className="hidden sm:inline-flex items-center gap-2 px-space-md py-2 rounded-lg bg-surface-container-low border border-outline-variant hover:border-primary-container transition-all group"
          >
            <span className="w-2 h-2 rounded-full bg-tertiary-fixed" aria-hidden="true" />
            <span className="text-label-md text-on-surface group-hover:text-primary-container font-semibold whitespace-nowrap">
              {t.nav.ask}
            </span>
          </Link>
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
