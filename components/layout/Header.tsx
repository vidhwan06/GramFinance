'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { LanguageSwitcher } from './LanguageSwitcher';
import { Scale } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/learn', labelKey: 'learn' as const },
  { href: '/check', labelKey: 'check' as const },
  { href: '/loan', labelKey: 'loan' as const },
  { href: '/schemes', labelKey: 'schemes' as const },
  { href: '/assistant', labelKey: 'assistant' as const },
];

export function Header() {
  const { t } = useLanguage();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-rule bg-paper/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/home" className="flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-seal-red rounded p-1">
          <Scale className="h-6 w-6 text-seal-red" aria-hidden="true" />
          <span className="text-base font-black text-ink leading-none">
            {t.appName}
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-ink" aria-label="Main navigation">
          {NAV_ITEMS.map(({ href, labelKey }) => (
            <Link
              key={href}
              href={href}
              className="transition-colors hover:text-ink focus:outline-none focus:ring-2 focus:ring-seal-red rounded px-1 py-0.5"
            >
              {t.nav[labelKey]}
            </Link>
          ))}
        </nav>

        <div className="flex items-center space-x-3">
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
