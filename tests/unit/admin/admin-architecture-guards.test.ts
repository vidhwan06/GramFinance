import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Architectural guards for the admin feedback dashboard.
 *
 * Each of these enforces an invariant that no runtime test in this repository can
 * observe, and that a well-meant future change would otherwise break quietly:
 *
 *   1. The page gate is server-side. A client-side check is bypassed by
 *      disabling JavaScript; a server check is not.
 *   2. Middleware must not have grown into an authorization guard. GramFinance is
 *      public by default and AGENTS.md records that middleware is a session
 *      refresher only. An admin route is exactly where someone would be tempted
 *      to add a global redirect.
 *   3. No client component may reach Supabase, which would break `connect-src
 *      'self'` and leak the project URL into the bundle.
 *   4. Authorization must use getUser(), never getSession().
 *   5. No service-role credential may appear anywhere in the admin feature. An
 *      admin read that bypasses RLS would make migration 031 decorative.
 *   6. The admin role must not be derived from anything a caller supplies — no
 *      email allow-list, no header, no query parameter, no env var of user ids.
 *   7. The dashboard must not be linked from public navigation. Not a security
 *      control — but publishing the admin area's location in the header for every
 *      visitor is a discovery change nobody asked for.
 */

const ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), 'utf8');
}

const FILES = {
  page: 'app/(main)/admin/feedback/page.tsx',
  route: 'app/api/admin/feedback/route.ts',
  requireAdmin: 'lib/admin/require-admin.ts',
  service: 'features/admin/feedback/feedback-service.ts',
  query: 'features/admin/feedback/query.ts',
  client: 'features/admin/feedback/lib/admin-feedback-client.ts',
  dashboard: 'features/admin/feedback/FeedbackDashboard.tsx',
  bootstrap: 'supabase/admin-bootstrap.sql',
};

describe('the admin files exist', () => {
  it('every file under test is present', () => {
    for (const [name, path] of Object.entries(FILES)) {
      expect(existsSync(resolve(ROOT, path)), `${name} (${path})`).toBe(true);
    }
  });
});

