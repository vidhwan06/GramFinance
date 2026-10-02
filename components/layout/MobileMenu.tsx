'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { AuthControl } from '@/features/auth/components/AuthControl';

export function MobileMenu() {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col space-y-1 p-4 bg-paper border-b border-rule sm:hidden">
      <Link href="/home" className="text-base font-semibold text-ink hover:text-seal-red py-1.5">
        {t.nav.home}
      </Link>
      <Link href="/learn" className="text-base font-semibold text-ink hover:text-seal-red py-1.5">
        {t.nav.learn}
      </Link>
      <Link href="/loan" className="text-base font-semibold text-ink hover:text-seal-red py-1.5">
        {t.nav.loan}
      </Link>
      <Link href="/check" className="text-base font-semibold text-ink hover:text-seal-red py-1.5">
        {t.nav.check}
      </Link>
      <Link href="/schemes" className="text-base font-semibold text-ink hover:text-seal-red py-1.5">
        {t.nav.schemes}
      </Link>
      <Link href="/assistant" className="text-base font-semibold text-ink hover:text-seal-red py-1.5">
        {t.nav.assistant}
      </Link>
      {/* Lightweight anonymous session, same control as the header. */}
      <div className="pt-2 mt-1 border-t border-rule">
        <AuthControl size="sm" />
      </div>
    </div>
  );
}
