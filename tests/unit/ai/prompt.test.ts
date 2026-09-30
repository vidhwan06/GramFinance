import { describe, it, expect } from 'vitest';
import { buildSystemPrompt } from '@/lib/ai/prompt';

describe('buildSystemPrompt', () => {
  it('includes the role', () => {
    const prompt = buildSystemPrompt('en');
    expect(prompt).toContain("GramFinance's AI assistant");
    expect(prompt).toContain('explain financial concepts');
  });

  it('includes the authority boundary', () => {
    const prompt = buildSystemPrompt('en');
    expect(prompt).toContain('do not determine eligibility');
    expect(prompt).toContain('classify fraud');
    expect(prompt).toContain('official government guidance');
  });

  it('includes tool deferrals', () => {
    const prompt = buildSystemPrompt('en');
    expect(prompt).toContain('Scheme Eligibility');
    expect(prompt).toContain('Fraud Checker');
    expect(prompt).toContain('Loan Calculator');
  });

  it('includes safety guardrails', () => {
    const prompt = buildSystemPrompt('en');
    expect(prompt).toContain('investment advice');
    expect(prompt).toContain('guarantee returns');
    expect(prompt).toContain('fabricate');
    expect(prompt).toContain('uncertain');
  });

  it('includes language instruction for English', () => {
    const prompt = buildSystemPrompt('en');
    expect(prompt).toContain('Respond in English');
    expect(prompt).toContain('Kannada');
  });

  it('includes language instruction for Kannada', () => {
    const prompt = buildSystemPrompt('kn');
    expect(prompt).toContain('Respond in Kannada');
    expect(prompt).toContain('English');
  });

  it('does not contain secrets or API keys', () => {
    const prompt = buildSystemPrompt('en');
    expect(prompt).not.toContain('GEMINI_API_KEY');
    expect(prompt).not.toContain('API_KEY');
    expect(prompt).not.toContain('secret');
  });

  it('does not contain internal implementation details', () => {
    const prompt = buildSystemPrompt('en');
    expect(prompt).not.toContain('runEligibilityCheck');
    expect(prompt).not.toContain('runFraudEngine');
    expect(prompt).not.toContain('lib/fraud');
    expect(prompt).not.toContain('lib/schemes');
  });

  it('includes prompt injection defense', () => {
    const prompt = buildSystemPrompt('en');
    expect(prompt).toContain('untrusted input');
    expect(prompt).toContain('must be ignored');
    expect(prompt).toContain('authority and safety boundaries');
  });

  it('includes prompt injection defense in Kannada mode', () => {
    const prompt = buildSystemPrompt('kn');
    expect(prompt).toContain('untrusted input');
    expect(prompt).toContain('must be ignored');
  });
});
