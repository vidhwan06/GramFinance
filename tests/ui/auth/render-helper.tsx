// @vitest-environment jsdom
import React from 'react';
import { render, type RenderResult } from '@testing-library/react';
import { LanguageProvider } from '@/features/language/hooks/useLanguage';

/**
 * Renders a component inside the real LanguageProvider.
 *
 * The auth components read the active language from the app's own provider, so
 * testing them without it would test a different component.
 */
export function renderWithLanguage(ui: React.ReactElement): RenderResult {
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

/** Renders inside a provider already switched to Kannada. */
export function renderWithKannada(ui: React.ReactElement): RenderResult {
  // Seeded before mount so the provider's hydration effect picks Kannada up on
  // its first pass, avoiding a race with the assertions.
  localStorage.setItem('gramfinance_lang', 'kn');
  const result = render(<LanguageProvider>{ui}</LanguageProvider>);
  localStorage.removeItem('gramfinance_lang');
  return result;
}

export interface StubCall {
  url: string;
  init?: RequestInit;
}

export interface FetchStub {
  calls: StubCall[];
  restore: () => void;
}

/**
 * A `fetch` stub driven by a per-URL handler map.
 *
 * A map rather than a single fixed response, because the auth flow issues
 * different requests to different endpoints: `/api/auth/session` on mount,
 * `/api/auth/sign-in` on tap, and `/api/feedback` on submit. Anything not in
 * the map resolves to a 404 envelope so an unexpected call fails loudly instead
 * of hanging.
 */
export function stubFetchByUrl(
  handlers: Record<string, () => { status: number; body: unknown }>
): FetchStub {
  const calls: StubCall[] = [];

  const fetchMock = async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    const handler = handlers[url];
    const { status, body } = handler
      ? handler()
      : { status: 404, body: { success: false, error: { code: 'NOT_FOUND', message: 'no stub' } } };
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    } as Response;
  };

  const previous = (globalThis as { fetch?: unknown }).fetch;
  (globalThis as { fetch: unknown }).fetch = fetchMock;

  return {
    calls,
    restore: () => {
      if (previous === undefined) delete (globalThis as { fetch?: unknown }).fetch;
      else (globalThis as { fetch: unknown }).fetch = previous;
    },
  };
}

/** Success envelope for GET /api/auth/session. */
export function sessionResponse(signedIn: boolean, userId = '11111111-1111-4111-8111-111111111111') {
  return { status: 200, body: { success: true, data: { signedIn, ...(signedIn ? { userId } : {}) } } };
}

/** Success envelope for POST /api/auth/sign-in. */
export function signInResponse(userId = '11111111-1111-4111-8111-111111111111') {
  return {
    status: 200,
    body: { success: true, data: { signedIn: true, userId, created: true } },
  };
}

/** Failure envelope for POST /api/feedback when there is no session. */
export function unauthorizedResponse() {
  return {
    status: 401,
    body: {
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'You must be signed in to submit feedback.' },
    },
  };
}

/** Success envelope for POST /api/feedback. */
export function feedbackOkResponse() {
  return {
    status: 200,
    body: {
      success: true,
      data: { id: 'abc', module: 'loan', rating: 4, comment: null, createdAt: '2026-01-01' },
    },
  };
}
