// @vitest-environment jsdom
import React from 'react';
import { render, type RenderResult } from '@testing-library/react';
import { LanguageProvider } from '@/features/language/hooks/useLanguage';

/**
 * Renders a component inside the real LanguageProvider.
 *
 * The schemes components read the active language from the app's own provider,
 * so testing them without it would test a different component. English is the
 * default, which keeps assertions readable.
 */
export function renderWithLanguage(ui: React.ReactElement): RenderResult {
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

/** A minimal `fetch` stub returning a fixed JSON body. */
export function stubFetch(
  status: number,
  body: unknown
): { calls: Array<{ url: string; init?: RequestInit }> } {
  const calls: Array<{ url: string; init?: RequestInit }> = [];

  const fetchMock = async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    } as Response;
  };

  (globalThis as { fetch: unknown }).fetch = fetchMock;
  return { calls };
}

export function restoreFetch(): void {
  delete (globalThis as { fetch?: unknown }).fetch;
}
