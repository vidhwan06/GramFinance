import type { AdminFeedbackPage } from '../types';

/**
 * Same-origin client for the admin feedback read API.
 *
 * ── No Supabase in the browser ───────────────────────────────────────────────
 * Imports nothing from `@supabase/*`. The browser talks only to this app's own
 * `/api/admin/feedback`, which is what keeps `connect-src 'self'` correct in
 * next.config.ts and keeps the Supabase project URL out of the client bundle.
 * `tests/unit/auth/auth-architecture-guards.test.ts` enforces that no client
 * component may import Supabase directly.
 *
 * ── Credentials are explicit ────────────────────────────────────────────────
 * `credentials: 'same-origin'` is written out rather than left to the default,
 * because the entire feature depends on the session cookie being sent. A future
 * refactor to a cross-origin URL would otherwise fail silently — reading as "no
 * feedback, not an admin" rather than as an error.
 */

/** Why a read failed, so the UI can tell "try again" from "you cannot see this". */
export type AdminFeedbackErrorKind = 'unauthorized' | 'forbidden' | 'request' | 'network';

export class AdminFeedbackError extends Error {
  readonly kind: AdminFeedbackErrorKind;

  constructor(kind: AdminFeedbackErrorKind, message: string) {
    super(message);
    this.name = 'AdminFeedbackError';
    this.kind = kind;
    Object.setPrototypeOf(this, AdminFeedbackError.prototype);
  }
}

export interface LoadAdminFeedbackOptions {
  page: number;
  pageSize: number;
  signal?: AbortSignal;
}

/**
 * Reads one page of feedback.
 *
 * @throws {AdminFeedbackError} `unauthorized` (401), `forbidden` (403),
 *   `request` (any other non-2xx) or `network`.
 */
export async function loadAdminFeedbackPage({
  page,
  pageSize,
  signal,
}: LoadAdminFeedbackOptions): Promise<AdminFeedbackPage> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });

  let response: Response;
  try {
    response = await fetch(`/api/admin/feedback?${params.toString()}`, {
      method: 'GET',
      credentials: 'same-origin',
      signal,
    });
  } catch (error) {
    // An aborted request is not a failure to report; the caller has moved on.
    if (error instanceof Error && error.name === 'AbortError') throw error;
    throw new AdminFeedbackError('network', 'Could not reach the server.');
  }

  const body = (await response.json().catch(() => null)) as
    | { success?: boolean; data?: AdminFeedbackPage; error?: { message?: unknown } }
    | null;

  if (response.status === 401) {
    throw new AdminFeedbackError('unauthorized', 'Sign in required.');
  }
  if (response.status === 403) {
    throw new AdminFeedbackError('forbidden', 'You do not have access.');
  }
  if (!response.ok || !body || body.success !== true || !body.data) {
    const message =
      body && typeof body.error?.message === 'string' ? body.error.message : 'Request failed.';
    throw new AdminFeedbackError('request', message);
  }

  return body.data;
}