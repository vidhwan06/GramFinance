import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

/**
 * Structural guards for the anonymous authentication feature.
 *
 * These are not style checks. Each one enforces an architectural invariant that
 * nothing at runtime would catch, and that a well-meaning future change would
 * otherwise break silently:
 *
 *   1. The browser must never import a Supabase client. This is what keeps
 *      `connect-src 'self'` correct in next.config.ts and keeps the Supabase
 *      project URL out of the client bundle. If a client component ever
 *      imports supabase-js directly, sign-in works in development and fails in
 *      production behind CSP, with an error that points nowhere useful.
 *
 *   2. The browser must never import the server client, which awaits cookies()
 *      and only works in a request scope.
 *
 *   3. `lib/supabase/client.ts` must stay unused. It is a correct, fully typed
 *      file, which is exactly why it is dangerous: it is the most natural place
 *      for someone to start. Guard (1) already covers it, and this makes the
 *      intent explicit.
 *
 *   4. connect-src must remain self-only.
 *
 *   5. Authorization must use getUser(), never getSession(). getSession() reads
 *      a cookie without revalidating it, so trusting it for an authorization
 *      decision would be a real vulnerability.
 *
 *   6. Middleware must not have grown into a global authorization redirect.
 *
 * A source-level assertion is the honest way to test all of these. There is no
 * runtime behaviour that distinguishes "imports supabase-js" from "does not".
 */

const ROOT = process.cwd();

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

/** Strips comments and `import type`, which never reach the browser bundle. */
function code(source: string): string {
  return source
    .split(/\r?\n/)
    .filter((line) => {
      const t = line.trim();
      return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*');
    })
    .filter((line) => !/^import\s+type\b/.test(line.trim()))
    .join('\n');
}

