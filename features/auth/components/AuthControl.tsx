'use client';

/**
 * The header/menu auth control.
 *
 * One small control that renders the sign-in action while signed out and the
 * sign-out action while signed in. It is intentionally a single button in each
 * state rather than an account menu: GramFinance has no profile, no settings
 * and no account page, so there is nothing to put in a menu.
 *
 * It is a separate component rather than inline JSX in Header and MobileMenu so
 * both surfaces share one implementation and one session lookup. Keeping it
 * isolated also means the session fetch lives in one leaf component, so the
 * rest of the header chrome renders immediately and is unaffected by it.
 *
 * The control stays hidden until the session lookup resolves. Rendering a
 * "Continue" button first and swapping it to "Sign out" a moment later would
 * be a visible flicker on every page load, and briefly offering a sign-in
 * action to someone who is already signed in is misleading.
 */

import React from 'react';
import { useAuthState } from '@/features/auth/hooks/useAuthState';
import { SignInButton } from './SignInButton';
import { SignOutButton } from './SignOutButton';

export interface AuthControlProps {
  size?: 'sm' | 'md';
  className?: string;
}

export function AuthControl({ size = 'sm', className }: AuthControlProps) {
  const auth = useAuthState();

  if (!auth.ready) {
    // Reserve nothing: an empty span keeps the header row height stable without
    // implying that a control is available.
    return <span className={className} aria-hidden="true" />;
  }

  return (
    <span className={className}>
      {auth.signedIn ? (
        <SignOutButton onSignedOut={auth.refresh} size={size} />
      ) : (
        <SignInButton onSignedIn={auth.refresh} size={size} />
      )}
    </span>
  );
}
