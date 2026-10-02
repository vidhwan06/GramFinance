# GramFinance â€” Agent Guide

Next.js 15 (App Router), React 19, TypeScript, Tailwind, Supabase, Vitest. Bilingual (`en` / `kn`) digital financial safety & literacy app for rural households (VTU B.E. community project).

## Commands

```bash
npm run dev                                            # http://localhost:3000
npm run build                                          # also runs lint + typecheck
npm test                                               # vitest run: unit + UI + integration suite
npx tsc --noEmit                                       # there is NO `typecheck` script
npx vitest run tests/unit                              # offline only, no network
npx vitest run -t "Money Utilities"                    # single test by name
SUPABASE_SKIP_LIVE_TESTS=1 npm test                    # skip the live-network Supabase suite
```

- No CI (`.github/` absent) and no pre-commit hooks â€” verification is on you.
- `npm run lint` prints a `next lint is deprecated` warning (removed in Next 16); `npm test` prints a Vite `configLoader: 'native'` warning. Both are harmless noise, not failures.
- `tests/integration/supabase-connection.test.ts` hits the **real** Supabase project over the network using the anon key. It skips itself when `.env.local` holds placeholders, but runs live otherwise â€” so a network outage fails the suite.
- Copy `.env.example` to `.env.local` first. Read at runtime: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (`lib/supabase/env.ts`), `GEMINI_API_KEY` and `GEMINI_MODEL` (`lib/ai/gemini.ts`). `NEXT_PUBLIC_APP_URL` and `SUPABASE_SERVICE_ROLE_KEY` are listed in `.env.example` as deliberately unused, with the reason.
- Commits on `main` use Conventional Commits (`feat:`, `chore:`).

## Implementation status â€” check before assuming a feature exists

**The loan calculator and fraud checker are implemented end to end.** Other features are scaffold:

- **Loan calculator** â€” complete with V2 engine, UI, comparison, prepayment simulation.
- **Fraud checker (Phase 5)** â€” complete implementation:
  - Domain types in `lib/fraud/types.ts`
  - Input normalization in `lib/fraud/normalizer.ts`
  - 7 deterministic fraud rules in `lib/fraud/rules/`: `OTP_REQUEST`, `ACCOUNT_ACCESS_REQUEST`, `URGENT_PAYMENT`, `UNOFFICIAL_FEE`, `PERSONAL_UPI`, `SUSPICIOUS_LINK`, `FAKE_GOVERNMENT_CLAIM` â€” each with negative-pattern guards to avoid flagging educational/warning content
  - Risk scoring in `lib/fraud/risk-calculator.ts`: sum of weights clamped 0â€“100; bands 0â€“29 low, 30â€“59 medium, 60â€“100 high
  - Recommendations in `lib/fraud/recommendations.ts`: per-signal + general; cybercrime helpline `1930` surfaced
  - Scheme recognition in `lib/fraud/scheme-recognition.ts`: deterministic matching against active schemes from Supabase with alias map
  - Scheme claim analysis in `lib/fraud/scheme-claim-analyzer.ts`: three-state evaluation (`supported`/`contradicted`/`unknown`); absence of info is `unknown`, never `contradicted`
  - Engine orchestration in `lib/fraud/fraud-engine.ts`: normalize â†’ run rules â†’ score â†’ recommend â†’ recognize schemes â†’ analyze claims
  - API route `POST /api/fraud/check` in `app/api/fraud/check/route.ts`: Zod validation (strict), calls engine with active schemes, returns envelope `{success, data, meta}`
  - UI components in `features/fraud/components/`: `FraudChecker` (container), `FraudInput`, `FraudResult`, `FraudRiskSummary`, `FraudSignalList`, `SchemeFindings`, `FraudRecommendations`, `EmptyResult`
  - Full bilingual support via `features/language/translations/en.ts` and `kn.ts`
  - Test coverage: unit, integration and UI suites all passing (no counts recorded here; run `npm test` for the current total)
- All API routes under `app/api/*` are implemented: fraud check, schemes catalogue, schemes eligibility, feedback, assistant, and the auth trio. There is no lessons route.
- No page or component calls Gemini, Tesseract. Supabase client used only server-side in `/api/fraud/check` for scheme data.
- `middleware.ts` uses `supabase.auth.getClaims()` (local JWT validation, no auth-server round trip) to refresh the session cookie, and no-ops when the Supabase env vars are missing, so the app renders fine with no backend. Its matcher **excludes `/api`** â€” route handlers refresh on demand via their own writable cookie store.
- Authentication is implemented; see the Authentication section below.

