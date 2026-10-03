import { FeedbackDashboard } from '@/features/admin/feedback/FeedbackDashboard';
import { AdminAccessDenied } from '@/features/admin/feedback/AdminAccessDenied';
import { requireAdmin } from '@/lib/admin/require-admin';

/**
 * /admin/feedback — the administrator's view of submitted feedback.
 *
 * ── The gate is here, on the server, before anything is sent ─────────────────
 * `requireAdmin()` runs during server rendering, so the dashboard's JavaScript is
 * never shipped to an unauthorized visitor. They receive a short refusal page and
 * no data-fetching code at all — not a dashboard that hides itself, and not a
 * client-side check that could be skipped by disabling JavaScript.
 *
 * This is a per-route check in a Server Component, NOT middleware. Middleware is
 * deliberately only a session refresher in this project (AGENTS.md: "Middleware
 * is a session refresher, NOT a global authorization guard"), and GramFinance is
 * public by default. Authorization stays with the routes that need it.
 *
 * ── Three layers, and each one stands alone ─────────────────────────────────
 *   1. This page refuses to render for a non-admin.
 *   2. `GET /api/admin/feedback` refuses to return rows for a non-admin.
 *   3. Migration 031's `feedback_select_admin` RLS policy filters the rows in the
 *      database itself.
 *
 * Layers 1 and 2 exist so the refusal is *legible* — without them a non-admin
 * would receive an empty dashboard and conclude there was no feedback. Layer 3 is
 * the one that actually protects the data: remove either of the others and the
 * rows are still filtered by the database.
 *
 * ── Not cached, and not statically prerendered ──────────────────────────────
 * The response depends on the session cookie and on a role lookup, so it must be
 * per-request. `force-dynamic` states that explicitly rather than relying on
 * Next.js inferring it, because a page that is ever prerendered by mistake would
 * serve one administrator's cached dashboard to everyone.
 */

export const dynamic = 'force-dynamic';

export default async function AdminFeedbackPage() {
  try {
    await requireAdmin();
  } catch {
    // Reached for both 401 and 403. `AdminAccessDenied` needs to know whether a
    // session exists so a signed-in administrator who has been demoted is not
    // told to sign in; that is read separately and cannot fail the gate, because
    // it only ever influences which heading is shown.
    return <AdminAccessDeniedFallback />;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <FeedbackDashboard />
    </div>
  );
}

/**
 * Distinguishes "signed out" from "signed in without the role" for the refusal
 * copy, without becoming a second authorization decision.
 *
 * It performs no role check and grants nothing: the gate above has already
 * failed, so the only question here is cosmetic. It reuses `createClient` directly
 * rather than `requireAdmin` so a failure to build a client cannot turn into a
 * thrown error during the refusal path.
 */
async function AdminAccessDeniedFallback() {
  const { createClient } = await import('@/lib/supabase/server');

  let signedIn = false;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    signedIn = Boolean(user);
  } catch {
    // If the session cannot even be read, report the neutral signed-out state.
    signedIn = false;
  }

  return <AdminAccessDenied signedIn={signedIn} />;
}