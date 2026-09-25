import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';
import { getMissingSupabaseEnvVars, getSupabasePublicEnv } from './env';

/**
 * Browser-side Supabase client.
 *
 * Use this in Client Components ('use client'). Uses the anon key only — never
 * the service role key, which bypasses RLS and must stay server-side.
 *
 * Typed with `Database`, so `.from('schemes')` and every column name, insert
 * shape and returned row are checked at compile time. A typo like
 * `.from('scheme')` or `.select('nam_en')` fails `npx tsc --noEmit`.
 */
export function createClient() {
  const env = getSupabasePublicEnv();

  if (!env) {
    throw new Error(
      `Missing Supabase environment variables: ${getMissingSupabaseEnvVars().join(', ')}. ` +
        'Copy .env.example to .env.local and fill in the NEXT_PUBLIC_* values.'
    );
  }

  return createBrowserClient<Database>(env.url, env.anonKey);
}
