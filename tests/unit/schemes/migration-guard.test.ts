import { describe, it, expect } from 'vitest';
import {
  extractBalancedBody,
  extractFunction,
  fieldCheckLiterals,
  quotedLiterals,
  readMigration,
  readSqlFile,
  stripSqlComments,
} from '../../helpers/sql';
import {
  ALL_RULE_OPERATORS,
  ARRAY_OPERATORS,
  ELIGIBILITY_DISCLAIMER_EN,
  ELIGIBILITY_DISCLAIMER_KN,
  type RuleOperator,
  type SchemeStatus,
} from '@/features/schemes/types';
import { SCHEME_FIELD_NAMES } from '@/features/schemes/eligibility/field-registry';

/**
 * Phase 4A migration and domain-shape guards.
 *
 * "This migration is additive" is a safety property, so it is asserted rather
 * than claimed in prose. A future edit that adds a DROP or a data-destroying
 * statement to migration 011 fails here instead of in production.
 */

const RAW_SQL = readMigration('011_scheme_eligibility_foundation.sql');
const sql = stripSqlComments(RAW_SQL);
const sql012 = stripSqlComments(readMigration('012_contains_scalar_value.sql'));
const demoSeed = stripSqlComments(readSqlFile('seed-demo.sql'));

describe('SQL introspection helpers work', () => {
  it('extracts a body with nested parentheses without running past the end', () => {
    const body = extractBalancedBody(
      "CONSTRAINT t CHECK (a IN (1, 2) AND b = 'x')",
      'CONSTRAINT t'
    );
    expect(body).toBe("a IN (1, 2) AND b = 'x'");
  });

  it('throws a useful error for a missing identifier', () => {
    expect(() => extractBalancedBody('SELECT 1', 'nope')).toThrow(/not found/i);
  });
});

