'use client';

import React from 'react';
import { getSchemeFieldDefinition } from '../eligibility/field-registry';
import type { RuleEvaluation } from '../types';

export interface RuleOutcomeListProps {
  evaluations: RuleEvaluation[];
  language: 'en' | 'kn';
  labels: {
    yourValue: string;
    expected: string;
    pass: string;
    fail: string;
    unknown: string;
  };
}

/** Glyphs so PASS / FAIL / UNKNOWN differ by shape, not only by colour. */
const GLYPH: Record<RuleEvaluation['outcome'], string> = {
  pass: '✓',
  fail: '✕',
  unknown: '⚠',
};

const TONE: Record<RuleEvaluation['outcome'], string> = {
  pass: 'border-emerald-300 bg-emerald-50 text-emerald-900',
  fail: 'border-red-300 bg-red-50 text-red-900',
  unknown: 'border-amber-300 bg-amber-50 text-amber-900',
};

function labelFor(field: string, language: 'en' | 'kn'): string {
  const definition = getSchemeFieldDefinition(field);
  if (!definition) return field;
  return language === 'kn' ? definition.labelKn : definition.labelEn;
}

/**
 * Human-readable description of a rule outcome.
 *
 * Instead of showing raw operator/value syntax, this produces a plain-language
 * description of what the rule checks and what the user's answer was.
 *
 * The backend description (if present) is always preferred — it is authored
 * specifically for each rule. This function only provides a fallback for rules
 * that don't have an authored description.
 */
function describeOutcome(
  evaluation: RuleEvaluation,
  language: 'en' | 'kn'
): string {
  // Prefer the authored description from the backend.
  const authored = language === 'kn' ? evaluation.descriptionKn : evaluation.descriptionEn;
  if (authored) return authored;

  // Fallback: generate a human-readable description from the field metadata.
  const fieldLabel = labelFor(evaluation.field, language);
  const actual = evaluation.actual;

  if (evaluation.outcome === 'unknown') {
    return language === 'kn'
      ? `${fieldLabel}: ಮಾಹಿತಿ ಕಾಣೆಯಾಗಿದೆ. ದಯವಿಟ್ಟು ಉತ್ತರವನ್ನು ನಮೂದಿಸಿ.`
      : `${fieldLabel}: Information is missing. Please provide an answer.`;
  }

  if (actual === null) {
    return language === 'kn'
      ? `${fieldLabel}: ಉತ್ತರವನ್ನು ನಮೂದಿಸಿ.`
      : `${fieldLabel}: No answer provided.`;
  }

  return language === 'kn'
    ? `${fieldLabel}: ನಿಮ್ಮ ಉತ್ತರ "${actual}".`
    : `${fieldLabel}: Your answer was "${actual}".`;
}

/**
 * Rule-level outcomes with human-readable descriptions.
 *
 * Nothing is recomputed here. Each row shows a plain-language description of
 * what the rule checks and what the user's answer was, so the reasoning is
 * understandable rather than a bare "eligible" or "not eligible".
 */
export function RuleOutcomeList({ evaluations, language, labels }: RuleOutcomeListProps) {
  if (evaluations.length === 0) return null;

  const statusLabel = {
    pass: labels.pass,
    fail: labels.fail,
    unknown: labels.unknown,
  } as const;

  return (
    <ul className="space-y-2">
      {evaluations.map((evaluation) => {
        const status = statusLabel[evaluation.outcome];
        const description = describeOutcome(evaluation, language);
        return (
          <li
            key={evaluation.ruleId}
            className={`rounded-lg border-l-4 border p-3 ${TONE[evaluation.outcome]}`}
          >
            <div className="flex items-start gap-2">
              <span aria-hidden="true" className="font-bold leading-6">
                {GLYPH[evaluation.outcome]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  <span className="sr-only">{status}: </span>
                  {labelFor(evaluation.field, language)}
                </p>

                <p className="text-xs mt-0.5">
                  {description}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
