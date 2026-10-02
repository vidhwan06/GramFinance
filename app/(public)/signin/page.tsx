'use client';

/**
 * /signin — the one-tap anonymous session page.
 *
 * Lives in the `(public)` route group, whose layout is already a focused,
 * centred card. No new visual language is introduced: the page reuses the
 * existing `Button`, the typography already used across the app, and the auth
 * feature's own bilingual copy.
 *
 * There are no input fields. No email, password or phone number, and no account
 * is created — just a lightweight session that lets a visitor submit feedback.
 * If a session already exists, pressing Continue reuses it rather than minting a
 * second identity, so this page is safe to visit repeatedly.
 *
 * ── Why the Suspense boundary ───────────────────────────────────────────────
 * `useSearchParams()` opts a route out of static prerendering unless it is read
 * inside a Suspense boundary. The inner component below reads it; this
 * component provides the boundary so `/signin` can still be prerendered at
 * build time rather than being forced to dynamic rendering.
 */

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { createAnonymousSession } from '@/features/auth/lib/session-client';
import { authCopy } from '@/features/auth/presentation/copy';

/**
 * Only same-origin, absolute-path destinations are honoured.
 *
 * Rejects `//evil.com` (protocol-relative, navigates off-origin) and anything
 * that is not a rooted path such as `javascript:alert(1)`, so a crafted
 * `?next=` cannot turn this page into an open redirect.
 */
function safeReturnTo(raw: string | null): string {
  if (!raw) return '/feedback';
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/feedback';
  return raw;
}

function SignInContent() {
  const { language } = useLanguage();
  const copy = authCopy[language === 'kn' ? 'kn' : 'en'];
  const router = useRouter();
  const searchParams = useSearchParams();

  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [returnTo, setReturnTo] = useState('/feedback');

  useEffect(() => {
    setReturnTo(safeReturnTo(searchParams.get('next')));
  }, [searchParams]);

  async function handleContinue() {
    setPending(true);
    setFailed(false);
    try {
      const session = await createAnonymousSession();
      if (session.signedIn) {
        router.push(returnTo);
        return;
      }
      setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="text-center py-2">
      <h1 className="text-2xl font-black text-ink mb-2">{copy.pageTitle}</h1>
      <p className="text-base text-muted-ink mb-6">{copy.pageLead}</p>

      <div className="mb-6">
        <Button
          variant="primary"
          size="lg"
          onClick={handleContinue}
          disabled={pending}
          isLoading={pending}
          loadingText={copy.signingIn}
          className="w-full"
        >
          {copy.signIn}
        </Button>
      </div>

      {failed ? (
        <p role="alert" className="text-sm text-seal-red mb-6">
          {copy.pageError}
        </p>
      ) : null}

      <div className="text-left border border-rule rounded-xl p-4 mb-6">
        <h2 className="font-bold text-ink mb-2">{copy.pageAboutTitle}</h2>
        <ul className="space-y-2 text-sm text-muted-ink">
          <li className="flex gap-2">
            <span className="text-deep-teal font-bold shrink-0" aria-hidden="true">
              +
            </span>
            <span>{copy.pageAboutIs}</span>
          </li>
          <li className="flex gap-2">
            <span className="text-seal-red font-bold shrink-0" aria-hidden="true">
              &minus;
            </span>
            <span>{copy.pageAboutIsNot}</span>
          </li>
        </ul>
      </div>

      <p className="text-xs text-muted-ink mb-6">{copy.pagePrivacy}</p>

      <Link
        href="/home"
        className="text-sm text-muted-ink underline hover:text-ink inline-block"
      >
        {copy.pageBack}
      </Link>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center py-2" role="status" aria-live="polite">
          <p className="text-base text-muted-ink">...</p>
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
