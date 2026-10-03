'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { adminFeedbackCopy } from './presentation/copy';

/**
 * What a visitor who is not an administrator is shown.
 *
 * ── An honest refusal, not a 404 ────────────────────────────────────────────
 * A missing page would be the wrong answer twice over: an administrator who lost
 * the URL would go looking for a broken link, and it would suggest the route is
 * secret. This says exactly what is true — the page exists, it is for
 * administrators, and here is who to ask.
 *
 * It deliberately does NOT distinguish "no session" from "signed in but not an
 * admin" in the body text. The heading differs, because a signed-in user who has
 * been demoted needs to know a session still exists, but the body is the same
 * advice in both cases and nothing about the admin area's contents is revealed.
 *
 * The rows were never at risk here: `app/(main)/admin/feedback/page.tsx` refuses
 * before the dashboard mounts, and the API refuses independently.
 */

interface AccessDeniedProps {
  /** True when a session exists but lacks the admin role. */
  signedIn: boolean;
}

export function AdminAccessDenied({ signedIn }: AccessDeniedProps) {
  const { language } = useLanguage();
  const copy = adminFeedbackCopy[language];

  return (
    <div className="mx-auto max-w-lg space-y-4 py-12 text-center">
      <ShieldAlert className="mx-auto h-10 w-10 text-muted-ink" aria-hidden="true" />
      <h1 className="text-2xl font-bold text-ink">
        {signedIn ? copy.notAdminTitle : copy.signedOutTitle}
      </h1>
      <p className="text-sm leading-relaxed text-muted-ink">{copy.notAuthorisedBody}</p>
      <Link href="/home">
        <Button variant="outline">{copy.backToHome}</Button>
      </Link>
    </div>
  );
}