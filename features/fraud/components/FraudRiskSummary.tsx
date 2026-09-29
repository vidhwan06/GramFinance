'use client';

import React from 'react';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { cn } from '@/lib/utils/cn';
import type { FraudRiskLevel } from '@/lib/fraud/types';

interface FraudRiskSummaryProps {
  riskLevel: FraudRiskLevel;
  riskScore: number;
}

/**
 * Displays the qualitative risk level.
 *
 * Uses restrained visual treatment per design guidelines:
 *   - low     → neutral treatment (green border)
 *   - medium  → warning treatment (amber border)
 *   - high    → danger treatment (red border)
 *
 * The numeric riskScore is labeled as an internal score, not a probability.
 * Color is not the only way risk is communicated (glyph + text).
 */
export function FraudRiskSummary({
  riskLevel,
  riskScore,
}: FraudRiskSummaryProps) {
  const { t } = useLanguage();

  const riskTones: Record<FraudRiskLevel, string> = {
    low: 'border-green-300 bg-green-50',
    medium: 'border-amber-300 bg-amber-50',
    high: 'border-red-300 bg-red-50',
  };

  const riskGlyphs: Record<FraudRiskLevel, string> = {
    low: '●',
    medium: '◐',
    high: '◉',
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

  return (
    <div
      className={cn('rounded-xl border-l-4 p-4', riskTones[riskLevel])}
      role="status"
      aria-label={`${t.fraud.riskLevel}: ${riskLabels[riskLevel]}`}
    >
      <div className="flex items-center gap-2">
        <span
          className="text-lg font-bold leading-6"
          aria-hidden="true"
        >
          {riskGlyphs[riskLevel]}
        </span>
        <span className="text-lg font-bold text-ink">
          {riskLabels[riskLevel]}
        </span>
      </div>

      <p className="mt-1 text-sm text-gray-600">
        {riskDescriptions[riskLevel]}
      </p>

      <p className="mt-2 text-xs text-gray-400">
        {t.fraud.internalScore}: {riskScore}
      </p>
    </div>
  );
}

/** displayName for dev tools. */
FraudRiskSummary.displayName = 'FraudRiskSummary';
