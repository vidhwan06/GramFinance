'use client';

/**
 * Client-side session state, sourced from the same-origin session endpoint.
 *
 * ── What this deliberately does NOT import ───────────────────────────────────
 * Not `@supabase/supabase-js`, not `lib/supabase/client`, not
 * `lib/supabase/server`. The browser has no Supabase client at all in this
 * project, which is what keeps `connect-src 'self'` valid in next.config.ts and
 * keeps the Supabase project URL out of the client bundle.
 *
 * ── Not an authorization source ──────────────────────────────────────────────
 * This value is for rendering only. Every route that actually protects
 * something re-checks with `getUser()` server-side, so a stale or forged
 * `signedIn: true` in the browser grants nothing.
 *
 * ── Where it is used ─────────────────────────────────────────────────────────
 * The header and mobile menu controls, and the sign-in page. `FeedbackForm`
 * deliberately does NOT use this hook: it would fire a session lookup on mount
 * that the form has no need for. The form calls `createAnonymousSession()`
 * directly and only after the server has actually returned a 401.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  createAnonymousSession,
  endAnonymousSession,
  fetchSessionState,
} from '../lib/session-client';

export interface AuthState {
  /** True once the session lookup has completed, so "unknown" is distinguishable from "signed out". */
  ready: boolean;
  signedIn: boolean;
  userId: string | null;
  /** True while a sign-in or sign-out request is in flight. */
  pending: boolean;
  /** Set when the last action failed, so a control can offer a retry. */
  error: string | null;
}

const INITIAL: AuthState = {
  ready: false,
  signedIn: false,
  userId: null,
  pending: false,
  error: null,
};

export function useAuthState() {
  const [state, setState] = useState<AuthState>(INITIAL);

  const refresh = useCallback(async () => {
    const session = await fetchSessionState();
    setState({
      ready: true,
      signedIn: session.signedIn,
      userId: session.userId,
      pending: false,
      error: null,
    });
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signIn = useCallback(async (): Promise<boolean> => {
    setState((prev) => ({ ...prev, pending: true, error: null }));
    try {
      const session = await createAnonymousSession();
      setState({
        ready: true,
        signedIn: session.signedIn,
        userId: session.userId,
        pending: false,
        error: null,
      });
      return session.signedIn;
    } catch (err) {
      setState((prev) => ({
        ...prev,
        pending: false,
        ready: true,
        error: err instanceof Error ? err.message : 'Sign-in failed.',
      }));
      return false;
    }
  }, []);

  const signOut = useCallback(async (): Promise<boolean> => {
    setState((prev) => ({ ...prev, pending: true, error: null }));
    try {
      await endAnonymousSession();
      setState({ ready: true, signedIn: false, userId: null, pending: false, error: null });
      return true;
    } catch (err) {
      setState((prev) => ({
        ...prev,
        pending: false,
        error: err instanceof Error ? err.message : 'Sign-out failed.',
      }));
      return false;
    }
  }, []);

  return { ...state, signIn, signOut, refresh };
}
