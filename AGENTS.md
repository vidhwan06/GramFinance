# GramFinance — Agent Guide

Next.js 15 (App Router), React 19, TypeScript, Tailwind, Supabase, Vitest. Bilingual (`en` / `kn`) digital financial safety & literacy app for rural households (VTU B.E. community project).

## Commands

```bash
npm run dev                                            # http://localhost:3000
npm run build                                          # also runs lint + typecheck
npm test                                               # vitest run — 26 tests / 3 files
npx tsc --noEmit                                       # there is NO `typecheck` script
npx vitest run tests/unit/loan/engine.test.ts          # single file
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

- Schema lives in `supabase/migrations/001`–`010`. `001`–`009` are applied to the live project; **`010` is not** — until `supabase db push` runs it, `public.quizzes` still grants SELECT to `anon` (RLS filters it to zero rows, so no data leaks, but the privilege layer disagrees) and one integration test fails by design.
- RLS is on for all six tables; `users` / `feedback` are owner-scoped, `lessons` / `schemes` / `fraud_patterns` are public reads, `quizzes` is authenticated-only.
- **Never use the service-role key client-side.** No service-role client exists; do not add one to `client.ts`. The anon key + session cookie is what applies RLS.
- `types/database.ts` uses `type` aliases, **not `interface`** — the SDK's `GenericTable` needs an implicit index signature, and interfaces silently collapse every row type to `never` while still compiling.
- Typing catches bad insert shapes, wrong value types, unselected columns and invalid enum literals. It does **not** catch a wrong table name in `.from()` or a typo'd column in `.select()` — check those by hand.
- `@supabase/ssr` must stay on a version whose peer range matches the installed `supabase-js` (currently `^0.12.7` / `^2.114.0`). Mismatched versions degrade row types to `never` and `skipLibCheck` hides it.

`GEMINI_API_KEY` must stay server-side: Gemini calls belong in `app/api/` route handlers only, never in client components. Extend the loan engine and the existing `components/ui` + `components/common` kit rather than inventing a parallel path.

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
