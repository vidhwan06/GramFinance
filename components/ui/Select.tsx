import React, { useId, SelectHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  helperText?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, options, error, helperText, id, ...props }, ref) => {
    // See Input.tsx: label-derived ids collided when the same label appeared
    // more than once on a page. useId keeps every control uniquely addressable.
    const generatedId = useId();
    const selectId = id ?? (label ? `${label.toLowerCase().replace(/\s+/g, '-')}-${generatedId}` : generatedId);

    return (
      <div className="w-full flex flex-col space-y-1.5">
        {label && (
          <label htmlFor={selectId} className="text-base font-semibold text-ink">
            {label}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          className={cn(
            'flex w-full min-h-[48px] rounded-lg border-2 border-rule bg-white px-4 py-3 text-base text-ink shadow-sm focus:border-seal-red focus:outline-none focus:ring-2 focus:ring-seal-red/20 disabled:cursor-not-allowed disabled:bg-stone disabled:opacity-60',
            error && 'border-coral focus:border-coral focus:ring-coral/20',
            className
          )}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p id={`${selectId}-error`} className="text-sm font-medium text-coral">{error}</p>
        )}
        {!error && helperText && (
          <p id={`${selectId}-helper`} className="text-sm text-muted-ink">{helperText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
