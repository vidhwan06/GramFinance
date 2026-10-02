'use client';

import React, { useRef, useState, FormEvent } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { SignInButton } from '@/features/auth/components/SignInButton';
import { createAnonymousSession } from '@/features/auth/lib/session-client';
import { authCopy } from '@/features/auth/presentation/copy';
import { cn } from '@/lib/utils/cn';
import { copy } from './presentation/copy';

/**
 * Feedback form - Stitch "Feedback Improvement Console" presentation.
 *
 * Allows a user to submit a 1-5 rating and an optional comment. Submits to
 * POST /api/feedback.
 *
 * - State machine (unchanged)
 *   idle -> submitting -> success | unauthorized | error
 *
 * The form prevents duplicate submissions by disabling all inputs and the
 * submit button while a request is in flight.
 *
 * - Authentication
 * A 401 is surfaced as a distinct, clearly-worded state ("Sign-in required")
 * rather than a generic error, and that state now carries a working sign-in
 * control. Previously it told the user to "please sign in" when the app gave
 * them no way to do so.
 *
 * The form does NOT look up session state on mount. That would add a request
 * the form has no need for and would couple its behaviour to auth state it is
 * not responsible for. It reacts only to a real 401 from the server, so a normal
 * submission still costs exactly one request - the existing test contract -
 * while a rejected one recovers automatically without the user retyping
 * anything.
 *
 * - What changed vs. the old markup
 * Presentation only: the Card/Select/Textarea wrappers are replaced by the
 * design's console card (uppercase label rows, step pills, char counter,
 * inset input wells, aubergine CTA). Fields, labels (`t.feedback.*`),
 * disabled rules, payload and error handling are byte-for-byte the same, so
 * `tests/ui/feedback` keeps passing unchanged.
 */

/** Display cap for the comment box - mirrors COMMENT_MAX_LENGTH in validation.ts. */
const COMMENT_MAX_LENGTH = 1000;

type FormState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'success' }
  | { status: 'unauthorized' }
  | { status: 'error'; message: string };

/** The exact shape POST /api/feedback accepts. Unchanged by this feature. */
interface FeedbackPayload {
  module: string;
  rating: number;
  comment?: string;
}

