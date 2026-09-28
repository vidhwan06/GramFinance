-- ============================================================================
-- Migration 024: Fraud Checker Foundation
-- ============================================================================
-- Creates the tables for the deterministic, explainable fraud-checking
-- foundation. Follows the same conventions as migrations 001-010:
--   * UUID primary keys with gen_random_uuid()
--   * TIMESTAMPTZ with timezone('utc'::text, now())
--   * CHECK constraints for enums
--   * RLS enabled in a separate step (migration 008 pattern)
-- ============================================================================

BEGIN;

-- ============================================================================
-- Table: fraud_checks
-- Purpose: stores a fraud-check request and its aggregated result.
-- ============================================================================

CREATE TYPE public.fraud_input_type AS ENUM (
  'message',
  'url',
  'upi',
  'phone',
  'scheme_claim',
  'general'
);

CREATE TYPE public.fraud_risk_level AS ENUM (
  'low',
  'medium',
  'high'
);

CREATE TYPE public.fraud_check_status AS ENUM (
  'completed',
  'failed'
);

CREATE TABLE IF NOT EXISTS public.fraud_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  input_type fraud_input_type NOT NULL,
  input_text TEXT NOT NULL,
  normalized_text TEXT NOT NULL,
  risk_level fraud_risk_level NOT NULL DEFAULT 'low',
  risk_score INTEGER NOT NULL DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  status fraud_check_status NOT NULL DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- Table: fraud_signals
-- Central registry of known fraud indicators.
-- ============================================================================

CREATE TYPE public.fraud_signal_severity AS ENUM (
  'low',
  'medium',
  'high'
);

CREATE TYPE public.fraud_signal_category AS ENUM (
  'payment',
  'credential',
  'urgency',
  'government_claim',
  'link',
  'identity',
  'general'
);

CREATE TABLE IF NOT EXISTS public.fraud_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  severity fraud_signal_severity NOT NULL,
  category fraud_signal_category NOT NULL,
  weight INTEGER NOT NULL CHECK (weight >= 0 AND weight <= 100),
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- Table: fraud_check_signals
-- Join table connecting detected signals to a particular fraud check.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.fraud_check_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fraud_check_id UUID NOT NULL REFERENCES public.fraud_checks(id) ON DELETE CASCADE,
  fraud_signal_id UUID NOT NULL REFERENCES public.fraud_signals(id) ON DELETE CASCADE,
  matched_text TEXT NOT NULL,
  explanation TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_fraud_checks_input_type ON public.fraud_checks(input_type);
CREATE INDEX IF NOT EXISTS idx_fraud_checks_risk_level ON public.fraud_checks(risk_level);
CREATE INDEX IF NOT EXISTS idx_fraud_checks_created_at ON public.fraud_checks(created_at);
CREATE INDEX IF NOT EXISTS idx_fraud_check_signals_check_id ON public.fraud_check_signals(fraud_check_id);
CREATE INDEX IF NOT EXISTS idx_fraud_check_signals_signal_id ON public.fraud_check_signals(fraud_signal_id);
CREATE INDEX IF NOT EXISTS idx_fraud_signals_code ON public.fraud_signals(code);
CREATE INDEX IF NOT EXISTS idx_fraud_signals_category ON public.fraud_signals(category);
CREATE INDEX IF NOT EXISTS idx_fraud_signals_enabled ON public.fraud_signals(enabled);

COMMIT;
