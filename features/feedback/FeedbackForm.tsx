'use client';

import React, { useState, FormEvent } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { cn } from '@/lib/utils/cn';
import { copy } from './presentation/copy';

/**
 * Feedback form — Stitch "Feedback Improvement Console" presentation.
 *
 * Allows an authenticated user to submit a 1–5 rating and an optional
 * comment. Submits to POST /api/feedback.
 *
 * ── State machine (unchanged) ───────────────────────────────────────────────
 * idle → submitting → success | unauthorized | error
 *
 * The form prevents duplicate submissions by disabling all inputs and the
 * submit button while a request is in flight.
 *
 * ── Authentication (unchanged) ──────────────────────────────────────────────
 * A 401 is surfaced as a distinct, clearly-worded state ("Sign-in required")
 * rather than a generic error, so users understand they must sign in first.
 *
 * ── What changed vs. the old markup ─────────────────────────────────────────
 * Presentation only: the Card/Select/Textarea wrappers are replaced by the
 * design's console card (uppercase label rows, step pills, char counter,
 * inset input wells, aubergine CTA). Fields, labels (`t.feedback.*`),
 * disabled rules, payload and error handling are byte-for-byte the same, so
 * `tests/ui/feedback` keeps passing unchanged.
 */

/** Display cap for the comment box — mirrors COMMENT_MAX_LENGTH in validation.ts. */
const COMMENT_MAX_LENGTH = 1000;

type FormState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'success' }
  | { status: 'unauthorized' }
  | { status: 'error'; message: string };

