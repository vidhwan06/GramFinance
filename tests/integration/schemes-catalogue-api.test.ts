import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it, vi } from 'vitest';

/**
 * Live integration test for the published scheme catalogue.
 *
 * Covers the read path end to end: `GET /api/schemes` and the Supabase access
 * the Server Components share with it.
 */

vi.mock('next/headers', () => ({
  cookies: async () => ({
    getAll: () => [],
    setAll: () => undefined,
  }),
}));

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

if (url) process.env.NEXT_PUBLIC_SUPABASE_URL = url;
if (anonKey) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = anonKey;

interface SchemeDto {
  id: string;
  nameEn: string;
  nameKn: string;
  descriptionEn: string;
  descriptionKn: string;
  targetGroups: string[];
  states: string[];
  lastVerified: string;
  status: string;
}

describe.skipIf(skipReason !== null)('published scheme catalogue (live)', () => {
  let GET: () => Promise<Response>;
  let listActiveSchemes: () => Promise<SchemeDto[]>;

  beforeAll(async () => {
    ({ GET } = await import('@/app/api/schemes/route'));
    ({ listActiveSchemes } = await import('@/features/schemes/schemes-service'));
  });

  it('serves the published catalogue over HTTP', async () => {
    const response = await GET();
    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      success: boolean;
      data: { schemes: SchemeDto[]; count: number };
    };

    expect(body.success).toBe(true);
    expect(body.data.schemes.length).toBe(body.data.count);
  });

  it('only ever returns active schemes', async () => {
    const schemes = await listActiveSchemes();
    for (const scheme of schemes) {
      expect(scheme.status, `${scheme.nameEn} must be active`).toBe('active');
    }
  });

  it('never returns an unpublished scheme', async () => {
    const schemes = await listActiveSchemes();
    const urls = schemes.map((s) => s.nameEn).join(' ');

    // PM-KISAN is now active and must appear in the catalogue.
    expect(urls).toMatch(/PM-?KISAN|Kisan Samman/i);
    // The second demo fixture is still draft and must not appear.
    expect(urls).not.toMatch(/farm-credit/i);
  });

  it('returns the bilingual fields a card needs', async () => {
    const schemes = await listActiveSchemes();
    expect(schemes.length).toBeGreaterThan(0);

    for (const scheme of schemes) {
      expect(scheme.nameEn.length).toBeGreaterThan(0);
      expect(scheme.nameKn.length).toBeGreaterThan(0);
      expect(scheme.nameKn).toMatch(/[\u0C80-\u0CFF]/);
      expect(scheme.descriptionEn.length).toBeGreaterThan(0);
      expect(Array.isArray(scheme.targetGroups)).toBe(true);
      expect(Array.isArray(scheme.states)).toBe(true);
      expect(scheme.lastVerified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('reports the same set as a direct anon read, proving RLS is what filters it', async () => {
    const viaService = await listActiveSchemes();
    const response = await fetch(`${url}/rest/v1/schemes?select=id,status`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    });
    const direct = (await response.json()) as Array<{ id: string; status: string }>;

    expect(direct.length).toBe(viaService.length);
    for (const row of direct) {
      expect(row.status).toBe('active');
    }
  });

  it('returns null for a scheme id that is not published', async () => {
    const { getActiveSchemeWithDetails } = await import('@/features/schemes/schemes-service');
    await expect(
      getActiveSchemeWithDetails('3f2504e0-4f89-11d3-9a0c-0305e82c3301')
    ).resolves.toBeNull();
  });

  it('has no duplicate rules for any published scheme', async () => {
    // Regression: seed-demo.sql originally ran three times because it inserted
    // rules with `ON CONFLICT DO NOTHING` against a table whose only unique
    // constraint is a generated id. Every authored rule ended up stored three
    // times and the detail page rendered each one three times.
    const { getActiveSchemeWithDetails } = await import('@/features/schemes/schemes-service');
    const schemes = await listActiveSchemes();

    for (const scheme of schemes) {
      const detail = await getActiveSchemeWithDetails(scheme.id);
      expect(detail, `${scheme.nameEn} should be fetchable`).not.toBeNull();

      const seen = new Map<string, number>();
      for (const rule of detail!.rules) {
        const identity = [
          rule.ruleGroup,
          rule.field,
          rule.operator,
          JSON.stringify(rule.value),
          rule.required,
          rule.priority,
        ].join('|');
        seen.set(identity, (seen.get(identity) ?? 0) + 1);
      }

      const duplicates = [...seen.entries()].filter(([, count]) => count > 1);
      expect(
        duplicates,
        `${scheme.nameEn} has duplicated rules: ${duplicates.map(([k, c]) => `${k} x${c}`).join(', ')}`
      ).toEqual([]);
    }
  });

  it('renders no authored description more than once for a published scheme', async () => {
    const { getActiveSchemeWithDetails } = await import('@/features/schemes/schemes-service');
    const schemes = await listActiveSchemes();

    for (const scheme of schemes) {
      const detail = await getActiveSchemeWithDetails(scheme.id);
      const authored = detail!.rules
        .map((rule) => rule.descriptionEn)
        .filter((value): value is string => Boolean(value));

      for (const description of authored) {
        const occurrences = authored.filter((d) => d === description).length;
        expect(
          occurrences,
          `"${description}" is stored ${occurrences} times on ${scheme.nameEn}`
        ).toBe(1);
      }
    }
  });
});
