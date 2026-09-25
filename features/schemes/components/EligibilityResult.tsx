'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { RuleOutcomeList } from './RuleOutcomeList';
import { getSchemeFieldDefinition, type SchemeFieldName } from '../eligibility/field-registry';
import type { EligibilityStatus } from '../types';
import type { SchemeOutcome } from '../eligibility/check-eligibility-service';

export interface EligibilityResultProps {
  outcome: SchemeOutcome;
  /** Straight from the API response, rendered verbatim. */
  disclaimer: { en: string; kn: string };
  language: 'en' | 'kn';
  onEdit: () => void;
  labels: {
    title: Record<EligibilityStatus, string>;
    intro: Record<EligibilityStatus, string>;
    yourValue: string;
    expected: string;
    pass: string;
    fail: string;
    unknown: string;
    missingTitle: string;
    missingEmpty: string;
    addInformation: string;
  };
}

const GLYPH: Record<EligibilityStatus, string> = {
  eligible: '✓',
  potentially_eligible: '⚠',
  not_eligible: '✕',
};

const TONE: Record<EligibilityStatus, string> = {
  eligible: 'border-emerald-500 bg-emerald-50 text-emerald-900',
  potentially_eligible: 'border-amber-500 bg-amber-50 text-amber-900',
  not_eligible: 'border-red-500 bg-red-50 text-red-900',
};

/**
 * Renders the server's verdict.
 *
 * There is no fourth state and no client-side derivation. The status comes
 * straight off `outcome.eligibility.status`, the rows come straight off the
 * rule evaluations, and the disclaimer is the API's own string shown verbatim.
 * The wording is deliberately factual; nothing here promises a loan.
 */
export function EligibilityResult({
  outcome,
  disclaimer,
  language,
  onEdit,
  labels,
}: EligibilityResultProps) {
  const { status, passedRules, failedRules, unknownRules, missingInformation } =
    outcome.eligibility;

  const unknownFieldLabels = missingInformation.map((field) => {
    const definition = getSchemeFieldDefinition(field as SchemeFieldName);
    return definition
      ? language === 'kn'
        ? definition.labelKn
        : definition.labelEn
      : field;
  });

  return (
    <section
      aria-labelledby="eligibility-result-heading"
      className={`rounded-2xl border-l-4 p-4 ${TONE[status]}`}
    >
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="text-2xl font-bold leading-8">
          {GLYPH[status]}
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="eligibility-result-heading" className="text-lg font-bold">
            {labels.title[status]}
          </h2>
          <p className="text-sm mt-1 leading-relaxed">{labels.intro[status]}</p>
        </div>
      </div>

      {failedRules.length > 0 && (
        <div className="mt-4">
          <RuleOutcomeList
            evaluations={failedRules}
            language={language}
            labels={labels}
          />
        </div>
      )}

      {unknownRules.length > 0 && (
        <div className="mt-4">
          <RuleOutcomeList
            evaluations={unknownRules}
            language={language}
            labels={labels}
          />
        </div>
      )}

      {passedRules.length > 0 && (
        <div className="mt-4">
          <RuleOutcomeList
            evaluations={passedRules}
            language={language}
            labels={labels}
          />
        </div>
      )}

      {unknownFieldLabels.length > 0 && (
        <div className="mt-4 rounded-lg bg-white/70 p-3">
          <h3 className="text-sm font-semibold">{labels.missingTitle}</h3>
          <ul className="mt-1 space-y-0.5">
            {unknownFieldLabels.map((label) => (
              <li key={label} className="text-sm flex items-start gap-2">
                <span aria-hidden="true">⚠</span>
                <span>{label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button variant="outline" onClick={onEdit}>
          {labels.addInformation}
        </Button>
      </div>

      <p className="mt-4 rounded-lg bg-white/70 p-3 text-xs leading-relaxed">
        {language === 'kn' ? disclaimer.kn : disclaimer.en}
      </p>
    </section>
  );
}
