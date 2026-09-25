/**
 * Single source of truth for the public Supabase connection settings.
 *
 * ── Only ever the ANON key ──────────────────────────────────────────────────
 * `SUPABASE_SERVICE_ROLE_KEY` is deliberately absent from this module and must
 * never be added. The service role bypasses RLS entirely, so anything built
 * with it can read and write every row in the database. It belongs only in
 * server-only code, and no such client exists yet.
 *
 * Next.js inlines `process.env.NEXT_PUBLIC_*` at build time, so reading them
 * here still works inside client components.
 */

export interface SupabasePublicEnv {
  url: string;
  anonKey: string;
}

/**
 * Returns the public Supabase settings, or `null` when they are not configured.
 *
 * Returns `null` rather than throwing so that callers can decide the policy:
 * `client.ts` and `server.ts` want to fail loudly, while `middleware.ts` must
 * degrade gracefully so the rest of the app still renders without a backend.
 */
export function getSupabasePublicEnv(): SupabasePublicEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;

  return { url, anonKey };
}

/** Names of the missing variables, for actionable error messages. */
export function getMissingSupabaseEnvVars(): string[] {
  const missing: string[] = [];
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  return missing;
}
