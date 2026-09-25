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
    neutral: 'bg-gray-100 text-gray-800 border-gray-300',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold transition-colors',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