export function FeedbackForm() {
  const { t, language } = useLanguage();
  const c = copy[language === 'kn' ? 'kn' : 'en'];

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

  function resetForm() {
    setModule('');
    setRating(null);
    setComment('');
    setFormState({ status: 'idle' });
  }

  // ── Success state ──────────────────────────────────────────────────────────
  if (formState.status === 'success') {
    return (
      <section
        aria-live="polite"
        className="rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-space-md shadow-sm sm:p-space-lg"
      >
        <div className="flex flex-col items-center justify-center py-space-xl text-center">
          <div
            className="mb-space-md flex h-16 w-16 items-center justify-center rounded-full bg-secondary/15 text-secondary"
            aria-hidden="true"
          >
            <CheckCircle2 className="h-9 w-9" />
          </div>
          <p className="mb-2 font-kannada font-label-sm text-label-sm font-semibold uppercase tracking-wider text-secondary">
            {c.successKicker}
          </p>
          <h2 className="mb-2 font-headline-md text-headline-md tracking-tight text-primary-container">
            {t.feedback.successTitle}
          </h2>
          <p className="mb-2 max-w-lg font-body-md text-body-md leading-relaxed text-on-surface-variant">
            {t.feedback.successMessage}
          </p>
          <p className="mb-space-md max-w-lg font-body-sm text-body-sm leading-relaxed text-on-surface-variant">
            {c.successBody}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={resetForm}
              className="rounded-lg border border-outline-variant bg-surface-container px-5 py-3 font-label-lg text-label-lg text-on-surface hover:bg-surface-container-high hover:text-on-surface focus-visible:ring-secondary"
            >
              {t.feedback.submitAnother}
            </Button>
            <Link
              href="/home"
              className="rounded-lg bg-primary-container px-5 py-3 font-label-lg text-label-lg text-inverse-on-surface transition-opacity hover:opacity-95"
            >
              {c.continueExploring}
            </Link>
          </div>
        </div>
      </section>
    );
  }

  // ── Console form ───────────────────────────────────────────────────────────
  return (
    <div className="relative rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-space-md shadow-sm sm:p-space-lg">
      <div className="mb-space-md border-b border-outline-variant/40 pb-space-md">
        <p className="font-label-sm text-label-sm font-semibold uppercase tracking-wider text-secondary">
          {c.consoleEyebrow}
        </p>
        <h2 className="mt-1 font-title-lg text-title-lg text-primary-container">
          {t.feedback.formTitle}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-space-md">
        {/* Category — the module selector */}
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="flex items-baseline gap-1.5">
              <label
                htmlFor="feedback-module"
                className="cursor-pointer font-label-md text-label-md uppercase tracking-wider text-on-surface"
              >
                {t.feedback.moduleLabel}
              </label>
              <span className="font-label-sm text-label-sm font-normal text-on-surface-variant">
                {c.moduleGloss}
              </span>
            </span>
            <span className="whitespace-nowrap font-label-sm text-label-sm text-secondary">
              {c.stepOne}
            </span>
          </div>
          <div className="rounded-lg bg-surface-container-low p-1">
            <select
              id="feedback-module"
              className="w-full cursor-pointer rounded-md bg-surface-container-lowest px-3 py-2.5 font-body-md text-body-md text-on-surface disabled:cursor-not-allowed disabled:opacity-60"
              value={module}
              onChange={(e) => setModule(e.target.value)}
              disabled={isSubmitting}
              required
            >
              <option value="">{t.feedback.modulePlaceholder}</option>
              {moduleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Star rating */}
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="font-label-md text-label-md uppercase tracking-wider text-on-surface">
              {t.feedback.ratingLabel}
            </span>
            <span className="whitespace-nowrap font-label-sm text-label-sm text-secondary">
              {c.stepTwo}
            </span>
          </div>
          <div
            role="radiogroup"
            aria-label={t.feedback.ratingLabel}
            className="flex flex-wrap items-center gap-space-sm"
          >
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
                  'flex h-14 w-14 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border-2 transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
                  rating === value
                    ? 'border-primary-container bg-primary-container text-tertiary-fixed shadow-sm'
                    : 'border-outline-variant bg-surface-container-lowest text-on-surface hover:border-secondary hover:text-secondary'
                )}
              >
                <span aria-hidden="true" className="text-lg leading-none">
                  ★
                </span>
                <span aria-hidden="true" className="font-label-sm text-label-sm leading-none">
                  {value}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Comment textarea */}
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <label
              htmlFor="feedback-comment"
              className="cursor-pointer font-label-md text-label-md uppercase tracking-wider text-on-surface"
            >
              {t.feedback.commentLabel}
            </label>
            <span className="font-label-sm text-label-sm tabular-nums text-on-surface-variant">
              {comment.length} / {COMMENT_MAX_LENGTH}
            </span>
          </div>
          <p
            id="feedback-comment-hint"
            className="mb-2 font-body-sm text-body-sm text-on-surface-variant"
          >
            {t.feedback.commentHelper}
          </p>
          <div className="rounded-lg bg-surface-container-low p-1">
            <textarea
              id="feedback-comment"
              rows={4}
              maxLength={COMMENT_MAX_LENGTH}
              aria-describedby="feedback-comment-hint"
              className="min-h-[140px] w-full resize-y rounded-md bg-surface-container-lowest p-space-sm font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/60 disabled:cursor-not-allowed disabled:opacity-60"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={isSubmitting}
              placeholder={t.feedback.commentPlaceholder}
            />
          </div>
        </div>

        {/* Unauthorized alert — distinct from generic errors */}
        {formState.status === 'unauthorized' && (
          <Alert
            variant="warning"
            title={t.feedback.authRequiredTitle}
            className="rounded-2xl border-l-4 border-secondary bg-surface-container-high text-on-surface"
          >
            {t.feedback.authRequiredMessage}
          </Alert>
        )}

        {/* Generic error alert */}
        {formState.status === 'error' && (
          <Alert
            variant="danger"
            title={t.common.error}
            className="rounded-2xl border-l-4 border-error bg-error-container text-on-error-container"
          >
            {formState.message}
          </Alert>
        )}

        {/* Submission action zone */}
        <div className="flex flex-col items-start justify-between gap-space-sm pt-space-sm sm:flex-row sm:items-center">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isSubmitting}
            disabled={isSubmitting || !module || rating === null}
            className="rounded-lg bg-primary-container px-6 py-3 font-label-lg text-label-lg text-inverse-on-surface shadow-sm hover:bg-deep-plum focus-visible:ring-tertiary-fixed"
          >
            <span>{t.common.submit}</span>
            <span className="ml-1.5 font-normal text-tertiary-fixed" aria-hidden="true">
              {c.submitGloss}
            </span>
            <span className="ml-1 text-tertiary-fixed" aria-hidden="true">
              →
            </span>
          </Button>
          <span className="flex items-center gap-2 font-label-sm text-label-sm text-on-surface-variant">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" aria-hidden="true" />
            <span>{c.submitNote}</span>
          </span>
        </div>
      </form>
    </div>
  );
}