describe('migration 011 is additive', () => {
  it('exists', () => {
    expect(RAW_SQL.length).toBeGreaterThan(0);
  });

  it('contains no destructive schema or data operations', () => {
    const forbidden: Array<[string, RegExp]> = [
      ['DROP TABLE', /\bDROP\s+TABLE\b/i],
      ['DROP COLUMN', /\bDROP\s+COLUMN\b/i],
      ['ALTER TABLE ... DROP CONSTRAINT', /\bALTER\s+TABLE\s+[\w.]+\s+DROP\s+CONSTRAINT\b/i],
      ['TRUNCATE', /\bTRUNCATE\b/i],
      ['DELETE FROM', /\bDELETE\s+FROM\b/i],
      // No row may be modified. PM-KISAN reaches 'draft' via the column DEFAULT.
      ['UPDATE of any table', /\bUPDATE\s+(public\.)?\w+\s+SET\b/i],
    ];

    for (const [label, pattern] of forbidden) {
      expect(
        pattern.test(sql),
        `migration 011 must not perform a ${label} — Phase 4A is additive only`
      ).toBe(false);
    }
  });

  it('does not recreate or retype the schemes table', () => {
    // Precise: must not match public.scheme_rules or public.scheme_roles.
    expect(sql).not.toMatch(/CREATE\s+TABLE\s+(IF\s+NOT\s+EXISTS\s+)?public\.schemes\s*\(/i);
    expect(sql).not.toMatch(/ALTER\s+COLUMN/i);
  });

  it('does not add the deferred columns', () => {
    // slug and updated_at were explicitly deferred in Phase 4A decision 6.
    expect(sql).not.toMatch(/ADD\s+COLUMN[^;]*\bslug\b/i);
    expect(sql).not.toMatch(/ADD\s+COLUMN[^;]*updated_at/i);
  });

  it('wraps its work in a single transaction', () => {
    expect(sql).toMatch(/^\s*BEGIN\s*;/m);
    expect(sql.trimEnd()).toMatch(/COMMIT\s*;$/);
  });
});

describe('migration 011 structure', () => {
  it('adds the status column with a safe default', () => {
    expect(sql).toMatch(
      /ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+status\s+TEXT\s+NOT\s+NULL\s+DEFAULT\s+'draft'/i
    );
  });

  it('constrains status to the four approved values', () => {
    const values = quotedLiterals(extractBalancedBody(sql, 'schemes_status_check')).sort();
    expect(values).toEqual(['active', 'draft', 'expired', 'inactive']);
  });

  it('constrains the operator set to exactly the V1 operators', () => {
    const values = quotedLiterals(extractBalancedBody(sql, 'scheme_rules_operator_check')).sort();
    const expected: RuleOperator[] = ['=', '!=', '>', '>=', '<', '<=', 'IN', 'NOT_IN', 'CONTAINS'];
    expect(values.sort()).toEqual([...expected].sort());
  });

  it('allows only the two approved rule types', () => {
    const values = quotedLiterals(extractBalancedBody(sql, 'scheme_rules_rule_type_check')).sort();
    expect(values).toEqual(['eligibility', 'loan_terms']);
  });

  it('allows only AND / OR for group operators', () => {
    const values = quotedLiterals(extractBalancedBody(sql, 'scheme_rules_group_operator_check')).sort();
    expect(values).toEqual(['AND', 'OR']);
  });

  it('restricts value JSONB to types the operator set can consume', () => {
    const values = quotedLiterals(extractBalancedBody(sql, 'scheme_rules_value_type_check')).sort();
    expect(values).toEqual(['array', 'boolean', 'number', 'string']);
  });

  it('links scheme_rules to schemes with ON DELETE CASCADE', () => {
    expect(sql).toMatch(
      /scheme_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+public\.schemes\(id\)\s+ON\s+DELETE\s+CASCADE/i
    );
  });

  it('links user_roles to auth.users, never to public.users', () => {
    expect(sql).toMatch(/REFERENCES\s+auth\.users\(id\)\s+ON\s+DELETE\s+CASCADE/i);
  });

  it('indexes the foreign key column on scheme_rules', () => {
    // PostgreSQL does not index the referencing side of an FK automatically.
    expect(sql).toMatch(/CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_scheme_rules_scheme_group/i);
  });

  it('constrains rule_group to positive integers', () => {
    const body = extractBalancedBody(sql, 'scheme_rules_group_positive_check');
    expect(body).toMatch(/rule_group\s*>=\s*1/);
  });
});

describe('user_roles cannot be self-managed', () => {
  it('enables RLS on user_roles', () => {
    expect(sql).toMatch(/ALTER\s+TABLE\s+public\.user_roles\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i);
  });

  it('grants nothing on user_roles to anon or authenticated', () => {
    const grants = [...sql.matchAll(/GRANT[^;]*ON\s+public\.user_roles[^;]*;/gi)].map((m) => m[0]);
    expect(grants, 'user_roles must have no client grants').toEqual([]);
    expect(sql).toMatch(/REVOKE\s+ALL\s+ON\s+public\.user_roles\s+FROM\s+anon,\s*authenticated/i);
  });

  it('creates no policy on user_roles at all', () => {
    const policies = [...sql.matchAll(/CREATE\s+POLICY[^;]*ON\s+public\.user_roles[^;]*;/gi)];
    expect(policies, 'user_roles must have zero policies (deny-all)').toEqual([]);
  });

  it('defines is_admin() as a safe SECURITY DEFINER helper', () => {
    const { declaration, body } = extractFunction(sql, 'FUNCTION public.is_admin()');

    // Attributes live in the declaration, after the signature.
    expect(declaration).toMatch(/RETURNS\s+BOOLEAN/i);
    expect(declaration).toMatch(/LANGUAGE\s+sql/i);
    expect(declaration).toMatch(/\bSTABLE\b/i);
    expect(declaration).toMatch(/SECURITY\s+DEFINER/i);
    // Empty search_path: nothing resolvable from an attacker-influenced schema.
    expect(declaration).toMatch(/SET\s+search_path\s*=\s*''/i);
    // No parameters, so it cannot be used to pass or modify anything.
    expect(declaration).toMatch(/is_admin\(\)\s*RETURNS/i);

    // Read-only by construction: it selects and returns a boolean, nothing else.
    expect(body).toMatch(/SELECT\s+EXISTS/i);
    expect(body).not.toMatch(/\b(INSERT|UPDATE|DELETE)\b/i);
  });

  it('locks is_admin() down to authenticated callers only', () => {
    expect(sql).toMatch(/REVOKE\s+ALL\s+ON\s+FUNCTION\s+public\.is_admin\(\)\s+FROM\s+PUBLIC/i);
    expect(sql).toMatch(
      /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.is_admin\(\)\s+TO\s+authenticated/i
    );
  });
});

describe('public scheme reads are restricted to active', () => {
  it('replaces the migration 008 catch-all policy with a status filter', () => {
    expect(sql).toMatch(/DROP\s+POLICY\s+IF\s+EXISTS\s+"schemes_select_public"/i);
    expect(sql).toMatch(
      /CREATE\s+POLICY\s+"schemes_select_active"[\s\S]*?USING\s*\(\s*status\s*=\s*'active'\s*\)/i
    );
  });

  it('scopes scheme_rules reads to rules of active schemes', () => {
    const policyIndex = sql.indexOf('CREATE POLICY "scheme_rules_select_active"');
    expect(policyIndex, 'scheme_rules_select_active not found').toBeGreaterThan(-1);

    const body = extractBalancedBody(sql.slice(policyIndex), 'USING');
    expect(body).toMatch(/status\s*=\s*'active'/i);
    expect(body).toMatch(/scheme_id\s+IN/i);
  });

  it('grants no client write path on scheme_rules', () => {
    expect(sql).toMatch(
      /REVOKE\s+INSERT,\s*UPDATE,\s*DELETE\s+ON\s+public\.scheme_rules\s+FROM\s+anon,\s*authenticated/i
    );
  });
});

describe('demo seed provides the active/draft fixture pair', () => {
  it('exists and creates exactly two schemes', () => {
    expect(demoSeed.length).toBeGreaterThan(0);
    const inserts = [...demoSeed.matchAll(/INSERT\s+INTO\s+public\.schemes/gi)];
    expect(inserts.length).toBe(2);
  });

  it('labels both schemes as DEMO and non-real, in both languages', () => {
    // Two schemes, each with an English and a Kannada name = 4 literals.
    const names = quotedLiterals(demoSeed).filter(
      (v) => v.includes('DEMO_SCHEME') && v.includes('—')
    );
    expect(names).toHaveLength(4);

    for (const name of names) {
      const markedInEnglish = name.toUpperCase().includes('NOT A REAL SCHEME');
      const markedInKannada = name.includes('ಡೆಮೊ');
      expect(
        markedInEnglish || markedInKannada,
        `"${name}" is not labelled as demo/non-real data`
      ).toBe(true);
    }

    // Exactly two distinct scheme identifiers.
    const ids = new Set(names.map((n) => n.match(/DEMO_SCHEME_\d+/)?.[0]));
    expect([...ids].sort()).toEqual(['DEMO_SCHEME_001', 'DEMO_SCHEME_002']);
  });

  it('labels both descriptions as DEMO DATA', () => {
    const descriptions = quotedLiterals(demoSeed).filter((v) => v.startsWith('DEMO DATA'));
    expect(descriptions.length).toBeGreaterThanOrEqual(2);
  });

  it('seeds one active and one draft scheme', () => {
    expect(demoSeed).toMatch(/'active'\s*\)\s*ON\s+CONFLICT/i);
    expect(demoSeed).toMatch(/'draft'\s*\)\s*ON\s+CONFLICT/i);
  });

  it('uses example.invalid URLs so demo data can never be mistaken for real', () => {
    const urls = quotedLiterals(demoSeed).filter((v) => v.startsWith('http'));
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) {
      expect(url).toContain('example.invalid');
    }
  });

  it('is idempotent via a UNIQUE conflict target', () => {
    expect(demoSeed).toMatch(/ON\s+CONFLICT\s+\(official_url\)\s+DO\s+UPDATE/i);
  });

  it('expresses monetary rule values in rupees, with no paise conversion', () => {
    // 500000 = ₹5,00,000. The loan engine's paise convention must not appear.
    expect(demoSeed).toMatch(/'500000'::jsonb/);
    const code = demoSeed.split(/\r?\n/).filter((l) => !l.trim().startsWith('--')).join('\n');
    expect(code).not.toMatch(/\*\s*100\b/);
    expect(code).not.toMatch(/\/\s*100\b/);
  });
});

