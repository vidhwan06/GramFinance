import React, { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'warning' | 'danger' | 'success' | 'neutral';
}

export function Badge({ className, variant = 'primary', children, ...props }: BadgeProps) {
  const variants = {
    primary: 'bg-green-100 text-green-800 border-green-300',
    warning: 'bg-amber-100 text-amber-900 border-amber-300',
    danger: 'bg-red-100 text-red-800 border-red-300',
    success: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    neutral: 'bg-paper text-ink border-rule',
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