/** Every file the browser can execute. */
const CLIENT_FILES = [
  ...walk(resolve(ROOT, 'features')),
  ...walk(resolve(ROOT, 'app')),
  ...walk(resolve(ROOT, 'components')),
  ...walk(resolve(ROOT, 'lib/utils')),
]
  .map((f) => ({
    path: relative(ROOT, f).replace(/\\/g, '/'),
    raw: readFileSync(f, 'utf8'),
  }))
  // A client COMPONENT is a file carrying the 'use client' directive. Server
  // modules legitimately live under features/ and app/ too — load-scheme-rules
  // imports the server client by design — so filtering on the directive is what
  // separates "runs in the browser" from "runs on the server".
  .filter((f) => /^\s*['"]use client['"]/m.test(f.raw))
  .map((f) => ({ path: f.path, source: code(f.raw) }));

function read(relPath: string): string {
  return readFileSync(resolve(ROOT, relPath), 'utf8');
}

describe('no client component reaches Supabase directly', () => {
  it('found the client files to check', () => {
    expect(CLIENT_FILES.length).toBeGreaterThan(10);
  });

  it('no client file imports @supabase/supabase-js or @supabase/ssr', () => {
    for (const file of CLIENT_FILES) {
      expect(
        /from\s+['"]@supabase\//.test(file.source),
        `${file.path} imports a Supabase package directly. The browser must go through /api/auth/* instead.`
      ).toBe(false);
    }
  });

  it('no client file imports lib/supabase/server', () => {
    for (const file of CLIENT_FILES) {
      expect(
        /from\s+['"]@\/lib\/supabase\/server['"]/.test(file.source),
        `${file.path} imports the server Supabase client. It awaits cookies() and is server-only.`
      ).toBe(false);
    }
  });

  it('no client file imports lib/supabase/client', () => {
    for (const file of CLIENT_FILES) {
      expect(
        /from\s+['"]@\/lib\/supabase\/client['"]/.test(file.source),
        `${file.path} imports the browser Supabase client, which does not exist in this project by design.`
      ).toBe(false);
    }
  });

  it('keeps lib/supabase/client.ts unreferenced anywhere outside itself', () => {
    // It remains in the repo as a documented, correct module, but nothing may
    // use it. A future contributor must add an architecture-guard exception
    // consciously rather than wiring it up by accident.
    const referencing = CLIENT_FILES.filter((f) =>
      /@\/lib\/supabase\/client/.test(f.source)
    );
    expect(referencing.map((f) => f.path)).toEqual([]);
  });
});

describe('CSP stays self-only', () => {
  const config = read('next.config.ts');

  it("declares connect-src as 'self' with no third-party origin", () => {
    // The capture deliberately excludes the surrounding quotes, so the value is
    // `self` rather than `'self'`.
    const match = config.match(/connect-src '([^']*)'/);
    expect(match, 'next.config.ts should define a connect-src directive').not.toBeNull();
    const value = match![1];
    expect(value.split(/\s+/)).toEqual(['self']);
    // No scheme-qualified origin may appear.
    expect(value).not.toMatch(/https?:\/\//);
    expect(value).not.toContain('supabase');
  });
});

describe('authorization uses getUser(), never getSession()', () => {
  /**
   * Routes that make an authorization or identity decision, and so must
   * revalidate the token with the auth server.
   *
   * `sign-out` is deliberately absent: it revokes whatever refresh token the
   * cookie holds and does not need to know who the user is. Requiring getUser()
   * there would be asserting an implementation that has no purpose.
   */
  const authRoutes = [
    'app/api/feedback/route.ts',
    'app/api/auth/sign-in/route.ts',
    'app/api/auth/session/route.ts',
  ];

  it('every identity-deciding route calls getUser()', () => {
    for (const route of authRoutes) {
      expect(read(route), `${route} should call getUser()`).toContain('getUser()');
    }
  });

  it('no auth route uses getSession() for an authorization decision', () => {
    for (const route of [...authRoutes, 'app/api/auth/sign-out/route.ts']) {
      expect(
        /auth\.getSession\(/.test(read(route)),
        `${route} must not call getSession() — it reads a cookie without revalidating it.`
      ).toBe(false);
    }
  });

  it('the feedback route authenticates BEFORE validating the body', () => {
    const route = read('app/api/feedback/route.ts');
    const authIndex = route.indexOf('auth.getUser()');
    const validateIndex = route.indexOf('feedbackInputSchema.safeParse');
    expect(authIndex).toBeGreaterThan(-1);
    expect(validateIndex).toBeGreaterThan(-1);
    expect(
      authIndex,
      'getUser() must run before safeParse so anonymous callers learn nothing about the schema.'
    ).toBeLessThan(validateIndex);
  });

  it('the feedback route still takes user_id from the session, not the body', () => {
    const route = read('app/api/feedback/route.ts');
    expect(route).toContain('user_id: user.id');
    // A body-sourced user id would defeat the whole RLS model.
    expect(route).not.toMatch(/user_id:\s*(payload|parsed\.data|body|applicant)\b/);
  });
});

describe('middleware is a session refresher, not an authorization guard', () => {
  const middleware = read('lib/supabase/middleware.ts');

  it('uses getClaims() for the refresh pass, not getUser()', () => {
    expect(middleware).toContain('getClaims()');
    expect(
      /await\s+supabase\.auth\.getUser\(\)/.test(middleware),
      'Middleware should validate locally via getClaims(); getUser() is a network round trip per request.'
    ).toBe(false);
  });

  it('contains no redirect', () => {
    // GramFinance is public by default. A redirect here would lock anonymous
    // visitors out of pages that are supposed to work without a session.
    expect(middleware).not.toContain('NextResponse.redirect');
    expect(middleware).not.toContain('NextResponse.rewrite');
  });

  it('re-emits refreshed cookies on the response it returns', () => {
    // Regression guard for the subtle bug where a fresh NextResponse is built
    // and the refreshed cookies are dropped on the floor.
    expect(middleware).toContain('supabaseResponse = NextResponse.next({ request })');
    expect(middleware).toContain('supabaseResponse.cookies.set');
  });
});

describe('no service-role credential is used anywhere in the auth feature', () => {
  it('never references SUPABASE_SERVICE_ROLE_KEY', () => {
    const authFiles = [
      ...walk(resolve(ROOT, 'app/api/auth')),
      ...walk(resolve(ROOT, 'features/auth')),
    ].map((f) => readFileSync(f, 'utf8'));
    for (const source of authFiles) {
      expect(source).not.toContain('SERVICE_ROLE');
    }
  });
});
