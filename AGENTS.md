# GramFinance — Agent Guide

Next.js 15 (App Router), React 19, TypeScript, Tailwind, Supabase, Vitest. Bilingual (`en` / `kn`) digital financial safety & literacy app for rural households (VTU B.E. community project).

## Commands

```bash
npm run dev                                            # http://localhost:3000
npm run build                                          # also runs lint + typecheck
npm test                                               # vitest run — 278 tests / 14 files
npx tsc --noEmit                                       # there is NO `typecheck` script
npx vitest run tests/unit                              # offline only, no network
npx vitest run -t "Money Utilities"                    # single test by name
SUPABASE_SKIP_LIVE_TESTS=1 npm test                    # skip the live-network Supabase suite
```

- No CI (`.github/` absent) and no pre-commit hooks — verification is on you.
- `npm run lint` prints a `next lint is deprecated` warning (removed in Next 16); `npm test` prints a Vite `configLoader: 'native'` warning. Both are harmless noise, not failures.
- `tests/integration/supabase-connection.test.ts` hits the **real** Supabase project over the network using the anon key. It skips itself when `.env.local` holds placeholders, but runs live otherwise — so a network outage fails the suite.
- Copy `.env.example` → `.env.local` first. Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are read; `GEMINI_API_KEY` / `SUPABASE_SERVICE_ROLE_KEY` are declared but unused.
- Commits on `main` use Conventional Commits (`feat:`, `chore:`).

## Implementation status — check before assuming a feature exists

**Only the loan calculator is implemented end to end.** Everything else is scaffold:

- All 5 routes in `app/api/*` are stubs echoing `{ message: '... placeholder ready.' }`.
- `features/fraud/` contains **only `types.ts`**. There is no `features/fraud/engine/` and no deterministic rules engine (an earlier version of this file wrongly claimed one). `/check` renders a placeholder card.
- No page or component calls `fetch`, Gemini, Tesseract, or a Supabase client. The clients in `lib/supabase/*` are wired and typed but only exercised by the integration test.
- `middleware.ts` calls `supabase.auth.getUser()` on every request but no-ops when the Supabase env vars are missing, so the app renders fine with no backend.

## Supabase

- Schema lives in `supabase/migrations/001`–`011`. `001`–`010` are applied to the live project; **`011` is not** — until `supabase db push` runs it, `schemes.status` and `scheme_rules` do not exist and three integration tests fail by design.
- RLS is on for every table. `lessons` / `schemes` / `fraud_patterns` / `scheme_rules` are public **active-only** reads; `quizzes` is authenticated-only; `users` / `feedback` are owner-scoped; **`user_roles` has RLS on with ZERO policies and ZERO client grants** — deny-all, so self-promotion has no code path at all. Do not add a policy or grant to it without reading the reasoning in migration 011.
- **Never use the service-role key client-side.** No service-role client exists; do not add one to `client.ts`. The anon key + session cookie is what applies RLS.
- **Never put a role/admin column on `public.users`.** Migration 008 lets a user `UPDATE` their own row, so a `role` column there would be self-promotion. `public.is_admin()` (SECURITY DEFINER, `search_path = ''`) reads `user_roles` instead.
- `types/database.ts` uses `type` aliases, **not `interface`** — the SDK's `GenericTable` needs an implicit index signature, and interfaces silently collapse every row type to `never` while still compiling.
- Typing catches bad insert shapes, wrong value types, unselected columns and invalid enum literals. It does **not** catch a wrong table name in `.from()` or a typo'd column in `.select()` — check those by hand.
- `@supabase/ssr` must stay on a version whose peer range matches the installed `supabase-js` (currently `^0.12.7` / `^2.114.0`). Mismatched versions degrade row types to `never` and `skipLibCheck` hides it.

`GEMINI_API_KEY` must stay server-side: Gemini calls belong in `app/api/` route handlers only, never in client components. Extend the loan engine and the existing `components/ui` + `components/common` kit rather than inventing a parallel path.

## Schemes (Phase 4A–4C)

- **The eligibility engine and its API exist; the UI does not.** There is no schemes page, form or result component yet. `app/(main)/schemes/*` are still placeholders.
- `features/schemes/eligibility/field-registry.ts` is the **closed allow-list** of fields a rule may reference. Always read applicant values through `readApplicantField()` — never `applicant[rule.field]`, which is a prototype-pollution primitive. The same list is a CHECK constraint on `scheme_rules.field`; a test asserts the two stay identical.
- **Units differ by design.** The loan engine is integer **paise**. The schemes engine is **rupees**. Convert only at the integration boundary. There must be no `* 100` / `/ 100` inside the eligibility code — a test greps for it.
- **Groups are AND-combined**; `groupOperator` is the operator *inside* a group. OR-combining groups lets a failed hard limit be cancelled by an unrelated passing group, which tells users they may qualify for a scheme whose ceiling they exceed. Alternatives belong in a single OR group.
- **A missing applicant value is `unknown`, never `fail`.** `NOT_IN` over an absent value must not resolve to a pass.
- **Eligibility is server-side only.** `POST /api/schemes/eligibility` uses the anon-key server client with the caller's session, so RLS applies to it exactly as in the browser. Never add a service-role client, and never let a client submit a result — the Zod request schema is `.strict()`, so `verdict`/`eligible` are rejected outright.
- `applicant-schema.ts` is **derived from the field registry**, not hand-written, so a field only has to be added in one place.
- `schemes.target_groups` is **browse/filter metadata only**. Eligibility truth is `scheme_rules`.
- Public catalogue shows `status = 'active'` only. PM-KISAN is deliberately `draft` because its facts were last verified `2026-01-15`; publish it only after real re-verification, and never invent a verification date.
- `supabase/seed-demo.sql` holds clearly-labelled `DEMO_SCHEME_*` fixtures (one `active`, one `draft`) used by the RLS tests. They are **not real schemes** — never show them to users or copy their rules into real records.
- Rules are structured data only: no JS, no `eval`, no `Function`. Never let a rule row contain code.
- Domain language is deliberately cautious — `eligible` / `potentially_eligible` / `not_eligible`, and copy must never promise approval. The API returns the disclaimer in the response body so a client cannot forget it.

