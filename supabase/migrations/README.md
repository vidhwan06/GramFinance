# Supabase migrations

Numbered SQL applied in order by `supabase db push`. The Supabase CLI records
what it has applied in `supabase_migrations.supabase_migrations`, keyed by the
**numeric prefix of the filename**, and applies pending files in that numeric
order.

## 019 is reserved. Do not create it.

The sequence is `001`-`018`, then `020`-`028`. **There is no `019`**, and that is
deliberate, not a lost file.

Three migrations were authored as 018/019, then renumbered during development so
that the number matched their real position in the sequence. The renumbering
renamed the files but left their header comments behind, which is why
`020_fix_malformed_rule_trees.sql`, `021_ganga_kalyana_scheme.sql` and
`022_pm_vishwakarma_rule_tree.sql` each briefly self-declared a number they did
not have. Those headers have since been corrected. Their **bodies were never
modified** and must not be: all of them are applied to the live project.

**Why the slot must stay empty.** `supabase db push` works out what to apply by
comparing the local directory against what the ledger already records, then
applying whatever is missing. It does not check that a pending file sorts
*before* everything already applied -- it only checks that it is missing.

So if a file named `019_*.sql` is added today, the CLI would see one pending
migration, apply it, and do so *after* `028` in wall-clock terms, even though
`019` sorts first in the directory listing. Nothing errors. Nothing warns. A data
migration meant to run before a schema migration would simply run after it, and
the damage would surface later as corrupt or missing data rather than as a
migration error.

**What to do instead.** Number the next migration `029`. If a number between 001
and 028 is ever needed for a genuine reason, it must be applied by hand and
recorded, not dropped into this directory.

## Applied state

As of migration `028`, migrations `001`-`018` and `020`-`028` are all applied to
the linked live project. Verify with:

```
supabase migration list --linked
```

A healthy run shows matching `local` and `remote` versions for every file and no
pending migration.

## Rules for editing this directory

- **Never edit the body of an applied migration.** Local files and remote state
  are reconciled by version number, not by checksum, so an edit will not be
  detected or re-applied -- it will simply diverge from what is actually running
  in production. Corrections belong in a new migration.
- **Corrections to comments in an applied migration are safe**, because SQL
  comments are inert. This is the only kind of edit permitted on a file listed
  as applied.
- **Every migration is idempotent** (`IF NOT EXISTS`, `IF EXISTS`, `ON CONFLICT`
  DO NOTHING) so it can safely run against a fresh local database, a malformed
  live database, or an already-correct one.
- **Migrations change the privilege layer and the schema only.** Application
  logic belongs in `lib/`, `features/` and `app/`.
- **Never put a secret in a migration.** Seeds and fixtures use clearly-labelled
  `DEMO_*` placeholder values; see `supabase/seed-demo.sql`. The
  `DEMO_SCHEME_*` rows there are test fixtures, not real schemes, and must never
  be shown to users or copied into real records.

## Related files

- `supabase/config.toml` -- local Supabase CLI configuration. Already sets
  `enable_anonymous_sign_ins = true`, which the live project must also have
  enabled under Authentication -> Providers -> Anonymous.
- `supabase/seed.sql` -- reference data for lessons, schemes and fraud patterns.
- `supabase/seed-demo.sql` -- labelled demo fixtures used by the RLS tests.