'use client';

import { useEffect } from 'react';
import { ErrorState } from '@/components/common/ErrorState';

/**
 * Root error boundary.
 *
 * Next.js renders this in place of the page when a Server Component or a nested
 * client component throws. Without it a failed request produced the default
 * unstyled Next.js screen — no explanation and no way to recover short of a
 * full reload.
 *
 * `reset()` re-renders the failed segment, so "Try again" genuinely retries
 * rather than reloading the app and losing the user's input.
 *
 * ── Why there is no i18n hook here ───────────────────────────────────────────
 * `useLanguage` throws when no `LanguageProvider` is mounted above it. An error
 * boundary that can itself crash while reporting a crash is worse than one that
 * shows English, so this component is intentionally self-contained with no
 * context dependency. The copy below is therefore English-only.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The full detail (including any stack) goes to the server log. Nothing
    // internal is ever rendered to the user.
    console.error('Unhandled application error:', error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <ErrorState
        title="We could not load this page"
        message="Something went wrong while loading. Please check your internet connection and try again. Your loan details have not been lost."
        onRetry={reset}
      />
      {error.digest ? (
        <p className="text-center text-xs text-gray-400 mt-2">
          If this keeps happening, quote reference {error.digest}.
        </p>
      ) : null}
    </div>
  );
}