## Authentication (F1 â€” anonymous sessions)

GramFinance uses **Supabase anonymous sign-in** as its only authentication method. There is no email, password, OTP, phone or OAuth, and no account is ever created.

**Why anonymous, and not real identity.** Every feature that works today is public and stays public: the loan calculator, fraud checker, scheme catalogue, eligibility engine, AI assistant and learning module. The *only* gated feature is submitting feedback, which needs an owner-scoped `user_id` to satisfy the `feedback_insert_own` RLS policy. Full identity would mean collecting a large amount of personal data from a largely low-literacy audience on shared devices and unreliable networks, for one low-stakes action â€” and it is not currently available anyway: the project allows only 2 emails/hour and has no SMS provider configured. An anonymous session yields a real `auth.users` row with a real UUID, which is exactly what RLS needs, and the UUID is stable if a real credential is ever linked later.

**Hard invariants â€” breaking any of these is a security regression:**

- **The browser must never contact Supabase directly.** Auth runs through same-origin Route Handlers (`app/api/auth/{sign-in,sign-out,session}`) using `lib/supabase/server`. There is deliberately **no browser Supabase client**: `lib/supabase/client.ts` exists but is imported by nothing and must stay that way. This is what keeps `connect-src 'self'` correct in `next.config.ts` and keeps the project URL out of the client bundle. `tests/unit/auth/auth-architecture-guards.test.ts` enforces it.
- **Protected routes authorize with `getUser()`, never `getSession()`.** `getSession()` reads a cookie without revalidating it, so trusting it for an authorization decision would be a vulnerability.
- **Middleware is a session refresher, NOT a global authorization guard.** It never redirects. GramFinance is public by default; per-route checks live in the route handlers.
- **Never add a role/admin column on `public.users`.** See the Supabase section below â€” unchanged by this feature.
- **`POST /api/auth/sign-in` is rate limited per client IP** via `lib/api/rate-limit.ts`, before any upstream work. There is deliberately **no shared fallback bucket** (the assistant route's `'anonymous'` fallback is the pattern being avoided): a shared key would let anyone lock the feature out for everyone. If no client IP can be determined the route **fails closed in production** and stays permissive in development, where `next dev` sets no proxy header.
- **Sign-out ends the session only.** It must never delete `public.users` or any `feedback` row. `feedback.user_id` is `ON DELETE SET NULL` (migration 006), so a cascade would silently strip attribution from feedback the team still needs.
- **Never expose tokens in a response body**, and never log a session, token or user identifier. `GET /api/auth/session` returns only `{ signedIn }` and, when true, `{ userId }`.

**No migration was needed.** Every existing policy works unchanged against an anonymous `auth.users` UUID: `feedback_insert_own`, `feedback_select_own`, `users_select_own`, `users_update_own`, and the migration 009 `handle_new_user` trigger, which fires for anonymous signups and auto-provisions the `public.users` profile. `user_roles`, `is_admin()` and the scheme/fraud policies are untouched.

**Configuration.** `supabase/config.toml` sets `enable_anonymous_sign_ins = true`, but that file only configures the **local** Supabase instance. The live project must have the same switch enabled under **Authentication â†’ Providers â†’ Anonymous**; until it is, `POST /api/auth/sign-in` returns `503 AUTH_UNAVAILABLE` and `tests/integration/auth-api.test.ts` self-skips with that reason (it prints a warning so a skipped run is never mistaken for a passing one).

## Rate limiting (F3)

Every IP-scoped API route calls `checkRateLimit` from `lib/api/rate-limit.ts`, using the per-route budgets in `ROUTE_LIMITS`. The bucket store, the expiry sweep and the `MAX_BUCKETS` cap live in `lib/ai/rate-limiter.ts` and are shared. There is exactly one bucket store in the project.

| Route | Limit | Key |
|---|---|---|
| `POST /api/assistant` | 10 / 60s | IP |
| `GET /api/schemes` | 60 / 60s | IP (origin backstop; the CDN is the real control) |
| `GET /api/auth/session` | 60 / 60s | IP |
| `POST /api/fraud/check` | 20 / 60s | IP |
| `POST /api/schemes/eligibility` | 12 / 60s | IP |
| `POST /api/auth/sign-in` | 5 / 60s | IP |
| `POST /api/feedback` | 5 / 60s | **authenticated user id**, never IP |
| `POST /api/auth/sign-out` | none | destroys nothing and is idempotent |

**Hard invariants:**

- **Never introduce a shared fallback bucket key.** The assistant route used to fall back to the literal `'anonymous'`, which is a single global bucket: ten requests from anywhere lock out every user. `checkRateLimit` has no such fallback. Production fails closed with `no_client_ip`; development uses a namespaced `dev:<scope>` bucket. There is a regression test for this.
- **Feedback's limiter must stay after `getUser()`.** An anonymous request must get `401`, never `429`, and the key is the session UUID so one household on a shared IP cannot exhaust another's budget.
- **`resolveClientIp` is the only place `X-Forwarded-For` is parsed.** Rightmost hop only; a leftmost pick lets an attacker prepend a fake entry for a fresh bucket. `X-Real-IP` is the single-value fallback. See the header-trust notes in `lib/api/rate-limit.ts`.
- **429 carries `Retry-After`** via `ApiError.headers`; read it with `retryAfterSeconds`, which is strictly non-mutating so it never counts as traffic.

**Deployment caveat: these limits are NOT globally enforced.** Bucket state lives in the Node process heap, so:

- limits are **per instance**;
- **hot reload resets every bucket** in development;
- a horizontally scaled deployment **multiplies the effective allowance** by the instance count, and cold starts hand out fresh budgets;
- this is **best-effort application-level protection**, not a quota.

A distributed limiter (Redis or equivalent) is a deliberate future decision that depends on the deployment target, which is **currently undefined**: there is no `vercel.json`, `Dockerfile` or `output: 'standalone'`. Do not describe these limits as exact.

`GET /api/schemes` is publicly cacheable (`public, max-age=60, s-maxage=300, stale-while-revalidate=600` plus `ETag`, and `304` on `If-None-Match`). Its response was verified byte-identical across differing IP, `Accept-Language` and a bogus cookie, because RLS filters on `status` rather than on the user and each scheme carries both `en` and `kn` text. That is why **no `Vary`** is set. `force-dynamic` stays on that route because `listActiveSchemes` awaits `cookies()`; caching there is explicit and never framework-driven, which is what keeps a cookie-bearing endpoint from being cached by accident.

## Supabase

- Schema lives in `supabase/migrations/`: `001`-`018`, then `020`-`028`. **All of them are applied to the live project** -- `supabase migration list --linked` reports matching local and remote versions with no pending migration. Use `supabase db push --linked` to apply new ones; do not paste SQL by hand.
- **`019` is intentionally reserved and must never be created.** `supabase db push` only checks whether a file is *missing* from the ledger, not whether it sorts before what is already applied, so a new `019_*.sql` would be applied last -- after `028` -- with no error. Next number is `029`. Read `supabase/migrations/README.md` first.
- **Never edit the body of an applied migration.** Local files and production are reconciled by version number, not checksum, so an edit silently diverges from what is actually running. Correcting a comment is inert and allowed; every other correction belongs in a new migration.
- What the later migrations added, for orientation: `011` scheme eligibility foundation (`scheme_rules`, `user_roles`); `012` scalar helper; `013` dedupe demo rules; `014`-`018` per-scheme fields plus nested rule groups (`rule_groups` / `rule_nodes`); `020`-`023` rule-tree repairs and scheme data; `024`-`025` fraud checker tables and RLS; `026` revoke anon EXECUTE on `is_admin()`; `027` revoke client access to the fraud tables; `028` close the remaining default-privilege gaps (TRUNCATE/REFERENCES/TRIGGER, explicit SELECT on `rule_groups`/`rule_nodes`, revoke EXECUTE on `handle_new_user()` from `anon`/`authenticated`).
- RLS is on for every table. `lessons` / `schemes` / `fraud_patterns` / `scheme_rules` are public **active-only** reads; `quizzes` is authenticated-only; `users` / `feedback` are owner-scoped; **`user_roles` has RLS on with ZERO policies and ZERO client grants** â€” deny-all, so self-promotion has no code path at all. Do not add a policy or grant to it without reading the reasoning in migration 011.
- **Never use the service-role key client-side.** No service-role client exists; do not add one to `client.ts`. The anon key + session cookie is what applies RLS.
- **Never put a role/admin column on `public.users`.** Migration 008 lets a user `UPDATE` their own row, so a `role` column there would be self-promotion. `public.is_admin()` (SECURITY DEFINER, `search_path = ''`) reads `user_roles` instead.
- `types/database.ts` uses `type` aliases, **not `interface`** â€” the SDK's `GenericTable` needs an implicit index signature, and interfaces silently collapse every row type to `never` while still compiling.
- Typing catches bad insert shapes, wrong value types, unselected columns and invalid enum literals. It does **not** catch a wrong table name in `.from()` or a typo'd column in `.select()` â€” check those by hand.
- `@supabase/ssr` must stay on a version whose peer range matches the installed `supabase-js` (currently `^0.12.7` / `^2.114.0`). Mismatched versions degrade row types to `never` and `skipLibCheck` hides it.

`GEMINI_API_KEY` must stay server-side: Gemini calls belong in `app/api/` route handlers only, never in client components. Extend the loan engine and the existing `components/ui` + `components/common` kit rather than inventing a parallel path.

## Schemes (Phase 4Aâ€“4C)

- **The eligibility engine, its API and its UI all exist.** The catalogue is `app/(main)/schemes/page.tsx`; the detail and eligibility journey is `app/(main)/schemes/[schemeId]/page.tsx`; ~30 files under `features/schemes/` hold the components (`SchemeCatalogue`, `SchemeDetailView`, `EligibilityForm`, `EligibilityResult`, `SchemeEligibilityJourney`, `OfficialSourceLink`) and the rule-mapper/engine layer. Do not rebuild any of it.
- `classifyOfficialSource()` in `features/schemes/schemes-service.ts` is the only validation on `schemes.official_url`, and it is a **security boundary**: it permits `http:` and `https:` only, then flags reserved non-resolving TLDs (`.invalid`, `.test`, `.example`, `.localhost`) so the UI can warn. `new URL()` accepts `javascript:` and `data:` with an empty hostname, so the reserved-TLD check alone cannot catch them. A rejected protocol must keep returning an empty `url` so nothing reaches `href`. Keep the allowlist.
- `features/schemes/eligibility/field-registry.ts` is the **closed allow-list** of fields a rule may reference. Always read applicant values through `readApplicantField()` â€” never `applicant[rule.field]`, which is a prototype-pollution primitive. The same list is a CHECK constraint on `scheme_rules.field`; a test asserts the two stay identical.
- **Units differ by design.** The loan engine is integer **paise**. The schemes engine is **rupees**. Convert only at the integration boundary. There must be no `* 100` / `/ 100` inside the eligibility code â€” a test greps for it.
- **Groups are AND-combined**; `groupOperator` is the operator *inside* a group. OR-combining groups lets a failed hard limit be cancelled by an unrelated passing group, which tells users they may qualify for a scheme whose ceiling they exceed. Alternatives belong in a single OR group.
- **A missing applicant value is `unknown`, never `fail`.** `NOT_IN` over an absent value must not resolve to a pass.
- **Eligibility is server-side only.** `POST /api/schemes/eligibility` uses the anon-key server client with the caller's session, so RLS applies to it exactly as in the browser. Never add a service-role client, and never let a client submit a result â€” the Zod request schema is `.strict()`, so `verdict`/`eligible` are rejected outright.
- `applicant-schema.ts` is **derived from the field registry**, not hand-written, so a field only has to be added in one place.
- `schemes.target_groups` is **browse/filter metadata only**. Eligibility truth is `scheme_rules`.
- Public catalogue shows `status = 'active'` only. PM-KISAN is `active` after manual verification against https://pmkisan.gov.in/ on 2026-09-30. The 01-02-2019 landholding cutoff, succession-after-death handling, and duplicate-benefit checks remain official-verification-dependent and are NOT automated by GramFinance.
- `supabase/seed-demo.sql` holds clearly-labelled `DEMO_SCHEME_*` fixtures (one `active`, one `draft`) used by the RLS tests. They are **not real schemes** â€” never show them to users or copy their rules into real records.
- Rules are structured data only: no JS, no `eval`, no `Function`. Never let a rule row contain code.
- Domain language is deliberately cautious â€” `eligible` / `potentially_eligible` / `not_eligible`, and copy must never promise approval. The API returns the disclaimer in the response body so a client cannot forget it.

## Fraud Checker (Phase 5)

- **Deterministic rules engine** â€” no ML/LLM in the verdict path. Every signal is explainable via matched pattern, weight, severity, explanation.
- **7 detection rules** in `lib/fraud/rules/`: `OTP_REQUEST`, `ACCOUNT_ACCESS_REQUEST`, `URGENT_PAYMENT`, `UNOFFICIAL_FEE`, `PERSONAL_UPI`, `SUSPICIOUS_LINK`, `FAKE_GOVERNMENT_CLAIM`.
- **Negative-pattern guards** on credential/fee rules â€” educational/warning messages (e.g., "Never share your OTP") do NOT trigger.
- **Risk scoring** â€” sum of matched signal weights, clamped 0â€“100. Bands: 0â€“29 low, 30â€“59 medium, 60â€“100 high.
- **Scheme recognition** â€” deterministic matching against active schemes from Supabase. Uses normalized name matching + alias map (PM-KISAN, PMUY, PM-VISHWAKARMA, GANGA KALYAN).
- **Scheme claim analysis** â€” three-state evaluation: `supported` (consistent with scheme data), `contradicted` (conflicts with scheme data), `unknown` (insufficient data to verify). **Absence of info is `unknown`, never `contradicted`**. Language: "The available scheme information does not verify this claim."
- **Recommendations** â€” per-signal + general. Cybercrime helpline `1930` surfaced when relevant.
- **API** â€” `POST /api/fraud/check` validates with Zod (strict), calls engine with active schemes, returns `{success, data, meta}`. No service-role key; uses anon-key server client with caller's session.
- **UI** â€” `FraudChecker` container orchestrates inputâ†’result flow. Components: `FraudInput` (validation, char counter, helpline note), `FraudResult` (risk summary, signals, scheme findings, recommendations, disclaimer), `EmptyResult` (calm "no warning signs" + disclaimer, never "safe").
- **Accessibility** â€” ARIA roles/labels, live regions, color+glyph+text for risk, internal codes never exposed.
- **Bilingual** â€” all copy in `features/language/translations/en.ts` and `kn.ts`; feature-local dictionaries avoided.
- **Test coverage** -- unit suites (engine, rules, risk, recommendations, normalizer, scheme recognition, claim analysis), integration suites against the API, and UI suites (components, flows) -- all passing. Counts are deliberately not recorded here; run `npm test` for the current total.
- **Limitations** â€” no OCR/screenshot upload; phone/UPI/URL input types accepted but rules treat as generic text; `officialUrl` not populated in scheme recognition; no persistence/history. Rate limiting is applied at the route (20/60s per IP) - see the Rate limiting section.

## Loan engine (`features/loan/engine/`) â€” the load-bearing code

All internal amounts are **integer paise**; rupees exist only at the UI boundary.

- Convert/format with `toPaise` / `toRupees` / `formatPaiseINR` (`engine/utils/money.ts`); round with `roundToNearestPaise` (half-up) and `roundRate` (4 dp). Never do float money math or `toFixed`.
- `runLoanPipeline(config)` (`engine/pipeline.ts`) is the single entry point: validate â†’ process fees â†’ amortization â†’ prepayment scenarios. It **throws** on invalid config; callers (`useLoanCalculator`, `useLoanComparison`) `try/catch` and render `null`.
- Fee treatments are load-bearing, not cosmetic (`engine/models/fee-model.ts`):
  - `capitalized` â†’ added to `startingPrincipalPaise` (you repay it)
  - `deducted-disbursement` â†’ subtracted from `netDisbursedAmountPaise` (what you actually receive)
  - `upfront-flat` / `upfront-percentage` â†’ `separatelyPaidFeesPaise`
  - `totalCostPaise = totalInterestPaise + totalFeesPaise`, but `totalCashOutflowPaise = totalRepaymentPaise + separatelyPaidFeesPaise`. Do not conflate them.
- Invariants asserted by tests and relied on by the UI â€” preserve them when editing the engine:
  - final `closingBalancePaise === 0`
  - `sum(principalPaidPaise) === startingPrincipalPaise`
  - `rows.length === tenureMonths` when there are no prepayments
  - flat-rate total interest = `principal Ã— rate% Ã— years`, spread evenly with the remainder pushed into the final month
- `compareLoans` always reports `difference: b - a`; the UI labels it "Copy A â†’ B" / "Difference (B - A)". Don't flip the sign.
- Prepayment evaluates **both** `reduce-emi` and `reduce-tenure` neutrally and renders both. That is a product requirement (financial-safety app, no steering) â€” don't recommend one.

### V1 vs V2

`features/loan/lib/*` are thin V1 compat wrappers delegating to `engine/pipeline.ts`. Only `validate-loan.ts` holds standalone V1 logic, with different limits (principal â‰¤ 1 crore, tenure â‰¤ 360, `processingFee` required). Put new math in `engine/`, not `lib/`. `tests/unit/loan/loan-calculator.test.ts` (V1, range-based assertions) is the canary for rounding changes.

## i18n

- `TranslationKeys` is `typeof en` (`features/language/translations/en.ts`). Adding a key to `en.ts` without the mirror in `kn.ts` breaks `tsc` â€” always edit both files together.
- Only chrome/nav copy uses `useLanguage().t`. Feature pages do inline `kn ? 'â€¦' : 'â€¦'` ternaries or a feature-local dictionary (`features/loan/presentation/dictionary.ts`). Match the surrounding file; don't migrate feature copy into `translations/` unasked.
- Language is client state in `localStorage` under `gramfinance_lang`, default `en`, hydrated in a `useEffect` â†’ expect a one-render English flash on load. `app/layout.tsx` hardcodes `<html lang="en">` and never updates it on switch.

## API routes

- Return `successResponse(data, status?)` / `errorResponse(err)` from `lib/api/response.ts`; throw `ApiError` built with `ErrorFactories.*` (`lib/api/errors.ts`). Envelope is `{ success, data | error, meta: { timestamp } }` (`types/api.ts`).
- `lib/supabase/server.ts` `createClient()` is **async** (`await cookies()`); the browser client in `client.ts` is not. Both use the anon key â€” no service-role helper exists yet.

## Database

- Migrations are plain numbered SQL in `supabase/migrations/` (`001`-`018`, then `020`-`028`; `019` is reserved) plus `supabase/seed.sql` and `supabase/seed-demo.sql`. `supabase/config.toml` exists and configures the **local** CLI instance, including `enable_anonymous_sign_ins = true`; the project is linked, so apply migrations with `supabase db push --linked`.
- `types/database.ts` is hand-maintained, not generated; update it in the same change as a migration. It has already drifted: `DbQuiz.lesson_id` is typed non-nullable but the column is nullable.

## Misc traps

- `@/*` maps to the **repo root** (both `tsconfig.json` and `vitest.config.ts`), so imports are `@/features/â€¦`, not `@/src/â€¦`.
- `tailwind.config.ts` `content` only globs `app/`, `components/`, `features/` â€” a new top-level directory's classes won't be generated.
- `tailwind.config.ts` has a corrupt value: `warning.50: '#fffbe finished'`. Any `bg-warning-50` / `border-warning-50` emits broken CSS; use `warning.500/600/700`.
- Windows: PowerShell `Get-Content` mangles this repo's UTF-8 (`â‚¹` and Kannada text come out as garbage). The files are correct â€” read with a UTF-8 aware tool and do not "fix" mojibake you see in the terminal.
- Product guardrail: keep output plain-language for low-literacy users, avoid dark patterns, and keep the cybercrime helpline `1930` (`lib/utils/constants.ts`) surfaced on fraud content.
CSP note:
- style-src 'unsafe-inline' is currently required by inline style attributes.
- script-src 'unsafe-inline' is intentionally retained because Next.js 15.5.26
  prerenders most public routes and does not apply middleware-generated nonces
  to cached prerendered HTML.
- A nonce spike was verified on the dynamic /schemes route but failed on
  prerendered routes, causing framework-script CSP violations and hydration
  failure.
- Do not remove script-src 'unsafe-inline' or force routes dynamic without
  revisiting the F16 architecture decision.
- Re-evaluate after a Next.js upgrade or a confirmed deployment architecture.