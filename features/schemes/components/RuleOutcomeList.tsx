'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { getSchemeFieldDefinition } from '../eligibility/field-registry';
import type { RuleEvaluation } from '../types';
import type { SchemeOutcome } from '../eligibility/check-eligibility-service';

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
 * Rule-level outcomes exactly as the server returned them.
 *
 * Nothing is recomputed here. Each row shows the field, the required value and
 * the applicant's value, so the reasoning is auditable rather than a bare
 * "eligible" or "not eligible".
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

                {evaluation.actual === null ? (
                  <p className="text-xs mt-0.5">
                    {labels.expected}: {evaluation.expected}
                  </p>
                ) : (
                  <p className="text-xs mt-0.5 break-words">
                    {labels.yourValue}: {evaluation.actual} &middot; {labels.expected}:{' '}
                    {evaluation.expected}
                  </p>
                )}

                {evaluation.descriptionEn && language === 'en' && (
                  <p className="text-xs mt-1 opacity-80">{evaluation.descriptionEn}</p>
                )}
                {evaluation.descriptionKn && language === 'kn' && (
                  <p className="text-xs mt-1 opacity-80">{evaluation.descriptionKn}</p>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
