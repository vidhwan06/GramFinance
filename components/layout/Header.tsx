'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ShieldCheck } from 'lucide-react';

export function Header() {
  const { t } = useLanguage();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white/95 backdrop-blur shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/home" className="flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-green-700 rounded-lg p-1">
          <ShieldCheck className="h-8 w-8 text-green-700" />
          <div>
            <span className="text-xl font-black text-gray-900 leading-none block">
              {t.appName}
            </span>
            <span className="text-xs text-gray-600 hidden sm:inline-block">
              {t.appTagline}
            </span>
          </div>
        </Link>

        <div className="flex items-center space-x-3">
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
