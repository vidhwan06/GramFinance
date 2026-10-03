import { describe, it, expect } from 'vitest';
import { readMigration, stripSqlComments } from '../../helpers/sql';

/**
 * Guards on migration 031, which is the database half of the admin feedback
 * dashboard.
 *
 * This is the file that actually grants an administrator the ability to read
 * every row of `feedback`. That makes it the highest-consequence SQL in the
 * project so far: everything else about the feature — the page, the API, the
 * client — can be removed and the data stays protected, but a mistake *here*
 * publishes user-submitted content to anyone with a session.
 *
 * So the properties are asserted rather than trusted:
 *   1. It is strictly additive: no table altered, no grant changed, no existing
 *      policy dropped or replaced.
 *   2. It adds SELECT and nothing else. An admin read policy that also permitted
 *      INSERT, UPDATE or DELETE would let an administrator forge or erase
 *      feedback, and migration 008's immutability rule would be gone.
 *   3. It is scoped TO authenticated, so it is never evaluated for an anonymous
 *      caller.
 *   4. It gates on the project's own `is_admin()` — not an inline role lookup,
 *      not a table scan of `user_roles`, and never a hard-coded identity.
 *   5. The submission policy survives untouched, because that is the one thing
 *      this feature must never change.
 */

const RAW_SQL = readMigration('031_feedback_admin_read.sql');
const sql = stripSqlComments(RAW_SQL);

/** Every CREATE POLICY statement in the migration. */
function createdPolicies(): string[] {
  return [...sql.matchAll(/CREATE\s+POLICY[^;]*;/gi)].map((m) => m[0]);
}

/** The single policy this migration is supposed to create. */
function adminPolicy(): string {
  const policies = createdPolicies();
  expect(policies, 'expected exactly one new policy').toHaveLength(1);
  return policies[0];
}

describe('migration 031 exists', () => {
  it('is present and not empty', () => {
    expect(RAW_SQL.length).toBeGreaterThan(0);
  });
});

describe('migration 031 is strictly additive', () => {
  it('does not alter any table', () => {
    // Adding a column to feedback would change the shape of data an ordinary
    // user can already read about themselves.
    expect(sql).not.toMatch(/ALTER\s+TABLE\s+public\.feedback\s+(?!ENABLE|DISABLE|FORCE)/i);
  });

  it('changes no grants', () => {
    // `authenticated` already holds SELECT from migration 008 and anon holds
    // none. Widening a grant here would reach past the policy entirely.
    expect(sql).not.toMatch(/\bGRANT\b/i);
    expect(sql).not.toMatch(/\bREVOKE\b/i);
  });

  it('drops no existing policy', () => {
    // `DROP POLICY IF EXISTS` appears immediately before the new CREATE as an
    // idempotency guard, which is fine. What must never appear is a drop of a
    // policy this migration did not create.
    const dropped = [...sql.matchAll(/DROP\s+POLICY[^;]*;/gi)].map((m) => m[0]);
    for (const statement of dropped) {
      expect(statement).toMatch(/feedback_select_admin/i);
    }
  });

  it('never touches the roles table or its helper', () => {
    // user_roles is deny-all with zero policies by design. Any statement here
    // that would alter it, grant on it, or redefine is_admin() would reopen the
    // self-promotion hole migration 011 closed.
    expect(sql).not.toMatch(/ALTER\s+TABLE\s+public\.user_roles/i);
    expect(sql).not.toMatch(/\bON\s+public\.user_roles\b/i);
    expect(sql).not.toMatch(/CREATE\s+(OR\s+REPLACE\s+)?FUNCTION/i);
    expect(sql).not.toMatch(/INSERT\s+INTO\s+public\.user_roles/i);
  });

  it('does not insert or delete any data', () => {
    expect(sql).not.toMatch(/\bINSERT\b/i);
    expect(sql).not.toMatch(/\bUPDATE\b/i);
    expect(sql).not.toMatch(/\bDELETE\b/i);
    expect(sql).not.toMatch(/\bDROP\s+TABLE\b/i);
  });
});

describe('the admin policy grants a read and nothing more', () => {
  it('is named feedback_select_admin on public.feedback', () => {
    const policy = adminPolicy();
    expect(policy).toMatch(/CREATE\s+POLICY\s+"?feedback_select_admin"?/i);
    expect(policy).toMatch(/ON\s+public\.feedback/i);
  });

  it('is FOR SELECT only', () => {
    const policy = adminPolicy();
    expect(policy).toMatch(/FOR\s+SELECT/i);
    // Any of these appearing would mean an administrator could write or erase.
    expect(policy).not.toMatch(/FOR\s+(INSERT|UPDATE|DELETE|ALL)/i);
    expect(policy).not.toMatch(/\bWITH\s+CHECK\b/i);
  });

  it('is scoped TO authenticated', () => {
    expect(adminPolicy()).toMatch(/TO\s+authenticated/i);
    // `anon, authenticated` would expose the rows to signed-out visitors.
    expect(adminPolicy()).not.toMatch(/TO\s+anon\b/i);
  });

  it('gates on the project own is_admin() helper', () => {
    expect(adminPolicy()).toMatch(/USING\s*\(\s*\(\s*SELECT\s+public\.is_admin\(\)\s*\)\s*\)/i);
  });

  it('wraps the helper in a subquery so it is evaluated once per query', () => {
    // `auth.uid()` and `is_admin()` are both wrapped in `(SELECT ...)` in the
    // project's other policies: it turns a per-row call into a cached InitPlan.
    const withoutSubquery = adminPolicy().replace(/USING\s*\(\s*\(\s*SELECT\s+public\.is_admin\(\)\s*\)\s*\)/i, 'USING (public.is_admin())');
    expect(withoutSubquery).not.toBe(adminPolicy());
  });

  it('contains no hard-coded identity', () => {
    // No email, no UUID, no role literal. The answer comes from the caller's JWT.
    expect(sql).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    expect(sql).not.toMatch(/@/);
    expect(sql).not.toMatch(/=\s*'admin'/i);
  });
});

describe('the submission policy is untouched', () => {
  it('never mentions feedback_insert_own', () => {
    // The whole submission flow depends on this policy being exactly as
    // migration 008 left it.
    expect(sql).not.toMatch(/feedback_insert_own/);
  });

  it('never mentions feedback_select_own', () => {
    // Replacing the owner-scoped policy instead of adding alongside it would
    // remove every non-admin's access to their own feedback.
    expect(sql).not.toMatch(/feedback_select_own/);
  });
});

describe('existing admin architecture is reused, not rebuilt', () => {
  it('the helper it depends on already exists and is locked down', () => {
    // Referenced, not redefined — so these guarantees from migrations 011/026
    // are what actually apply.
    const helperMigration = stripSqlComments(readMigration('011_scheme_eligibility_foundation.sql'));
    const lockDown = stripSqlComments(readMigration('026_lock_down_is_admin.sql'));

    expect(helperMigration).toMatch(/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.is_admin\(\)/i);
    expect(helperMigration).toMatch(/SECURITY\s+DEFINER/i);
    expect(helperMigration).toMatch(/GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.is_admin\(\)\s+TO\s+authenticated/i);

    // An anonymous caller must not be able to invoke it at all.
    expect(lockDown).toMatch(/REVOKE\s+EXECUTE\s+ON\s+FUNCTION\s+public\.is_admin\(\)\s+FROM\s+anon/i);
  });
});