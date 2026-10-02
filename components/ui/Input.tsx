import React, { useId, InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    // useId guarantees a unique DOM id. Deriving it from the label text alone
    // produced collisions: LoanComparisonCard renders "Option A" and "Option B"
    // with identical labels, so all eight inputs shared four ids and clicking
    // option B's label focused option A's field. An explicit `id` still wins so
    // ids can stay readable and stable where they matter.
    const generatedId = useId();
    const inputId = id ?? (label ? `${label.toLowerCase().replace(/\s+/g, '-')}-${generatedId}` : generatedId);

    return (
      <div className="w-full flex flex-col space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="text-base font-semibold text-ink">
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            'flex w-full min-h-[48px] rounded-lg border-2 border-rule bg-white px-4 py-3 text-base text-ink shadow-sm placeholder:text-muted focus:border-seal-red focus:outline-none focus:ring-2 focus:ring-seal-red/20 disabled:cursor-not-allowed disabled:bg-stone disabled:opacity-60',
            error && 'border-coral focus:border-coral focus:ring-coral/20',
            className
          )}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className="text-sm font-medium text-coral">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={`${inputId}-helper`} className="text-sm text-muted-ink">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
