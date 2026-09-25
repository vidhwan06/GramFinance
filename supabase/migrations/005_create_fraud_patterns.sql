-- Migration 005: Create Fraud Patterns Table
CREATE TABLE IF NOT EXISTS public.fraud_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(50) NOT NULL,
    indicator VARCHAR(255) NOT NULL,
    explanation_en TEXT NOT NULL,
    explanation_kn TEXT NOT NULL,
    recommended_action_en TEXT NOT NULL,
    recommended_action_kn TEXT NOT NULL
);
