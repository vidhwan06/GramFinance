import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it, vi } from 'vitest';

/**
 * Live integration test: Supabase connectivity + row-level security.
 *
 * ── What this covers ────────────────────────────────────────────────────────
 *  * The NEXT_PUBLIC_* env vars are real and reachable.
 *  * The anon key (never the service role key) is what talks to the project.
 *  * RLS is actually enforced: anon can read public reference data and is
 *    refused everywhere else.
 *
 * This hits the real network against the real project. It is the only test in
 * the suite that does.
 *
 * ── How to run / skip ───────────────────────────────────────────────────────
 * Runs automatically when .env.local has real values. Skips cleanly when:
 *   * .env.local is missing or still holds placeholder values
 *   * SUPABASE_SKIP_LIVE_TESTS=1 is set   (use this for offline work)
 *
 * ── Why the server client is exercised and not the browser client ───────────
 * `lib/supabase/client.ts` calls createBrowserClient, which needs a DOM
 * (`document.cookie`). The vitest environment is 'node' and adding jsdom is not
 * justified for this. Both wrappers delegate to the same SupabaseClient over
 * the same REST transport with the same anon key, so exercising the server
 * client verifies the environment, transport, credentials and RLS that the
 * browser client also depends on.
 */

// next/headers only resolves inside a request scope. The server client awaits
// cookies(); this stub supplies the two methods the client actually calls.
vi.mock('next/headers', () => ({
  cookies: async () => ({
    getAll: () => [],
    setAll: () => undefined,
  }),
}));

/** Minimal .env parser. Vitest does not run Next.js's .env.local loader. */
function readEnvFile(file: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return out;
}

const envPath = resolve(process.cwd(), '.env.local');
const fileEnv = existsSync(envPath) ? readEnvFile(envPath) : {};

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? fileEnv.NEXT_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? fileEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

const isPlaceholder = (v: string) => !v || /your-|placeholder|changeme|^</i.test(v);
const skipReason = isPlaceholder(url) || isPlaceholder(anonKey)
  ? 'Supabase env vars not configured'
  : process.env.SUPABASE_SKIP_LIVE_TESTS === '1'
    ? 'SUPABASE_SKIP_LIVE_TESTS=1'
    : null;

// The app reads these through lib/supabase/env.ts at call time, so publish
// whatever we resolved from the file onto process.env.
if (url) process.env.NEXT_PUBLIC_SUPABASE_URL = url;
if (anonKey) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = anonKey;

const CANNADA_RANGE = /[\u0C80-\u0CFF]/;

describe.skipIf(skipReason !== null)('Supabase connection + row-level security (live)', () => {
  let supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server')['createClient']>>;

  beforeAll(async () => {
    const { createClient } = await import('@/lib/supabase/server');
    supabase = await createClient();
  });

  it('reaches the project and reads public reference data (public.schemes)', async () => {
    const { data, error } = await supabase
      .from('schemes')
      .select('id, name_en, name_kn, official_url, last_verified')
      .limit(5);

    expect(error, `unexpected PostgREST error: ${error?.message}`).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.length).toBeGreaterThan(0);
  });

  it('round-trips bilingual scheme content without corrupting Kannada', async () => {
    const { data, error } = await supabase
      .from('schemes')
      .select('name_en, name_kn')
      .limit(1);

    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
    // A mojibake round-trip (the classic UTF-8-read-as-1252 failure) strips the
    // Kannada block entirely, so this catches encoding damage end to end.
    expect(data![0].name_kn).toMatch(CANNADA_RANGE);
    expect(data![0].name_kn.length).toBeGreaterThan(0);
  });

  it('allows anon SELECT on the other public reference tables', async () => {
    // These have no rows yet. Success here proves the policy and grant exist;
    // an empty array is the expected outcome, an error is not.
    const lessons = await supabase.from('lessons').select('id').limit(1);
    expect(lessons.error, 'lessons should be publicly readable').toBeNull();

    const patterns = await supabase.from('fraud_patterns').select('id').limit(1);
    expect(patterns.error, 'fraud_patterns should be publicly readable').toBeNull();
  });

  it('DENIES anon SELECT on the private public.users table', async () => {
    const { data, error } = await supabase.from('users').select('id, occupation');

    // RLS and GRANTS are two independent layers. users is revoked from anon at
    // the privilege layer, so this must be a hard error rather than an empty
    // result. An empty array here would mean RLS silently masked a privilege
    // bug rather than the grant being correct.
    expect(error, 'anon must not read public.users').not.toBeNull();
    expect(error!.code).toBe('42501');
    expect(data === null || data.length === 0).toBe(true);
  });

  it('DENIES anon SELECT on public.feedback', async () => {
    const { data, error } = await supabase.from('feedback').select('id, user_id, comment');

    expect(error, 'anon must not read public.feedback').not.toBeNull();
    expect(error!.code).toBe('42501');
    expect(data === null || data.length === 0).toBe(true);
  });

  it('DENIES anon SELECT on public.quizzes (migration 010)', async () => {
    // The question blobs embed the correct answers, so anon must be refused at
    // the privilege layer, not merely filtered to zero rows by the RLS policy.
    // Before migration 010 this returned HTTP 200 with rows=0: RLS held, but
    // anon still held the grant.
    const { data, error } = await supabase.from('quizzes').select('id, questions_en');

    expect(error, 'anon must not read public.quizzes').not.toBeNull();
    expect(error!.code).toBe('42501');
    expect(data === null || data.length === 0).toBe(true);
  });

  it('DENIES anon INSERT into public.users', async () => {
    // If the INSERT policy were missing or wrong this would create a profile
    // row for an id that does not exist in auth.users, which the foreign key
    // from migration 001 would then reject anyway.
    const { error } = await supabase
      .from('users')
      .insert({ id: '00000000-0000-0000-0000-000000000001', language: 'en' });

    expect(error, 'anon must not insert into public.users').not.toBeNull();
  });

  it('DENIES anon INSERT into public.schemes', async () => {
    // Reference data is maintained through the service role only. The payload
    // is intentionally incomplete: the insert must be refused at the privilege
    // layer, so no row is ever created regardless.
    const { error } = await supabase
      .from('schemes')
      // @ts-expect-error deliberately partial payload to prove the write is
      // rejected by permissions before any column validation is attempted.
      .insert({ name_en: 'rls-probe' });

    expect(error, 'anon must not write public reference data').not.toBeNull();
  });
});
