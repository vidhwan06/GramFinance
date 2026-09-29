'use client';

import React, { useState, useCallback } from 'react';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { cn } from '@/lib/utils/cn';

const MAX_CHARACTERS = 10_000;

interface FraudInputProps {
  onSubmit: (text: string) => void;
  isLoading: boolean;
  hasError: boolean;
  errorMessage: string | null;
}

/**
 * Input section where users paste a suspicious message.
 *
 * Features:
 *   - Character counter up to 10,000 (API max)
 *   - Client-side validation for empty/whitespace/oversized input
 *   - Loading and error state handling
 *   - Accessible label and error association
 */
export function FraudInput({
  onSubmit,
  isLoading,
  hasError,
  errorMessage,
}: FraudInputProps) {
  const { t } = useLanguage();
  const [text, setText] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const charCount = text.length;
  const remaining = MAX_CHARACTERS - charCount;

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setText(value);

    // Clear validation error when user starts typing
    if (validationError) {
      setValidationError(null);
    }
  }, [validationError]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    // Client-side validation
    if (!text.trim()) {
      setValidationError(t.fraud.emptyInput);
      return;
    }
    if (charCount > MAX_CHARACTERS) {
      setValidationError(t.fraud.oversizedInput);
      return;
    }

    onSubmit(text);
  }, [isLoading, text, charCount, onSubmit, t]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {/* Input Card */}
      <div className="rounded border border-rule bg-white p-5 shadow-sm">
        {/* Heading */}
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          {t.fraud.inputHeading}
        </h2>

        <p className="text-base text-gray-500 leading-relaxed mb-4">
          {t.fraud.inputSubtitle}
        </p>

        {/* Textarea with label */}
        <Textarea
          label={t.fraud.inputLabel}
          value={text}
          onChange={handleTextChange}
          maxLength={MAX_CHARACTERS}
          rows={5}
          disabled={isLoading}
          error={validationError || errorMessage || undefined}
          helperText={`${charCount.toLocaleString()} / ${MAX_CHARACTERS.toLocaleString()} ${t.fraud.characters}`}
          placeholder={t.fraud.inputPlaceholder}
        />

        {/* Character counter */}
        <div className="mt-2 flex items-center justify-between">
          <p className={cn(
            'text-xs',
            remaining < 0 ? 'text-red-600 font-medium' : 'text-gray-400'
          )}>
            {remaining >= 0
              ? `${remaining.toLocaleString()} ${t.fraud.charactersRemaining}`
              : t.fraud.tooLong}
          </p>
        </div>

        {/* Submit button */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isLoading}
          disabled={isLoading}
          loadingText={t.fraud.buttonChecking}
          className="mt-4 w-full"
        >
          {t.fraud.buttonCheck}
        </Button>
      </div>

      {/* Cybercrime helpline note */}
      {!isLoading && (
        <p className="text-xs text-gray-500 flex items-center gap-1.5">
          <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
          </svg>
          {t.fraud.helpline}
        </p>
      )}
    </form>
  );
}

/** displayName for dev tools. */
FraudInput.displayName = 'FraudInput';
