-- Migration 002: Create Lessons Table
CREATE TABLE IF NOT EXISTS public.lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(50) NOT NULL,
    title_en VARCHAR(255) NOT NULL,
    title_kn VARCHAR(255) NOT NULL,
    content_en JSONB NOT NULL,
    content_kn JSONB NOT NULL,
    difficulty VARCHAR(20) DEFAULT 'beginner',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lessons_category ON public.lessons(category);
