import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

/**
 * Structural guards for the Schemes frontend.
 *
 * These are not style checks. They enforce the architecture the module is
 * required to keep:
 *
 *   1. eligibility is computed on the server, so no client file may import the
 *      engine, the rule evaluator or the tri-state helpers
 *   2. no client file may reach Supabase
 *   3. no frontend file may branch on a specific scheme, which is what keeps
 *      the module data-driven
 *
 * A grep-based test is the honest way to assert (3). There is no runtime
 * behaviour that distinguishes "reads a field from the response" from "branches
 * on a scheme name", so the only place that can be checked is the source.
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

/** Every file the browser can execute. */
const CLIENT_FILES = [
  ...walk(resolve(ROOT, 'features/schemes/components')),
  ...walk(resolve(ROOT, 'app/(main)/schemes')),
].map((f) => ({ path: relative(ROOT, f).replace(/\\/g, '/'), source: readFileSync(f, 'utf8') }));

/**
 * Strips comments and `import type` statements.
 *
 * Both matter: prose about the engine is not a dependency, and a type-only
 * import is erased at compile time so it never reaches the browser bundle.
 */
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

describe('the frontend contains no eligibility logic', () => {
  it('found the client files to check', () => {
    expect(CLIENT_FILES.length).toBeGreaterThan(0);
  });

  it('never imports the eligibility engine or its helpers', () => {
    const forbidden = [
      'eligibility-engine',
      'rule-evaluator',
      'tri-state',
      'check-eligibility-service',
    ];

    for (const file of CLIENT_FILES) {
      for (const module of forbidden) {
        expect(
          code(file.source),
          `${file.path} must not import ${module}: eligibility is the server's job`
        ).not.toMatch(new RegExp(`from\\s+['"][^'"]*${module}`));
      }
    }
  });

  it('never reads applicant data through a dynamic property access', () => {
    // The registry is legitimately imported for labels and control kinds. What
    // it must never be used for is reading a value off an applicant object by
    // a name that came from somewhere else. Computed access on the form's own
    // state object is fine: that object is built by this module, from registry
    // field names only.
    for (const file of CLIENT_FILES) {
      const source = code(file.source);

      expect(source, `${file.path} must not import readApplicantField`).not.toMatch(
        /readApplicantField/
      );
      expect(source, `${file.path} must not index an applicant dynamically`).not.toMatch(
        /\bapplicant\s*\[/
      );
    }
  });

  it('never imports a Supabase client', () => {
    for (const file of CLIENT_FILES) {
      expect(code(file.source), `${file.path} must not import Supabase`).not.toMatch(
        /from\s+['"]@?\/?(?:lib\/supabase|@supabase)/
      );
    }
  });

  it('never uses the service-role key', () => {
    for (const file of CLIENT_FILES) {
      expect(code(file.source), `${file.path} must not mention the service role`).not.toMatch(
        /SERVICE_ROLE/i
      );
    }
  });
});

describe('the frontend is data-driven, not scheme-specific', () => {
  const schemeIdentifiers =
    /DEMO_SCHEME|PM-?KISAN|pmkisan|DEMO_SCHEME_00|example\.invalid|education-loan|farm-credit/;

  for (const file of CLIENT_FILES) {
    it(`${file.path} contains no scheme-specific identifier`, () => {
      expect(code(file.source)).not.toMatch(schemeIdentifiers);
    });
  }

  it('no client file branches on a scheme identity', () => {
    for (const file of CLIENT_FILES) {
      expect(
        code(file.source),
        `${file.path} must not compare a scheme against a literal`
      ).not.toMatch(/\b(scheme|schemeId)\s*===|\b(scheme|schemeId)\s*!==/);
    }
  });

  it('no client file hard-codes a document or an official URL', () => {
    for (const file of CLIENT_FILES) {
      const source = code(file.source);
      expect(source, `${file.path} must not hard-code a document name`).not.toMatch(
        /Aadhaar|Income Certificate|Land Records|Pan Card/i
      );
      expect(source, `${file.path} must not hard-code a government URL`).not.toMatch(
        /https?:\/\/[^'"\s]*\.(?:gov|nic|ac\.in)/i
      );
    }
  });
});

describe('the engine stays server-side', () => {
  it('the eligibility engine is not imported by anything under components/', () => {
    for (const file of CLIENT_FILES) {
      expect(code(file.source)).not.toMatch(
        /from\s+['"][^'"]*eligibility-engine['"]/
      );
    }
  });

  it('the form module that builds the payload is itself free of verdicts', () => {
    const path = resolve(ROOT, 'features/schemes/eligibility/form-fields.ts');
    const source = code(readFileSync(path, 'utf8'));
    // It may name these in comments, but never as a value it constructs.
    for (const forbidden of ['verdict', 'isEligible', 'failedRules', 'passedRules']) {
      expect(
        source.includes(`'${forbidden}'`) || source.includes(`${forbidden}:`),
        `form-fields.ts must not construct "${forbidden}"`
      ).toBe(false);
    }
  });
});