describe('the page gate is server-side', () => {
  it('the page is a Server Component, not a client one', () => {
    // 'use client' here would move the check into the browser, where disabling
    // JavaScript or editing the bundle skips it entirely.
    expect(read(FILES.page)).not.toMatch(/^\s*['"]use client['"]/m);
  });

  it('the page calls the shared admin check', () => {
    expect(read(FILES.page)).toContain('requireAdmin');
  });

  it('the page does not render the dashboard for a failed check', () => {
    const source = read(FILES.page);
    const gate = source.indexOf('await requireAdmin()');
    const render = source.indexOf('<FeedbackDashboard');
    expect(gate).toBeGreaterThan(-1);
    expect(render).toBeGreaterThan(-1);
    // The gate appears before the render in the source, and the catch returns
    // the refusal, so the dashboard is unreachable on failure.
    expect(gate).toBeLessThan(render);
    expect(source).toContain('AdminAccessDenied');
  });

  it('the page is never statically prerendered', () => {
    // A page that is ever prerendered would serve one administrator's dashboard
    // to everyone from the cache.
    expect(read(FILES.page)).toMatch(/export const dynamic\s*=\s*'force-dynamic'/);
  });
});

describe('authorization revalidates the session', () => {
  it('uses getUser(), never getSession()', () => {
    // getSession() reads a cookie without revalidating it, so trusting it for an
    // authorization decision is a real vulnerability.
    for (const file of [FILES.requireAdmin, FILES.route]) {
      expect(read(file)).toContain('getUser()');
      expect(read(file), file).not.toMatch(/auth\.getSession\(/);
    }
  });

  it('distinguishes 401 from 403', () => {
    const source = read(FILES.requireAdmin);
    expect(source).toContain('ErrorFactories.unauthorized');
    expect(source).toContain('ErrorFactories.forbidden');
    // getUser() must run before the role lookup.
    expect(source.indexOf('getUser()')).toBeLessThan(source.indexOf("rpc('is_admin')"));
  });

  it('reuses the database helper rather than reimplementing the question', () => {
    const source = read(FILES.requireAdmin);
    expect(source).toContain("rpc('is_admin')");
    // The roles table is mentioned in the prose explaining WHY it is not queried,
    // so assert on an actual query rather than on the word appearing.
    expect(source).not.toMatch(/\.from\(\s*['"]user_roles['"]/);
  });
});

describe('no identity is hard-coded or caller-supplied', () => {
  const sources = [FILES.requireAdmin, FILES.route, FILES.service, FILES.query];

  it('no email allow-list anywhere in the feature', () => {
    for (const file of sources) {
      expect(read(file), file).not.toMatch(/@[\w-]+\.\w+/);
    }
  });

  it('no UUID literal anywhere in the feature', () => {
    for (const file of sources) {
      expect(read(file), file).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    }
  });

  it('no role supplied by a header, cookie or query parameter', () => {
    for (const file of [FILES.requireAdmin, FILES.route]) {
      const source = read(file);
      expect(source, file).not.toMatch(/headers\.get\(['"](?:x-|role|admin)/i);
      expect(source, file).not.toMatch(/cookies\(\).*role/);
    }
  });

  it('the bootstrap SQL contains a placeholder, not a real id', () => {
    // The runbook must not commit an environment-specific user id.
    expect(read(FILES.bootstrap)).toContain('00000000-0000-0000-0000-000000000000');
  });

  it('the bootstrap SQL is not a migration', () => {
    // A data operation in supabase/migrations/ would permanently consume a
    // migration number and enter the ledger.
    expect(existsSync(resolve(ROOT, 'supabase/migrations/031_feedback_admin_read.sql'))).toBe(true);
    const migrations = readdirSync(resolve(ROOT, 'supabase/migrations'));
    expect(migrations).not.toContain('admin-bootstrap.sql');
    expect(migrations.some((f) => f.startsWith('031_'))).toBe(true);
  });
});

describe('no service-role credential is used', () => {
  it('the admin feature never mentions a service-role key', () => {
    for (const file of Object.values(FILES)) {
      if (file === FILES.bootstrap) continue;
      expect(read(file), file).not.toMatch(/SERVICE_ROLE/);
    }
  });

  it('the server client used is the ordinary anon-key one', () => {
    expect(read(FILES.requireAdmin)).toContain("@/lib/supabase/server");
  });
});

describe('the browser never reaches Supabase', () => {
  it('the dashboard and the client import no Supabase package', () => {
    for (const file of [FILES.dashboard, FILES.client]) {
      expect(read(file), file).not.toMatch(/from\s+['"]@supabase\//);
      expect(read(file), file).not.toMatch(/@\/lib\/supabase\//);
    }
  });

  it('the client sends the session cookie explicitly', () => {
    // The whole feature depends on it; a refactor to a cross-origin URL would
    // otherwise fail silently as "no access".
    expect(read(FILES.client)).toContain("credentials: 'same-origin'");
  });
});

describe('middleware stays a session refresher', () => {
  const middleware = read('lib/supabase/middleware.ts');

  it('contains no redirect or rewrite', () => {
    expect(middleware).not.toContain('NextResponse.redirect');
    expect(middleware).not.toContain('NextResponse.rewrite');
  });

  it('does not mention the admin route', () => {
    // Admin authorization belongs in the route/page, not in the middleware that
    // every public request passes through.
    expect(middleware).not.toMatch(/admin/i);
  });
});

describe('the admin area is not advertised', () => {
  it('no public navigation component links to it', () => {
    // Discoverability is not the security control — the API and RLS are — but
    // adding the link to shared chrome would publish the admin area's location
    // to every visitor, which is not part of this feature.
    const navigation = [
      'components/layout/Header.tsx',
      'components/layout/BottomNavigation.tsx',
      'components/layout/SiteFooter.tsx',
      'app/(main)/page.tsx',
      'app/(main)/learn/page.tsx',
      'app/(main)/feedback/page.tsx',
    ];

    for (const file of navigation) {
      if (!existsSync(resolve(ROOT, file))) continue;
      expect(read(file), file).not.toMatch(/\/admin/);
    }
  });
});

describe('the existing feedback submission path is untouched', () => {
  it('still exports only POST', () => {
    expect(read('app/api/feedback/route.ts')).toMatch(/export async function POST/);
    expect(read('app/api/feedback/route.ts')).not.toMatch(/export async function GET/);
  });

  it('still takes user_id from the session, not the body', () => {
    const route = read('app/api/feedback/route.ts');
    expect(route).toContain('user_id: user.id');
    expect(route).not.toMatch(/user_id:\s*(payload|parsed\.data|body)\b/);
  });

  it('the insertion policy is never referenced by the admin code', () => {
    // The dashboard reads; it must not have grown a write path.
    for (const file of [FILES.route, FILES.service, FILES.requireAdmin]) {
      expect(read(file), file).not.toContain('feedback_insert_own');
    }
  });
});