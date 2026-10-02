'use client';

import React from 'react';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { cn } from '@/lib/utils/cn';
import { copy, type Copy } from '@/features/fraud/presentation/copy';
import type { FraudRiskLevel } from '@/lib/fraud/types';
import { CircleCheck, CircleAlert, TriangleAlert } from 'lucide-react';

interface FraudRiskSummaryProps {
  riskLevel: FraudRiskLevel;
  riskScore: number;
}

/**
 * Verdict banner shown after a check.
 *
 * Stitch composition: icon tile + bilingual verdict headline on the left,
 * a quick risk seal (level, description, internal score) on the right.
 *
 * Uses restrained visual treatment per design guidelines:
 *   - low     → secondary (teal) treatment
 *   - medium  → warning treatment
 *   - high    → error treatment
 *
 * The numeric riskScore is labeled as an internal score, not a probability.
 * Color is not the only way risk is communicated (icon + text).
 */
export function FraudRiskSummary({
  riskLevel,
  riskScore,
}: FraudRiskSummaryProps) {
  const { t, language } = useLanguage();
  const c: Copy = copy[language === 'kn' ? 'kn' : 'en'];
  const alt: Copy = copy[language === 'kn' ? 'en' : 'kn'];

  const riskTones: Record<FraudRiskLevel, string> = {
    low: 'bg-secondary-container text-on-secondary-container',
    medium: 'bg-warning-500/15 text-warning-700',
    high: 'bg-error-container text-on-error-container',
  };

  const riskTextTones: Record<FraudRiskLevel, string> = {
    low: 'text-secondary',
    medium: 'text-warning-700',
    high: 'text-error',
  };

  const riskVerdicts: Record<FraudRiskLevel, string> = {
    low: c.verdictLow,
    medium: c.verdictMedium,
    high: c.verdictHigh,
  };

  const altVerdicts: Record<FraudRiskLevel, string> = {
    low: alt.verdictLow,
    medium: alt.verdictMedium,
    high: alt.verdictHigh,
  };

  const riskLabels: Record<FraudRiskLevel, string> = {
    low: t.fraud.riskSummaryLow,
    medium: t.fraud.riskSummaryMedium,
    high: t.fraud.riskSummaryHigh,
  };

  const riskDescriptions: Record<FraudRiskLevel, string> = {
    low: t.fraud.riskSummaryLowDesc,
    medium: t.fraud.riskSummaryMediumDesc,
    high: t.fraud.riskSummaryHighDesc,
  };

  const Icon =
    riskLevel === 'high' ? TriangleAlert : riskLevel === 'medium' ? CircleAlert : CircleCheck;

  return (
    <div
      className="rounded-xl bg-surface-container-lowest shadow-sm border border-outline-variant/50 p-space-md lg:p-space-lg"
      role="status"
      aria-label={`${t.fraud.riskLevel}: ${riskLabels[riskLevel]}`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div className="flex items-start gap-space-md">
          <div
            className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
              riskTones[riskLevel]
            )}
            aria-hidden="true"
          >
            <Icon className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-space-sm flex-wrap">
              <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                {riskVerdicts[riskLevel]}
              </h2>
              <span className="font-headline-sm text-headline-sm text-on-surface-variant font-normal">
                · {altVerdicts[riskLevel]}
              </span>
            </div>
            <p className="mt-1 font-body-md text-body-md text-on-surface-variant leading-normal max-w-3xl">
              {riskDescriptions[riskLevel]}
            </p>
          </div>
        </div>

        {/* Quick risk seal */}
        <div className="shrink-0 flex md:flex-col items-center md:items-end justify-between md:justify-center gap-1 p-space-sm rounded-lg bg-surface-container-low min-w-[150px] border border-outline-variant/50">
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            {t.fraud.riskLevel}
          </span>
          <span
            className={cn(
              'font-title-lg text-title-lg font-bold tracking-tight',
              riskTextTones[riskLevel]
            )}
          >
            {riskLabels[riskLevel]}
          </span>
          <p className="font-label-sm text-[11px] text-on-surface-variant leading-tight">
            {t.fraud.internalScore}: {riskScore}
          </p>
        </div>
      </div>
    </div>
  );
}

/** displayName for dev tools. */
FraudRiskSummary.displayName = 'FraudRiskSummary';
