'use client';

/**
 * The sign-out control.
 *
 * Ends the anonymous session. This is the only account-adjacent action in the
 * product, and it is a single button in the header and the mobile menu — there
 * is deliberately no account page, no profile and no settings screen.
 *
 * It reuses the existing `ghost` Button variant so it reads as a quiet
 * secondary action next to the sign-in control rather than competing with it.
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { endAnonymousSession } from '../lib/session-client';
import { authCopy } from '../presentation/copy';

export interface SignOutButtonProps {
  onSignedOut?: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
}

export function SignOutButton({
  onSignedOut,
  size = 'sm',
  className,
  disabled,
}: SignOutButtonProps) {
  const { language } = useLanguage();
  const copy = authCopy[language === 'kn' ? 'kn' : 'en'];
  const [isWorking, setIsWorking] = useState(false);

  async function handleClick() {
    setIsWorking(true);
    try {
      await endAnonymousSession();
      onSignedOut?.();
    } catch {
      // Same reasoning as SignInButton: the control stays where it is and the
      // user can simply try again. Signing out is idempotent server-side, so a
      // retry after a failure is always safe.
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size={size}
      onClick={handleClick}
      disabled={disabled || isWorking}
      isLoading={isWorking}
      loadingText={copy.signingOut}
      className={className}
    >
      {copy.signOut}
    </Button>
  );
}
