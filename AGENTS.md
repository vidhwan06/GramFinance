# GramFinance Agent Guidelines

GramFinance is a digital financial safety & literacy platform for rural households (VTU B.E. Community Project).

## Architectural Guidelines
1. **Feature-Oriented Structure**: Keep code organized within `features/<feature-name>/`.
2. **Server-Side AI Boundary**: Gemini API calls (`@google/generative-ai`) MUST run exclusively inside Next.js server-side API routes (`app/api/`). NEVER expose `GEMINI_API_KEY` to client components.
3. **Database Rules**: All persistent tables are managed in Supabase Postgres via migrations in `supabase/migrations/`.
4. **Deterministic Fraud Scoring**: Fraud checking relies on the deterministic rules engine (`features/fraud/engine/`). Gemini is used solely for plain-language explanations of detected indicators.
5. **Language System**: Bilingual support (`en` / `kn`) managed centrally via `features/language/translations/`.
