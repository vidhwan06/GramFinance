'use client';

/**
 * The sign-in control.
 *
 * One button, no fields. It creates the lightweight anonymous session that lets
 * a visitor submit feedback. It is not a login form and must not grow into one:
 * there is no email, password, phone number or recovery flow in this product.
 *
 * Styling reuses the existing `Button` variants so it sits inside the approved
 * Stitch compositions without introducing a new visual language. `sm` is the
 * size used by the header and menu; `lg` is used on the sign-in page.
 *
 * Two modes:
 *   * default — performs the sign-in itself and reports the result;
 *   * `onClick` supplied — the caller drives the flow. `FeedbackForm` uses this
 *     so it can sign in and then retry its own submission, which it is the only
 *     component that can correctly do.
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { createAnonymousSession } from '../lib/session-client';
import { authCopy } from '../presentation/copy';

export interface SignInButtonProps {
  /** Called after a successful sign-in, when this component performs it. */
  onSignedIn?: () => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'accent' | 'danger';
  className?: string;
  /** Override the label — the feedback retry uses this to say what happens next. */
  label?: string;
  disabled?: boolean;
  /** Externally controlled pending state, for callers that own the request. */
  pending?: boolean;
  /** When provided, this component delegates the whole action to the caller. */
  onClick?: () => void | Promise<void>;
}

export function SignInButton({
  onSignedIn,
  size = 'sm',
  variant = 'outline',
  className,
  label,
  disabled,
  pending,
  onClick,
}: SignInButtonProps) {
  const { language } = useLanguage();
  const copy = authCopy[language === 'kn' ? 'kn' : 'en'];
  const [isWorking, setIsWorking] = useState(false);

  async function handleClick() {
    if (onClick) {
      await onClick();
      return;
    }
    setIsWorking(true);
    try {
      const session = await createAnonymousSession();
      if (session.signedIn) onSignedIn?.();
    } catch {
      // Deliberately silent. A failed sign-in leaves the caller exactly as it
      // was; the surrounding flow owns its own error messaging and retry. This
      // also prevents an unhandled rejection from a plain button.
    } finally {
      setIsWorking(false);
    }
  }

  const isPending = pending ?? isWorking;

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={disabled || isPending}
      isLoading={isPending}
      loadingText={copy.signingIn}
      className={className}
    >
      {label ?? copy.signIn}
    </Button>
  );
}
