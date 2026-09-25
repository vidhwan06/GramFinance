import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export interface PageContainerProps {
  children: ReactNode;
  className?: string;
}

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <main className={cn('mx-auto max-w-4xl px-4 py-6 pb-24 sm:px-6 lg:px-8', className)}>
      {children}
    </main>
  );
}
