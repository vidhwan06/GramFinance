'use client';

import React, { useState, FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Alert';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { cn } from '@/lib/utils/cn';

/**
 * Feedback form component.
 *
 * Allows an authenticated user to submit a 1–5 rating and an optional
 * comment. Submits to POST /api/feedback.
 *
 * ── State machine ────────────────────────────────────────────────────────────
 * idle → submitting → success | unauthorized | error
 *
 * The form prevents duplicate submissions by disabling all inputs and the
 * submit button while a request is in flight.
 *
 * ── Authentication ──────────────────────────────────────────────────────────
 * The API requires an authenticated session. A 401 response is surfaced as
 * a distinct, clearly-worded state rather than a generic error, so users
 * understand they need to sign in before their feedback can be accepted.
 */

type FormState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'success' }
  | { status: 'unauthorized' }
  | { status: 'error'; message: string };

export function FeedbackForm() {
  const { t } = useLanguage();

  const [module, setModule] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [formState, setFormState] = useState<FormState>({ status: 'idle' });

  const isSubmitting = formState.status === 'submitting';

  const moduleOptions = [
    { value: 'general', label: t.feedback.moduleGeneral },
    { value: 'loan', label: t.feedback.moduleLoan },
    { value: 'schemes', label: t.feedback.moduleSchemes },
    { value: 'fraud-check', label: t.feedback.moduleFraudCheck },
    { value: 'learn', label: t.feedback.moduleLearn },
  ];

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
        } else if (res.status === 401) {
          setFormState({ status: 'unauthorized' });
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
      <div className="space-y-4">
        <Alert variant="success" title={t.feedback.successTitle}>
          {t.feedback.successMessage}
        </Alert>
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => {
            setModule('');
            setRating(null);
            setComment('');
            setFormState({ status: 'idle' });
          }}
        >
          {t.feedback.submitAnother}
        </Button>
      </div>
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
          <Select
            id="feedback-module"
            label={t.feedback.moduleLabel}
            options={moduleOptions}
            value={module}
            onChange={(e) => setModule(e.target.value)}
            disabled={isSubmitting}
            required
          />

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

          {/* Unauthorized alert — distinct from generic errors */}
          {formState.status === 'unauthorized' && (
            <Alert variant="warning" title={t.feedback.authRequiredTitle}>
              {t.feedback.authRequiredMessage}
            </Alert>
          )}

          {/* Generic error alert */}
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
