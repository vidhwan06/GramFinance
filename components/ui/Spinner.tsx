import React, { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

export interface SpinnerProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
}

export function Spinner({ className, size = 'md', ...props }: SpinnerProps) {
  const sizes = {
    sm: 'h-5 w-5 border-2',
    md: 'h-8 w-8 border-3',
    lg: 'h-12 w-12 border-4',
  };

  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn('inline-block animate-spin rounded-full border-solid border-green-700 border-t-transparent', sizes[size], className)}
      {...props}
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}
