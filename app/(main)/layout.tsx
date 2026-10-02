import React, { ReactNode } from 'react';
import { Header } from '@/components/layout/Header';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { BottomNavigation } from '@/components/layout/BottomNavigation';

/**
 * Full-bleed page shell (Stitch architecture): sections own their own
 * `max-w-[1440px]` inner container instead of every page being squeezed
 * through a single narrow wrapper. The footer is global chrome.
 */
export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-warm-ivory">
      <Header />
      <main className="flex-1 w-full">{children}</main>
      <SiteFooter />
      <BottomNavigation />
    </div>
  );
}
