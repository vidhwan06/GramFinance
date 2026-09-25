-- ============================================================================
-- Migration 009: Create a public.users profile automatically on Auth signup
-- ============================================================================
-- Without this, every feature that needs a profile must either upsert and
-- tolerate a race, or handle "the row might not exist yet". This trigger makes
-- a profile row guaranteed to exist the moment an auth user is created, so
-- application code can read public.users directly and rely on a single row.
--
-- ── Why these specific safety choices ───────────────────────────────────────
-- SECURITY DEFINER
--     The insert runs as the table owner and therefore bypasses the RLS policy
--     in migration 008. That is exactly why this function must stay this
--     narrow: it can only ever insert a row for NEW.id, the account being
--     created in this very statement.
--
-- SET search_path = ''
--     An empty search path means no object can ever be resolved from an
--     attacker-influenced schema. Combined with the fully-qualified
--     public.users reference below, nothing here is name-resolved at all.
--
-- Raw user metadata is attacker-controlled
--     raw_user_meta_data is supplied by the client at signup. It is NOT
--     trustworthy, so `language` is validated against the same two values the
--     users_language_check constraint allows. Without the CASE, a signup with
--     `language: 'fr'` would violate the CHECK and roll back the entire
--     authentication transaction.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.users (id, language)
    VALUES (
        NEW.id,
        CASE
            WHEN NEW.raw_user_meta_data ->> 'language' IN ('en', 'kn')
                THEN NEW.raw_user_meta_data ->> 'language'
            ELSE 'en'
        END
    )
    ON CONFLICT (id) DO NOTHING;   -- keeps the trigger idempotent on re-fire
    RETURN NEW;
END;
$$;

-- PostgREST exposes the public schema over RPC, so revoke EXECUTE from PUBLIC
-- as defence in depth. Trigger invocation is unaffected: PostgreSQL checks
-- EXECUTE on a trigger function when the TRIGGER is created, not when it
-- fires. service_role retains access for administrative use.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
