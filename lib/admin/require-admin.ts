import { createClient } from '@/lib/supabase/server';
import { ErrorFactories } from '@/lib/api/errors';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

/**
 * The one place in the project that answers "is this caller an administrator?".
 *
 * ── Why the project's own `is_admin()` and not a check of our own ────────────
 * The role already exists in the database: migration 011 created
 * `public.user_roles` (RLS on, ZERO policies, `REVOKE ALL` from anon and
 * authenticated) and `public.is_admin()`, a SECURITY DEFINER function that reads
 * that table for `auth.uid()`. Re-implementing the question in TypeScript — an
 * allow-list of emails, a claim in the session, an env var — would create a
 * second, weaker answer to an authorization question, and the migration is
 * explicit that this function exists precisely so that no second one is needed.
 * So the application asks the database and trusts that answer.
 *
 * Two properties make that safe to rely on:
 *   * `is_admin()` is `SECURITY DEFINER`, so it can read `user_roles` even though
 *     no client role can. It resolves the caller's role from the validated JWT,
 *     never from anything the caller supplied.
 *   * Its EXECUTE grant is `authenticated` only (migration 011, tightened by
 *     026). An anonymous caller cannot invoke it, so it cannot be used as an
 *     oracle for "is this account an admin".
 *
 * ── Why the explicit check is not redundant with RLS ─────────────────────────
 * RLS alone would answer a signed-in non-admin's read with HTTP 200 and an EMPTY
 * list, because a missing policy filters silently rather than erroring
 * (migration 008 documents this: "Missing POLICY -> zero rows returned, HTTP 200
 * (SILENT)"). An admin UI cannot tell that apart from "nobody has submitted
 * feedback yet", so it would show an empty dashboard instead of saying "you are
 * not an administrator". Checking `is_admin()` first turns a silent empty state
 * into an explicit 403.
 *
 * The policy in migration 031 remains the actual enforcement. This check is what
 * makes the refusal *legible*; deleting the policy would still protect the data,
 * and deleting this check would merely make the refusal confusing again.
 *
 * ── Ordering, and what each status means ────────────────────────────────────
 *   401  no valid session          — the caller has not proven who they are
 *   403  valid session, not an admin — proven identity, insufficient role
 *   500  the role lookup itself failed — an infrastructure fault, not a verdict
 *
 * The 401/403 split is deliberate and is the same reason the feedback submission
 * route authenticates before it validates: an unauthenticated caller learns only
 * that authentication is required, and never learns whether admin functionality
 * exists or what it contains.
 *
 * `getUser()`, never `getSession()`: the token is revalidated against the auth
 * server, so a forged or tampered cookie cannot report itself as signed in.
 *
 * ── Service role ────────────────────────────────────────────────────────────
 * The client returned here is the ordinary anon-key server client carrying the
 * caller's own session cookie. RLS applies to it exactly as it does in the
 * browser. There is deliberately no service-role helper here, so an admin read
 * cannot bypass RLS even for a caller who is an administrator.
 */

export interface AdminContext {
  supabase: SupabaseClient<Database>;
  /** The authenticated administrator's `auth.users` id. */
  userId: string;
}

/**
 * Authenticates the caller and asserts they hold the `admin` role.
 *
 * @throws {ApiError} 401 when unauthenticated, 403 when not an administrator,
 *   500 when the role lookup fails.
 */
export async function requireAdmin(): Promise<AdminContext> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw ErrorFactories.unauthorized('You must be signed in to view this page.');
  }

  const { data: isAdmin, error: roleError } = await supabase.rpc('is_admin');

  if (roleError) {
    // Log the code only. The message and details can name the table and the
    // constraint, which is schema disclosure with no diagnostic value here.
    console.error('[admin] role lookup failed', { code: roleError.code });
    throw ErrorFactories.internal('Could not verify permissions. Please try again.');
  }

  // `data` is a scalar here, but a null means the lookup did not actually
  // resolve to a verdict. Treating that as "not an admin" would deny a real
  // administrator on a transient fault; treating it as "yes" would be the
  // opposite failure. Denying is the safe direction.
  if (isAdmin !== true) {
    throw ErrorFactories.forbidden('You do not have access to this page.');
  }

  return { supabase, userId: user.id };
}