import React, { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'warning' | 'danger' | 'success' | 'neutral';
}

export function Badge({ className, variant = 'primary', children, ...props }: BadgeProps) {
  const variants = {
    primary: 'bg-deep-teal/10 text-deep-teal border-deep-teal/30',
    warning: 'bg-warning-50 text-warning-700 border-warning-500',
    danger: 'bg-coral/10 text-coral border-coral/30',
    success: 'bg-deep-teal/10 text-deep-teal border-deep-teal/30',
    neutral: 'bg-stone text-ink border-rule',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded border px-2.5 py-0.5 text-xs font-semibold border transition-colors',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
