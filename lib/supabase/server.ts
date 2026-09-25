import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';
import { getMissingSupabaseEnvVars, getSupabasePublicEnv } from './env';

/**
 * Server-side Supabase client for Server Components, Server Actions and
 * Route Handlers.
 *
 * Uses the anon key plus the user's session cookie, so row-level security
 * applies exactly as it does in the browser. It is NOT a privileged client:
 * never use it to bypass RLS. A service-role client would be a separate,
 * server-only module, and does not exist yet.
 *
 * `cookies()` is async in Next.js 15, which is why this is an async function.
 * Callers must `await createClient()`.
 */
export async function createClient() {
  const env = getSupabasePublicEnv();

  if (!env) {
    throw new Error(
      `Missing Supabase environment variables: ${getMissingSupabaseEnvVars().join(', ')}. ` +
        'Copy .env.example to .env.local and fill in the NEXT_PUBLIC_* values.'
    );
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
          );
        } catch {
          // Next.js throws when cookies are written from a Server Component,
          // which only has read access. This is expected, not an error: session
          // refreshes are then persisted by middleware.ts on the next request.
        }
      },
    },
  });
}
