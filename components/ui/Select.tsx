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
          <label htmlFor={selectId} className="text-base font-semibold text-gray-800">
            {label}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          className={cn(
            'flex w-full min-h-[48px] rounded-lg border-2 border-gray-300 bg-white px-4 py-3 text-base text-gray-900 shadow-sm focus:border-green-700 focus:outline-none focus:ring-2 focus:ring-green-700 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-60',
            error && 'border-red-600 focus:border-red-600 focus:ring-red-600',
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
          <p id={`${selectId}-error`} className="text-sm font-medium text-red-600">{error}</p>
        )}
        {!error && helperText && (
          <p id={`${selectId}-helper`} className="text-sm text-gray-600">{helperText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
