'use client';

/**
 * The pre-submission sign-in notice for /feedback.
 *
 * Shown to a signed-out visitor BEFORE they fill the form in, so the session is
 * explained up front rather than after a failed submission. The form remains
 * fully usable and submittable while this is visible — a visitor who ignores it
 * simply gets the 401 path in `FeedbackForm`, which offers the same action.
 *
 * The copy states plainly that this creates a lightweight session and that no
 * email address or password is needed. It does not describe a personal account,
 * because that is not what is created.
 *
 * Presentational wrapper only: it renders the shared `Alert` and the shared
 * `SignInButton` with the auth copy, so there is one source of truth for both
 * the wording and the control.
 */

import React from 'react';
import { Alert } from '@/components/ui/Alert';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { SignInButton } from './SignInButton';
import { authCopy } from '../presentation/copy';

export interface SignInNoticeProps {
  onSignedIn?: () => void;
  className?: string;
}

export function SignInNotice({ onSignedIn, className }: SignInNoticeProps) {
  const { language } = useLanguage();
  const copy = authCopy[language === 'kn' ? 'kn' : 'en'];

  return (
    <Alert
      variant="info"
      title={copy.feedbackNoticeTitle}
      className={className}
    >
      <p className="mb-3">{copy.feedbackNoticeBody}</p>
      <SignInButton onSignedIn={onSignedIn} size="sm" />
    </Alert>
  );
}
