'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { cn } from '@/lib/utils/cn';
import { Home, BookOpen, Calculator, ShieldAlert, Landmark, MessageSquare } from 'lucide-react';

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
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white shadow-lg">
      <div className="mx-auto flex h-16 max-w-md items-center justify-around px-2 sm:max-w-xl">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-colors text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-green-700 min-h-[48px]',
                isActive
                  ? 'text-green-700 font-bold bg-green-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              )}
            >
              <Icon className={cn('h-5 w-5 mb-0.5', isActive ? 'text-green-700' : 'text-gray-500')} />
              <span className="truncate max-w-[64px] text-[11px]">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
