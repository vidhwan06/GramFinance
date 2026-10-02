import React, { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'danger';
  title?: string;
}

export function Alert({
  className,
  variant = 'info',
  title,
  children,
  ...props
}: AlertProps) {
  const variants = {
    info: 'bg-deep-teal/10 border-deep-teal text-ink',
    success: 'bg-deep-teal/10 border-deep-teal text-ink',
    warning: 'bg-warning-50 border-warning-500 text-warning-700',
    danger: 'bg-coral/10 border-coral text-ink',
  };

  return (
    <div
      role="alert"
      className={cn('rounded-xl border-l-4 p-4 text-base shadow-sm', variants[variant], className)}
      {...props}
    >
      {title && <h4 className="font-bold text-lg mb-1">{title}</h4>}
      <div>{children}</div>
    </div>
  );
}
