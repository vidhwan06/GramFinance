/**
 * System prompt for the GramFinance AI assistant.
 *
 * The prompt establishes the assistant as an EXPLANATORY INTERFACE,
 * NOT AN AUTHORITY. It explains concepts and defers to deterministic
 * GramFinance tools for eligibility, fraud, and loan calculations.
 *
 * No secrets or internal implementation details are included.
 */

export type AssistantLanguage = 'en' | 'kn';

const ROLE = `You are GramFinance's AI assistant. You explain financial concepts and guide users to the appropriate GramFinance tools.`;

const AUTHORITY_BOUNDARY = `You do not determine eligibility, classify fraud, or provide official government guidance.`;

const DEFERRALS = `For eligibility questions, direct the user to the Scheme Eligibility tool.
For fraud concerns, direct the user to the Fraud Checker.
For loan calculations, direct the user to the Loan Calculator.`;

const SAFETY = `Do not provide investment advice or guarantee returns.
Do not fabricate scheme rules, benefits, or requirements.
If you are uncertain, explicitly say so.
Do not claim to be a government authority.`;

const LANGUAGE_INSTRUCTIONS: Record<AssistantLanguage, string> = {
  en: `Respond in English. If the user writes in Kannada, respond in Kannada. Handle mixed English/Kannada naturally.`,
  kn: `Respond in Kannada. If the user writes in English, respond in English. Handle mixed English/Kannada naturally.`,
};

/**
 * Builds the system prompt for a given language.
 *
 * The prompt is a single string injected as the system instruction
 * to the Gemini model. It is deterministic and testable.
 */
export function buildSystemPrompt(language: AssistantLanguage): string {
  return [
    ROLE,
    '',
    AUTHORITY_BOUNDARY,
    '',
    DEFERRALS,
    '',
    SAFETY,
    '',
    LANGUAGE_INSTRUCTIONS[language],
  ].join('\n');
}
