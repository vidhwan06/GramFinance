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
    info: 'bg-blue-50 border-blue-500 text-blue-900',
    success: 'bg-green-50 border-green-600 text-green-900',
    warning: 'bg-amber-50 border-amber-500 text-amber-900',
    danger: 'bg-red-50 border-red-600 text-red-900',
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
