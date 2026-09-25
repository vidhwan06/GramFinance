import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      children,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 min-h-[48px] rounded-lg active:scale-[0.98]';

    const variants = {
      primary:
        'bg-green-700 text-white hover:bg-green-800 focus-visible:ring-green-700 shadow-sm',
      secondary:
        'bg-emerald-100 text-emerald-900 hover:bg-emerald-200 focus-visible:ring-emerald-500',
      outline:
        'border-2 border-green-700 text-green-700 hover:bg-green-50 focus-visible:ring-green-700 bg-transparent',
      ghost:
        'text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-gray-400 bg-transparent',
      danger:
        'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600 shadow-sm',
    };

    const sizes = {
      sm: 'text-sm px-3 py-2 min-h-[40px]',
      md: 'text-base px-5 py-3 min-h-[48px]',
      lg: 'text-lg px-6 py-4 min-h-[56px]',
    };

    return (
      <button
        ref={ref}
        type={type}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <span className="flex items-center space-x-2">
            <svg
              className="animate-spin h-5 w-5 text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Loading...</span>
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
