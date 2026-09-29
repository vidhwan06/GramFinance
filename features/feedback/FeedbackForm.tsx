'use client';

import React, { useState, FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Textarea } from '@/components/ui/Textarea';
import { Alert } from '@/components/ui/Alert';
import { useLanguage } from '@/features/language/hooks/useLanguage';

/**
 * Feedback form component.
 *
 * Allows an authenticated user to submit a 1–5 rating and an optional
 * comment. Submits to POST /api/feedback.
 *
 * ── State machine ────────────────────────────────────────────────────────────
 * idle → submitting → success | error
 *
 * The form prevents duplicate submissions by disabling all inputs and the
 * submit button while a request is in flight.
 */

type FormState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'success' }
  | { status: 'error'; message: string };

export function FeedbackForm() {
  const { t } = useLanguage();

  const [module, setModule] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [formState, setFormState] = useState<FormState>({ status: 'idle' });

  const isSubmitting = formState.status === 'submitting';

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;

    setFormState({ status: 'submitting' });

    fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        module: module.trim(),
        rating: rating,
        comment: comment.trim() || undefined,
      }),
    })
      .then(async (res) => {
        const body = await res.json();
        if (res.ok && body.success) {
          setFormState({ status: 'success' });
          setModule('');
          setRating(null);
          setComment('');
        } else {
          const message =
            body?.error?.message ?? t.common.error;
          setFormState({ status: 'error', message });
        }
      })
      .catch(() => {
        setFormState({ status: 'error', message: t.common.error });
      });
  }

  if (formState.status === 'success') {
    return (
      <Alert variant="success" title={t.feedback.successTitle}>
        {t.feedback.successMessage}
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.feedback.formTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Module selector */}
          <div className="flex flex-col space-y-1.5">
            <label
              htmlFor="feedback-module"
              className="text-base font-semibold text-gray-800"
            >
              {t.feedback.moduleLabel}
            </label>
            <select
              id="feedback-module"
              value={module}
              onChange={(e) => setModule(e.target.value)}
              disabled={isSubmitting}
              required
              className="flex w-full min-h-[48px] rounded-lg border-2 border-gray-300 bg-white px-4 py-3 text-base text-gray-900 shadow-sm focus:border-green-700 focus:outline-none focus:ring-2 focus:ring-green-700 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-60"
            >
              <option value="">{t.feedback.modulePlaceholder}</option>
              <option value="general">{t.feedback.moduleGeneral}</option>
              <option value="loan">{t.feedback.moduleLoan}</option>
              <option value="schemes">{t.feedback.moduleSchemes}</option>
              <option value="fraud-check">{t.feedback.moduleFraudCheck}</option>
              <option value="learn">{t.feedback.moduleLearn}</option>
            </select>
          </div>

          {/* Star rating */}
          <div className="flex flex-col space-y-1.5">
            <span className="text-base font-semibold text-gray-800">
              {t.feedback.ratingLabel}
            </span>
            <div className="flex items-center space-x-2" role="radiogroup" aria-label={t.feedback.ratingLabel}>
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={rating === value}
                  aria-label={`${value} ${value === 1 ? t.feedback.starSingular : t.feedback.starPlural}`}
                  disabled={isSubmitting}
                  onClick={() => setRating(value)}
                  className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-lg border-2 text-lg font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-green-700 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                    rating === value
                      ? 'border-green-700 bg-green-50 text-green-700'
                      : 'border-gray-300 bg-white text-gray-500 hover:border-green-600 hover:text-green-700'
                  )}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          {/* Comment textarea */}
          <Textarea
            id="feedback-comment"
            label={t.feedback.commentLabel}
            helperText={t.feedback.commentHelper}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={isSubmitting}
            rows={4}
            maxLength={1000}
            placeholder={t.feedback.commentPlaceholder}
          />

          {/* Error alert */}
          {formState.status === 'error' && (
            <Alert variant="danger" title={t.common.error}>
              {formState.message}
            </Alert>
          )}

          {/* Submit button */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isSubmitting}
            disabled={isSubmitting || !module || rating === null}
          >
            {isSubmitting ? t.common.loading : t.common.submit}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

/** Utility for conditional class merging (matches the project's cn pattern). */
function cn(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
