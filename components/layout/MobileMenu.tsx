'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/features/language/hooks/useLanguage';

export function MobileMenu() {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col space-y-2 p-4 bg-white border-b border-gray-200 sm:hidden">
      <Link href="/home" className="text-base font-semibold text-gray-800 hover:text-green-700 py-2">
        {t.nav.home}
      </Link>
      <Link href="/learn" className="text-base font-semibold text-gray-800 hover:text-green-700 py-2">
        {t.nav.learn}
      </Link>
      <Link href="/loan" className="text-base font-semibold text-gray-800 hover:text-green-700 py-2">
        {t.nav.loan}
      </Link>
      <Link href="/check" className="text-base font-semibold text-gray-800 hover:text-green-700 py-2">
        {t.nav.check}
      </Link>
      <Link href="/schemes" className="text-base font-semibold text-gray-800 hover:text-green-700 py-2">
        {t.nav.schemes}
      </Link>
      <Link href="/assistant" className="text-base font-semibold text-gray-800 hover:text-green-700 py-2">
        {t.nav.assistant}
      </Link>
    </div>
  );
}