describe('domain constants match the database', () => {
  it('array operators align with the value-shape CHECK (migration 012)', () => {
    expect([...ARRAY_OPERATORS].sort()).toEqual(['IN', 'NOT_IN']);
    // Migration 012 is the current authority for the shape constraint. 011 holds
    // the original, narrower version and must not be edited after being applied.
    const shape = extractBalancedBody(sql012, 'scheme_rules_value_shape_check');
    const literals = quotedLiterals(shape);
    expect(literals).toEqual(expect.arrayContaining(['IN', 'NOT_IN', 'CONTAINS']));
  });

  it('migration 012 widens CONTAINS and leaves the rest intact', () => {
    const literals = quotedLiterals(
      extractBalancedBody(sql012, 'scheme_rules_value_shape_check')
    );

    // CONTAINS is no longer forced to an array, which is what made it unusable.
    expect(literals).toContain('CONTAINS');
    // IN / NOT_IN still require an array; scalar operators still refuse one.
    for (const operator of ['IN', 'NOT_IN', '=', '!=', '>', '>=', '<', '<=']) {
      expect(literals).toContain(operator);
    }
  });

  it('migration 012 is a widening and modifies no data', () => {
    // Dropping and recreating a CHECK is a schema relaxation, not a data change.
    expect(sql012).toMatch(/DROP\s+CONSTRAINT\s+IF\s+EXISTS\s+scheme_rules_value_shape_check/i);
    expect(sql012).not.toMatch(/UPDATE\s+[\w.]+\s+SET/i);
    expect(sql012).not.toMatch(/DELETE\s+FROM/i);
    expect(sql012).not.toMatch(/TRUNCATE/i);
    expect(sql012).not.toMatch(/DROP\s+TABLE/i);
    expect(sql012).toMatch(/^\s*BEGIN\s*;/m);
    expect(sql012.trimEnd()).toMatch(/COMMIT\s*;$/);
  });

  it('the TypeScript operator list matches the SQL operator CHECK', () => {
    const sqlOperators = quotedLiterals(
      extractBalancedBody(sql, 'scheme_rules_operator_check')
    );
    expect([...sqlOperators].sort()).toEqual([...ALL_RULE_OPERATORS].sort());
  });

  it('the SQL field CHECK and the TypeScript registry are the same set', () => {
    // Read the latest migration that defines the field CHECK (014 widens 011)
    const sql014 = readMigration('014_add_pmkisan_fields.sql');
    const sqlFields = fieldCheckLiterals(sql014, 'scheme_rules_field_check');
    expect(sqlFields.length).toBeGreaterThan(0);
    expect([...sqlFields].sort()).toEqual([...SCHEME_FIELD_NAMES].sort());
  });

  it('exposes the four scheme statuses', () => {
    const statuses: SchemeStatus[] = ['draft', 'active', 'inactive', 'expired'];
    expect(statuses).toHaveLength(4);
  });

  it('ships bilingual eligibility disclaimers that avoid approval language', () => {
    for (const text of [ELIGIBILITY_DISCLAIMER_EN, ELIGIBILITY_DISCLAIMER_KN]) {
      expect(text.length).toBeGreaterThan(20);
      // The module is a matching assistant, never an authority.
      expect(text.toLowerCase()).not.toMatch(
        /\b(guaranteed|guarantee approval|you will be approved|definitely eligible)\b/
      );
    }
    expect(ELIGIBILITY_DISCLAIMER_KN).not.toBe(ELIGIBILITY_DISCLAIMER_EN);
    expect(ELIGIBILITY_DISCLAIMER_KN).toMatch(/[\u0C80-\u0CFF]/);
  });
});