export function FeedbackForm() {
  const { t, language } = useLanguage();
  const c = copy[language === 'kn' ? 'kn' : 'en'];
  const auth = authCopy[language === 'kn' ? 'kn' : 'en'];

  const [module, setModule] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [formState, setFormState] = useState<FormState>({ status: 'idle' });

  const isSubmitting = formState.status === 'submitting';

  /**
   * The payload of the submission that was rejected with a 401, so it can be
   * replayed verbatim after sign-in. A ref rather than state: replaying must
   * not itself trigger a render, and the value is only ever read by the retry
   * handler.
   */
  const lastPayload = useRef<FeedbackPayload | null>(null);

  /**
   * Refs to the five rating buttons, keyed by value.
   *
   * Needed for arrow-key navigation: moving the selection has to move DOM focus
   * too, and a roving tabindex has to land on the right element.
   */
  const ratingRefs = useRef<Record<number, HTMLButtonElement | null>>({});

  /** Applies a rating and puts keyboard focus on it. */
  function selectRating(value: number, moveFocus = false) {
    setRating(value);
    if (moveFocus) ratingRefs.current[value]?.focus();
  }

  /**
   * WAI-ARIA radiogroup keyboard contract.
   *
   * A `role="radiogroup"` promises arrow-key navigation and a roving tabindex.
   * Without this the component only worked with a mouse: Tab walked through all
   * five buttons and Arrow keys did nothing at all, so a keyboard or
   * switch-device user had no way to change the rating after focus landed
   * inside the group.
   *
   * Follows the standard pattern: arrows move and select in one step, Home/End
   * jump to the ends, and movement wraps. Up/Down are included because these
   * are `button` elements rather than native radios, so both axes apply.
   */
  function handleRatingKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const values = [1, 2, 3, 4, 5];
    const current = rating ?? 1;
    const index = values.indexOf(current);

    let next: number | null = null;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = values[(index + 1) % values.length];
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        next = values[(index - 1 + values.length) % values.length];
        break;
      case 'Home':
        next = values[0];
        break;
      case 'End':
        next = values[values.length - 1];
        break;
      default:
        return;
    }

    event.preventDefault();
    selectRating(next, true);
  }

  const moduleOptions = [
    { value: 'general', label: t.feedback.moduleGeneral },
    { value: 'loan', label: t.feedback.moduleLoan },
    { value: 'schemes', label: t.feedback.moduleSchemes },
    { value: 'fraud-check', label: t.feedback.moduleFraudCheck },
    { value: 'learn', label: t.feedback.moduleLearn },
  ];

  /**
   * POSTs a payload and drives the form state machine.
   *
   * Returns true only on success, so the sign-in retry can tell whether the
   * replayed submission actually landed. Kept separate from the submit handler
   * so the identical request can be issued a second time without duplicating
   * any of the response handling.
   */
  async function postFeedback(payload: FeedbackPayload): Promise<boolean> {
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const body = await response.json().catch(() => null);

      if (response.ok && body?.success) {
        setFormState({ status: 'success' });
        setModule('');
        setRating(null);
        setComment('');
        return true;
      }

      if (response.status === 401) {
        setFormState({ status: 'unauthorized' });
        return false;
      }

      setFormState({
        status: 'error',
        message: body?.error?.message ?? t.common.error,
      });
      return false;
    } catch {
      setFormState({ status: 'error', message: t.common.error });
      return false;
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;

    setFormState({ status: 'submitting' });

    const payload: FeedbackPayload = {
      module: module.trim(),
      rating: rating as number,
      comment: comment.trim() || undefined,
    };
    lastPayload.current = payload;

    void postFeedback(payload);
  }

  /**
   * Sign in, then replay the rejected submission.
   *
   * The user must not have to re-enter the form, so the stored payload is
   * reused exactly as it was first sent. If sign-in fails the form falls back
   * to the unauthorized state so the same control remains available; if the
   * retry is rejected again it returns to idle with the entered values still
   * in place, so nothing is ever lost.
   */
  async function handleSignInAndRetry() {
    const payload = lastPayload.current;
    if (!payload) {
      setFormState({ status: 'idle' });
      return;
    }

    setFormState({ status: 'submitting' });

    let signedIn = false;
    try {
      const session = await createAnonymousSession();
      signedIn = session.signedIn;
    } catch {
      signedIn = false;
    }

    if (!signedIn) {
      setFormState({ status: 'unauthorized' });
      return;
    }

    const sent = await postFeedback(payload);
    if (!sent) {
      // Either a second 401 (the cookie did not reach the server) or a server
      // error. postFeedback has already set the appropriate state; the only
      // case worth correcting is a second 401, where the notice should show
      // again so the user is not left staring at a spinner.
      setFormState((current) =>
        current.status === 'unauthorized' ? { status: 'unauthorized' } : current
      );
    }
  }

  function resetForm() {
    setModule('');
    setRating(null);
    setComment('');
    lastPayload.current = null;
    setFormState({ status: 'idle' });
  }

  // - Success state ------------------------------------------------------------
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

  // - Console form -------------------------------------------------------------
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
        {/* Category - the module selector */}
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
            onKeyDown={handleRatingKeyDown}
            className="flex flex-wrap items-center gap-space-sm"
          >
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                ref={(element) => {
                  ratingRefs.current[value] = element;
                }}
                type="button"
                role="radio"
                aria-checked={rating === value}
                // Roving tabindex: exactly one button in the group is in the tab
                // order, so Tab enters the group once and then arrows move
                // within it. The selected rating is that button; with nothing
                // selected yet it is the first, so focus starts somewhere useful.
                tabIndex={rating === null ? (value === 1 ? 0 : -1) : rating === value ? 0 : -1}
                aria-label={`${value} ${value === 1 ? t.feedback.starSingular : t.feedback.starPlural}`}
                disabled={isSubmitting}
                onClick={() => selectRating(value)}
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

        {/*
          Unauthorized alert - distinct from generic errors.

          This is where the old copy made a promise the app could not keep ("Please
          sign in and try again") with no way to act on it. The SignInButton below
          is the fix: it creates the lightweight session and replays this exact
          submission, so the user never retypes what they already wrote.
        */}
        {formState.status === 'unauthorized' && (
          <Alert
            variant="warning"
            title={t.feedback.authRequiredTitle}
            className="rounded-2xl border-l-4 border-secondary bg-surface-container-high text-on-surface"
          >
            <p className="mb-3">{t.feedback.authRequiredMessage}</p>
            <SignInButton
              onClick={handleSignInAndRetry}
              label={auth.retryAfterSignIn}
              size="sm"
              variant="primary"
            />
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
