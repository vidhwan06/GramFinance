import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  loadingText?: string;
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
      loadingText,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 min-h-[48px] rounded-lg active:scale-[0.98]';

    const variants = {
      primary:
        'bg-aubergine text-warm-ivory hover:bg-deep-plum focus-visible:ring-aubergine shadow-sm',
      accent:
        'bg-signature-lime text-aubergine hover:bg-signature-lime/85 focus-visible:ring-signature-lime shadow-sm border border-aubergine/20',
      secondary:
        'bg-deep-teal/10 text-deep-teal hover:bg-deep-teal/20 focus-visible:ring-deep-teal',
      outline:
        'border-2 border-seal-red text-seal-red hover:bg-seal-red/10 focus-visible:ring-seal-red bg-transparent',
      ghost:
        'text-ink hover:bg-stone hover:text-ink focus-visible:ring-muted-ink bg-transparent',
      danger:
        'bg-coral text-white hover:bg-coral/90 focus-visible:ring-coral shadow-sm',
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
            <span>{loadingText ?? 'Loading...'}</span>
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
