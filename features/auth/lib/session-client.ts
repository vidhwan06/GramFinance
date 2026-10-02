/**
 * Same-origin client calls for the anonymous session feature.
 *
 * Shared by `useAuthState` and by `FeedbackForm` so there is one implementation
 * of each request and one place that knows the response shape.
 *
 * ── No Supabase in the browser ───────────────────────────────────────────────
 * Nothing here imports `@supabase/supabase-js`, `lib/supabase/client` or
 * `lib/supabase/server`. The browser only ever talks to this app's own
 * `/api/auth/*` routes. That is what keeps `connect-src 'self'` correct in
 * next.config.ts and keeps the Supabase project URL out of the client bundle.
 *
 * These functions are deliberately separate from the hook: `FeedbackForm` needs
 * a one-shot sign-in when it is handed a 401, and it must NOT perform a session
 * lookup on mount — that would add a request the feedback form does not need
 * and would couple its behaviour to auth state it is not responsible for.
 */

export interface SessionState {
  signedIn: boolean;
  userId: string | null;
}

async function callAuth<T>(path: string, method: 'GET' | 'POST'): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    // Explicit, because the whole feature depends on the session cookie being
    // sent. A future refactor to a cross-origin URL would otherwise fail
    // silently instead of loudly.
    credentials: 'same-origin',
  });

  const body = await response.json().catch(() => null);

  if (!response.ok || !body || (body as { success?: boolean }).success !== true) {
    const message =
      body && typeof body === 'object' && 'error' in body
        ? String(
            (body as { error?: { message?: unknown } }).error?.message ?? ''
          )
        : '';
    throw new Error(message || 'Request failed.');
  }

  return (body as { data: T }).data;
}

/** Creates (or reuses) the anonymous session. */
export function createAnonymousSession(): Promise<SessionState & { created: boolean }> {
  return callAuth('/api/auth/sign-in', 'POST');
}

/** Ends the session. Safe to call when already signed out. */
export function endAnonymousSession(): Promise<{ signedIn: false }> {
  return callAuth('/api/auth/sign-out', 'POST');
}

/** Reports whether a session exists. Never throws. */
export async function fetchSessionState(): Promise<SessionState> {
  try {
    const data = await callAuth<{ signedIn?: boolean; userId?: string }>(
      '/api/auth/session',
      'GET'
    );
    return {
      signedIn: data.signedIn === true,
      userId: data.signedIn === true ? (data.userId ?? null) : null,
    };
  } catch {
    // A failed lookup is not "signed out": rendering a sign-in prompt to someone
    // who already has a session would be wrong. The caller gets the neutral
    // state and the server remains the authority either way.
    return { signedIn: false, userId: null };
  }
}
