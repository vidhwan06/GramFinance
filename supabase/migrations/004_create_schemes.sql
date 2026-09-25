-- Migration 004: Create Schemes Table
CREATE TABLE IF NOT EXISTS public.schemes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_en VARCHAR(255) NOT NULL,
    name_kn VARCHAR(255) NOT NULL,
    description_en TEXT NOT NULL,
    description_kn TEXT NOT NULL,
    target_groups TEXT[] NOT NULL,
    states TEXT[] DEFAULT '{"ALL"}',
    required_documents TEXT[] NOT NULL,
    official_url TEXT NOT NULL,
    last_verified DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_schemes_targets ON public.schemes USING GIN(target_groups);
