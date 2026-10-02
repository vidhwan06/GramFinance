# GramFinance — Agent Guide

Next.js 15 (App Router), React 19, TypeScript, Tailwind, Supabase, Vitest. Bilingual (`en` / `kn`) digital financial safety & literacy app for rural households (VTU B.E. community project).

## Commands

```bash
npm run dev                                            # http://localhost:3000
npm run build                                          # also runs lint + typecheck
npm test                                               # vitest run — 678 tests / 42 files
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

**The loan calculator and fraud checker are implemented end to end.** Other features are scaffold:

- **Loan calculator** — complete with V2 engine, UI, comparison, prepayment simulation.
- **Fraud checker (Phase 5)** — complete implementation:
  - Domain types in `lib/fraud/types.ts`
  - Input normalization in `lib/fraud/normalizer.ts`
  - 7 deterministic fraud rules in `lib/fraud/rules/`: `OTP_REQUEST`, `ACCOUNT_ACCESS_REQUEST`, `URGENT_PAYMENT`, `UNOFFICIAL_FEE`, `PERSONAL_UPI`, `SUSPICIOUS_LINK`, `FAKE_GOVERNMENT_CLAIM` — each with negative-pattern guards to avoid flagging educational/warning content
  - Risk scoring in `lib/fraud/risk-calculator.ts`: sum of weights clamped 0–100; bands 0–29 low, 30–59 medium, 60–100 high
  - Recommendations in `lib/fraud/recommendations.ts`: per-signal + general; cybercrime helpline `1930` surfaced
  - Scheme recognition in `lib/fraud/scheme-recognition.ts`: deterministic matching against active schemes from Supabase with alias map
  - Scheme claim analysis in `lib/fraud/scheme-claim-analyzer.ts`: three-state evaluation (`supported`/`contradicted`/`unknown`); absence of info is `unknown`, never `contradicted`
  - Engine orchestration in `lib/fraud/fraud-engine.ts`: normalize → run rules → score → recommend → recognize schemes → analyze claims
  - API route `POST /api/fraud/check` in `app/api/fraud/check/route.ts`: Zod validation (strict), calls engine with active schemes, returns envelope `{success, data, meta}`
  - UI components in `features/fraud/components/`: `FraudChecker` (container), `FraudInput`, `FraudResult`, `FraudRiskSummary`, `FraudSignalList`, `SchemeFindings`, `FraudRecommendations`, `EmptyResult`
  - Full bilingual support via `features/language/translations/en.ts` and `kn.ts`
  - Test coverage: 8 unit, 5 integration, 34 UI tests — all passing
- Other API routes in `app/api/*` (schemes, lessons, feedback, AI) are stubs echoing `{ message: '... placeholder ready.' }`.
- No page or component calls Gemini, Tesseract. Supabase client used only server-side in `/api/fraud/check` for scheme data.
- `middleware.ts` uses `supabase.auth.getClaims()` (local JWT validation, no auth-server round trip) to refresh the session cookie, and no-ops when the Supabase env vars are missing, so the app renders fine with no backend. Its matcher **excludes `/api`** — route handlers refresh on demand via their own writable cookie store.
- Authentication is implemented; see the Authentication section below.

## Authentication (F1 — anonymous sessions)

GramFinance uses **Supabase anonymous sign-in** as its only authentication method. There is no email, password, OTP, phone or OAuth, and no account is ever created.

**Why anonymous, and not real identity.** Every feature that works today is public and stays public: the loan calculator, fraud checker, scheme catalogue, eligibility engine, AI assistant and learning module. The *only* gated feature is submitting feedback, which needs an owner-scoped `user_id` to satisfy the `feedback_insert_own` RLS policy. Full identity would mean collecting a large amount of personal data from a largely low-literacy audience on shared devices and unreliable networks, for one low-stakes action — and it is not currently available anyway: the project allows only 2 emails/hour and has no SMS provider configured. An anonymous session yields a real `auth.users` row with a real UUID, which is exactly what RLS needs, and the UUID is stable if a real credential is ever linked later.

**Hard invariants — breaking any of these is a security regression:**

- **The browser must never contact Supabase directly.** Auth runs through same-origin Route Handlers (`app/api/auth/{sign-in,sign-out,session}`) using `lib/supabase/server`. There is deliberately **no browser Supabase client**: `lib/supabase/client.ts` exists but is imported by nothing and must stay that way. This is what keeps `connect-src 'self'` correct in `next.config.ts` and keeps the project URL out of the client bundle. `tests/unit/auth/auth-architecture-guards.test.ts` enforces it.
- **Protected routes authorize with `getUser()`, never `getSession()`.** `getSession()` reads a cookie without revalidating it, so trusting it for an authorization decision would be a vulnerability.
- **Middleware is a session refresher, NOT a global authorization guard.** It never redirects. GramFinance is public by default; per-route checks live in the route handlers.
- **Never add a role/admin column on `public.users`.** See the Supabase section below — unchanged by this feature.
- **`POST /api/auth/sign-in` is rate limited per client IP** via `lib/api/rate-limit.ts`, before any upstream work. There is deliberately **no shared fallback bucket** (the assistant route's `'anonymous'` fallback is the pattern being avoided): a shared key would let anyone lock the feature out for everyone. If no client IP can be determined the route **fails closed in production** and stays permissive in development, where `next dev` sets no proxy header.
- **Sign-out ends the session only.** It must never delete `public.users` or any `feedback` row. `feedback.user_id` is `ON DELETE SET NULL` (migration 006), so a cascade would silently strip attribution from feedback the team still needs.
- **Never expose tokens in a response body**, and never log a session, token or user identifier. `GET /api/auth/session` returns only `{ signedIn }` and, when true, `{ userId }`.

**No migration was needed.** Every existing policy works unchanged against an anonymous `auth.users` UUID: `feedback_insert_own`, `feedback_select_own`, `users_select_own`, `users_update_own`, and the migration 009 `handle_new_user` trigger, which fires for anonymous signups and auto-provisions the `public.users` profile. `user_roles`, `is_admin()` and the scheme/fraud policies are untouched.

**Configuration.** `supabase/config.toml` sets `enable_anonymous_sign_ins = true`, but that file only configures the **local** Supabase instance. The live project must have the same switch enabled under **Authentication → Providers → Anonymous**; until it is, `POST /api/auth/sign-in` returns `503 AUTH_UNAVAILABLE` and `tests/integration/auth-api.test.ts` self-skips with that reason (it prints a warning so a skipped run is never mistaken for a passing one).

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
- Public catalogue shows `status = 'active'` only. PM-KISAN is `active` after manual verification against https://pmkisan.gov.in/ on 2026-09-30. The 01-02-2019 landholding cutoff, succession-after-death handling, and duplicate-benefit checks remain official-verification-dependent and are NOT automated by GramFinance.
- `supabase/seed-demo.sql` holds clearly-labelled `DEMO_SCHEME_*` fixtures (one `active`, one `draft`) used by the RLS tests. They are **not real schemes** — never show them to users or copy their rules into real records.
- Rules are structured data only: no JS, no `eval`, no `Function`. Never let a rule row contain code.
- Domain language is deliberately cautious — `eligible` / `potentially_eligible` / `not_eligible`, and copy must never promise approval. The API returns the disclaimer in the response body so a client cannot forget it.

## Fraud Checker (Phase 5)

- **Deterministic rules engine** — no ML/LLM in the verdict path. Every signal is explainable via matched pattern, weight, severity, explanation.
- **7 detection rules** in `lib/fraud/rules/`: `OTP_REQUEST`, `ACCOUNT_ACCESS_REQUEST`, `URGENT_PAYMENT`, `UNOFFICIAL_FEE`, `PERSONAL_UPI`, `SUSPICIOUS_LINK`, `FAKE_GOVERNMENT_CLAIM`.
- **Negative-pattern guards** on credential/fee rules — educational/warning messages (e.g., "Never share your OTP") do NOT trigger.
- **Risk scoring** — sum of matched signal weights, clamped 0–100. Bands: 0–29 low, 30–59 medium, 60–100 high.
- **Scheme recognition** — deterministic matching against active schemes from Supabase. Uses normalized name matching + alias map (PM-KISAN, PMUY, PM-VISHWAKARMA, GANGA KALYAN).
- **Scheme claim analysis** — three-state evaluation: `supported` (consistent with scheme data), `contradicted` (conflicts with scheme data), `unknown` (insufficient data to verify). **Absence of info is `unknown`, never `contradicted`**. Language: "The available scheme information does not verify this claim."
- **Recommendations** — per-signal + general. Cybercrime helpline `1930` surfaced when relevant.
- **API** — `POST /api/fraud/check` validates with Zod (strict), calls engine with active schemes, returns `{success, data, meta}`. No service-role key; uses anon-key server client with caller's session.
- **UI** — `FraudChecker` container orchestrates input→result flow. Components: `FraudInput` (validation, char counter, helpline note), `FraudResult` (risk summary, signals, scheme findings, recommendations, disclaimer), `EmptyResult` (calm "no warning signs" + disclaimer, never "safe").
- **Accessibility** — ARIA roles/labels, live regions, color+glyph+text for risk, internal codes never exposed.
- **Bilingual** — all copy in `features/language/translations/en.ts` and `kn.ts`; feature-local dictionaries avoided.
- **Test coverage** — 8 unit (engine, rules, risk, recommendations, normalizer, scheme recognition, claim analysis), 5 integration (API), 34 UI (components, flows) — all passing.
- **Limitations** — no OCR/screenshot upload; phone/UPI/URL input types accepted but rules treat as generic text; `officialUrl` not populated in scheme recognition; no persistence/history; no rate limiting.

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
