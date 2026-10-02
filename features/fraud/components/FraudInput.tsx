'use client';

import React, { useState, useCallback } from 'react';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { cn } from '@/lib/utils/cn';
import { copy } from '@/features/fraud/presentation/copy';
import { ScanText, Eraser, Phone } from 'lucide-react';

const MAX_CHARACTERS = 10_000;
const TEXTAREA_ID = 'fraud-message-input';

interface FraudInputProps {
  onSubmit: (text: string) => void;
  isLoading: boolean;
  hasError: boolean;
  errorMessage: string | null;
}

/**
 * Input console where users paste a suspicious message.
 *
 * Stitch composition: console header with example presets, a labelled
 * composition area with a live character counter, and an actions row.
 *
 * Behaviour is unchanged:
 *   - Character counter up to 10,000 (API max)
 *   - Client-side validation for empty/whitespace/oversized input
 *   - Loading and error state handling
 *   - Accessible label (`<label htmlFor>` → textarea) and error association
 */
export function FraudInput({
  onSubmit,
  isLoading,
  hasError,
  errorMessage,
}: FraudInputProps) {
  const { t, language } = useLanguage();
  const c = copy[language === 'kn' ? 'kn' : 'en'];
  const [text, setText] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const charCount = text.length;
  const isOverLimit = charCount > MAX_CHARACTERS;

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

  const applyExample = useCallback((example: { label: string; text: string }) => {
    if (isLoading) return;
    setText(example.text);
    setValidationError(null);
  }, [isLoading]);

  const clearText = useCallback(() => {
    if (isLoading) return;
    setText('');
    setValidationError(null);
    document.getElementById(TEXTAREA_ID)?.focus();
  }, [isLoading]);

  const activeError = validationError || errorMessage;

  return (
    <form onSubmit={handleSubmit} className="space-y-space-md" noValidate>
      {/* ── Console card ── */}
      <div className="rounded-xl bg-surface-container-lowest shadow-md border border-outline-variant/50 overflow-hidden">
        {/* Console header + example presets */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md bg-surface-container-low border-b border-outline-variant/60 px-space-md lg:px-space-xl py-space-md">
          <div className="flex items-center gap-space-sm">
            <ScanText className="h-5 w-5 text-primary-container" aria-hidden="true" />
            <h2 className="font-title-md text-title-md text-on-surface">
              {c.consoleTitle}
            </h2>
          </div>
          <div className="flex items-center gap-2 flex-wrap" role="group" aria-label={c.tryExample}>
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              {c.tryExample}
            </span>
            {c.examples.map((example) => (
              <button
                key={example.label}
                type="button"
                onClick={() => applyExample(example)}
                disabled={isLoading}
                className={cn(
                  'px-3 py-1 rounded-full font-label-sm text-label-sm transition-colors disabled:opacity-60',
                  text === example.text
                    ? 'bg-primary-container text-inverse-on-surface shadow-sm'
                    : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                )}
              >
                {example.label}
              </button>
            ))}
          </div>
        </div>

        {/* Composition area */}
        <div className="p-space-md lg:p-space-xl space-y-space-sm">
          <div className="flex items-center justify-between gap-3">
            <label
              htmlFor={TEXTAREA_ID}
              className="font-label-md text-label-md text-on-surface font-semibold uppercase tracking-wider"
            >
              {t.fraud.inputLabel}
            </label>
            <span
              id="fraud-char-count"
              className="font-label-sm text-label-sm text-on-surface-variant font-mono shrink-0"
            >
              {charCount.toLocaleString()} / {MAX_CHARACTERS.toLocaleString()} {t.fraud.characters}
            </span>
          </div>

          <div className="rounded-lg bg-surface-container-low p-1">
            <Textarea
              id={TEXTAREA_ID}
              value={text}
              onChange={handleTextChange}
              maxLength={MAX_CHARACTERS}
              rows={6}
              disabled={isLoading}
              error={activeError || undefined}
              placeholder={c.inputHint}
              className="bg-surface-container-lowest resize-y leading-relaxed"
            />
          </div>

          {isOverLimit && !activeError && (
            <p className="text-body-sm text-error font-medium">{t.fraud.tooLong}</p>
          )}
        </div>

        {/* Actions row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md border-t border-outline-variant/60 px-space-md lg:px-space-xl py-space-md">
          <button
            type="button"
            onClick={clearText}
            disabled={isLoading || text.length === 0}
            className={cn(
              'inline-flex items-center gap-1.5 px-space-md py-2.5 rounded-lg',
              'bg-surface-container text-on-surface hover:bg-surface-container-high',
              'font-label-md text-label-md transition-colors min-h-[44px]',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <Eraser className="h-4 w-4" aria-hidden="true" />
            <span>{c.clearText}</span>
          </button>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            disabled={isLoading}
            loadingText={t.fraud.buttonChecking}
            className="group"
          >
            <span>{t.fraud.buttonCheck}</span>
            <span
              aria-hidden="true"
              className="w-6 h-6 rounded-full bg-tertiary-fixed text-primary-container flex items-center justify-center text-xs font-bold group-hover:translate-x-0.5 transition-transform"
            >
              →
            </span>
          </Button>
        </div>
      </div>

      {/* Cybercrime helpline note */}
      {!isLoading && (
        <p className="text-body-sm text-on-surface-variant flex items-center gap-1.5">
          <Phone className="h-4 w-4 shrink-0 text-secondary" aria-hidden="true" />
          {t.fraud.helpline}
        </p>
      )}
    </form>
  );
}

/** displayName for dev tools. */
FraudInput.displayName = 'FraudInput';
