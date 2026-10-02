'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { cn } from '@/lib/utils/cn';
import { Home, BookOpen, Calculator, ShieldAlert, Landmark, MessageSquare, Star } from 'lucide-react';

export function BottomNavigation() {
  const pathname = usePathname();
  const { t } = useLanguage();

  const navItems = [
    { href: '/home', label: t.nav.home, icon: Home },
    { href: '/learn', label: t.nav.learn, icon: BookOpen },
    { href: '/loan', label: t.nav.loan, icon: Calculator },
    { href: '/check', label: t.nav.check, icon: ShieldAlert },
    { href: '/schemes', label: t.nav.schemes, icon: Landmark },
    { href: '/assistant', label: t.nav.assistant, icon: MessageSquare },
    { href: '/feedback', label: t.nav.feedback, icon: Star },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-rule bg-warm-ivory shadow-lg min-[840px]:hidden" aria-label="Mobile navigation">
      <div className="mx-auto flex h-16 max-w-md items-center justify-start overflow-x-auto px-2 sm:max-w-xl sm:justify-around [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-colors text-xs font-semibold shrink-0 focus:outline-none focus:ring-2 focus:ring-seal-red min-h-[48px]',
                isActive
                  ? 'text-seal-red font-bold bg-white'
                  : 'text-muted-ink hover:text-ink hover:bg-white'
              )}
            >
              <Icon className={cn('h-5 w-5 mb-0.5', isActive ? 'text-seal-red' : 'text-muted-ink')} aria-hidden="true" />
              <span className="truncate max-w-[64px] text-[11px]">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