## Loan engine (`features/loan/engine/`) — the load-bearing code

All internal amounts are **integer paise**; rupees exist only at the UI boundary.

- Convert/format with `toPaise` / `toRupees` / `formatPaiseINR` (`engine/utils/money.ts`); round with `roundToNearestPaise` (half-up) and `roundRate` (4 dp). Never do float money math or `toFixed`.
- `runLoanPipeline(config)` (`engine/pipeline.ts`) is the single entry point: validate → process fees → amortization → prepayment scenarios. It **throws** on invalid config; callers (`useLoanCalculator`, `useLoanComparison`) `try/catch` and render `null`.
- Fee treatments are load-bearing, not cosmetic (`engine/models/fee-model.ts`):
  - `capitalized` → added to `startingPrincipalPaise` (you repay it)
  - `deducted-disbursement` → subtracted from `netDisbursedAmountPaise` (what you actually receive)
  - `upfront-flat` / `upfront-percentage` → `separatelyPaidFeesPaise`
  - `totalCostPaise = totalInterestPaise + totalFeesPaise`, but `totalCashOutflowPaise = totalRepaymentPaise + separatelyPaidFeesPaise`. Do not conflate them.
- Invariants asserted by tests and relied on by the UI — preserve them when editing the engine:
  - final `closingBalancePaise === 0`
  - `sum(principalPaidPaise) === startingPrincipalPaise`
  - `rows.length === tenureMonths` when there are no prepayments
  - flat-rate total interest = `principal × rate% × years`, spread evenly with the remainder pushed into the final month
- `compareLoans` always reports `difference: b - a`; the UI labels it "Copy A → B" / "Difference (B - A)". Don't flip the sign.
- Prepayment evaluates **both** `reduce-emi` and `reduce-tenure` neutrally and renders both. That is a product requirement (financial-safety app, no steering) — don't recommend one.

### V1 vs V2

`features/loan/lib/*` are thin V1 compat wrappers delegating to `engine/pipeline.ts`. Only `validate-loan.ts` holds standalone V1 logic, with different limits (principal ≤ 1 crore, tenure ≤ 360, `processingFee` required). Put new math in `engine/`, not `lib/`. `tests/unit/loan/loan-calculator.test.ts` (V1, range-based assertions) is the canary for rounding changes.

## i18n

- `TranslationKeys` is `typeof en` (`features/language/translations/en.ts`). Adding a key to `en.ts` without the mirror in `kn.ts` breaks `tsc` — always edit both files together.
- Only chrome/nav copy uses `useLanguage().t`. Feature pages do inline `kn ? '…' : '…'` ternaries or a feature-local dictionary (`features/loan/presentation/dictionary.ts`). Match the surrounding file; don't migrate feature copy into `translations/` unasked.
- Language is client state in `localStorage` under `gramfinance_lang`, default `en`, hydrated in a `useEffect` → expect a one-render English flash on load. `app/layout.tsx` hardcodes `<html lang="en">` and never updates it on switch.

## API routes

- Return `successResponse(data, status?)` / `errorResponse(err)` from `lib/api/response.ts`; throw `ApiError` built with `ErrorFactories.*` (`lib/api/errors.ts`). Envelope is `{ success, data | error, meta: { timestamp } }` (`types/api.ts`).
- `lib/supabase/server.ts` `createClient()` is **async** (`await cookies()`); the browser client in `client.ts` is not. Both use the anon key — no service-role helper exists yet.

## Database

- Migrations are plain numbered SQL in `supabase/migrations/` (`001_` … `006_`) plus `supabase/seed.sql`. There is no `supabase/config.toml` and no local Supabase CLI setup — apply them by hand.
- `types/database.ts` is hand-maintained, not generated; update it in the same change as a migration. It has already drifted: `DbQuiz.lesson_id` is typed non-nullable but the column is nullable.

## Misc traps

- `@/*` maps to the **repo root** (both `tsconfig.json` and `vitest.config.ts`), so imports are `@/features/…`, not `@/src/…`.
- `tailwind.config.ts` `content` only globs `app/`, `components/`, `features/` — a new top-level directory's classes won't be generated.
- `tailwind.config.ts` has a corrupt value: `warning.50: '#fffbe finished'`. Any `bg-warning-50` / `border-warning-50` emits broken CSS; use `warning.500/600/700`.
- Windows: PowerShell `Get-Content` mangles this repo's UTF-8 (`₹` and Kannada text come out as garbage). The files are correct — read with a UTF-8 aware tool and do not "fix" mojibake you see in the terminal.
- Product guardrail: keep output plain-language for low-literacy users, avoid dark patterns, and keep the cybercrime helpline `1930` (`lib/utils/constants.ts`) surfaced on fraud content.
