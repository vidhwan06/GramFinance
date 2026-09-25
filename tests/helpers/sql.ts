/**
 * Minimal SQL introspection helpers for tests.
 *
 * Regex is the wrong tool for pulling a CHECK constraint body out of a
 * migration: constraint bodies contain nested parentheses and adjacent
 * constraints, so a non-greedy regex happily runs past the end of one CHECK and
 * into the next. That produced false failures while writing the Phase 4A tests.
 *
 * These helpers walk the text and balance parentheses instead.
 *
 * Not a test file — vitest only collects `*.test.ts` / `*.spec.ts`.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** Strip full-line `--` comments so prose cannot be mistaken for SQL. */
export function stripSqlComments(source: string): string {
  return source
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');
}

/**
 * Returns the text between the first `(` after `name` and its matching `)`.
 * Throws if the identifier is absent or the parentheses do not balance.
 */
export function extractBalancedBody(source: string, name: string): string {
  const index = source.indexOf(name);
  if (index === -1) {
    throw new Error(`identifier not found in SQL: ${name}`);
  }

  const open = source.indexOf('(', index);
  if (open === -1) {
    throw new Error(`no opening parenthesis after: ${name}`);
  }

  let depth = 0;
  for (let i = open; i < source.length; i++) {
    const ch = source[i];
    if (ch === '(') depth++;
    else if (ch === ')') {
      depth--;
      if (depth === 0) return source.slice(open + 1, i);
    }
  }

  throw new Error(`unbalanced parentheses after: ${name}`);
}

/** Every single-quoted literal inside a fragment, in source order. */
export function quotedLiterals(fragment: string): string[] {
  return [...fragment.matchAll(/'([^']*)'/g)].map((m) => m[1]);
}

/**
 * Splits a `$$ ... $$` function into its declaration and its body.
 *
 * Needed because `extractBalancedBody` on `FUNCTION foo()` returns the empty
 * string between `(` and `)` — the volatility and SECURITY DEFINER attributes
 * live AFTER the signature, in the declaration, not the body.
 */
export function extractFunction(
  source: string,
  anchor: string
): { declaration: string; body: string } {
  const start = source.indexOf(anchor);
  if (start === -1) {
    throw new Error(`function not found in SQL: ${anchor}`);
  }

  const bodyStart = source.indexOf('$$', start);
  if (bodyStart === -1) {
    throw new Error(`no $$ body found after: ${anchor}`);
  }

  const bodyEnd = source.indexOf('$$', bodyStart + 2);
  if (bodyEnd === -1) {
    throw new Error(`unterminated $$ body after: ${anchor}`);
  }

  return {
    declaration: source.slice(start, bodyStart),
    body: source.slice(bodyStart + 2, bodyEnd),
  };
}

/** Read a migration from the repo, or return '' when it does not exist. */
export function readMigration(fileName: string): string {
  const path = resolve(process.cwd(), 'supabase/migrations', fileName);
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

/** Read a SQL file from the repo's supabase/ directory. */
export function readSqlFile(fileName: string): string {
  const path = resolve(process.cwd(), 'supabase', fileName);
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

/**
 * The field list from a `field IN (...)` CHECK constraint.
 * Returns [] when the constraint is absent, so callers can assert on emptiness.
 */
export function fieldCheckLiterals(sql: string, constraintName: string): string[] {
  if (!sql.includes(constraintName)) return [];
  return quotedLiterals(extractBalancedBody(sql, constraintName));
}
