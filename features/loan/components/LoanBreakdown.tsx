'use client';

import React from 'react';
import { EngineLoanResult } from '../engine/types';
import { formatPaiseINR } from '../engine/utils/money';
import { getCostBreakdown } from '../presentation/cost-breakdown';
import { useLanguage } from '@/features/language/hooks/useLanguage';

export interface LoanBreakdownProps {
  engineResult: EngineLoanResult;
}

const SEGMENT_STYLE: Record<string, { bar: string; dot: string }> = {
  principal: { bar: 'bg-green-600', dot: 'bg-green-600' },
  interest: { bar: 'bg-amber-500', dot: 'bg-amber-500' },
  upfrontFees: { bar: 'bg-blue-500', dot: 'bg-blue-500' },
};

export function LoanBreakdown({ engineResult }: LoanBreakdownProps) {
  const { language } = useLanguage();
  const kn = language === 'kn';

  // Exact partition of totalCashOutflowPaise. See presentation/cost-breakdown.ts
  // for why the previous residual-percentage approach mislabelled fee amounts.
  const { segments, totalPaise } = getCostBreakdown(engineResult);

  const labels: Record<string, string> = {
    principal: kn ? 'ಮರುಪಾವತಿಸಿದ ಅಸಲು' : 'Principal repaid',
    interest: kn ? 'ಬಡ್ಡಿ' : 'Interest',
    upfrontFees: kn ? 'ಮುಂಗಡ ಶುಲ್ಕ' : 'Upfront fees',
  };

  if (totalPaise <= 0 || segments.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3 shadow-sm">
      <h4 className="text-sm font-bold text-gray-800">
        {kn ? 'ವೆಚ್ಚದ ಪ್ರಮಾಣ ವಿಭಜನೆ (Cost Ratio)' : 'Where your money goes (Cost Ratio)'}
      </h4>

      <p className="text-xs text-gray-600">
        {kn
          ? `ಒಟ್ಟು ${formatPaiseINR(totalPaise)} ಪಾವತಿಸುವ ಮೊತ್ತದ ವಿಭಜನೆ.`
          : `A breakdown of the ${formatPaiseINR(totalPaise)} you repay in total.`}
      </p>

      {/* Visual Bar. Widths come from an exact partition, so the segments always
          fill the track and always match the legend amounts below. */}
      <div
        className="h-5 w-full bg-gray-100 rounded-full overflow-hidden flex"
        role="img"
        aria-label={
          kn
            ? `ವೆಚ್ಚ ವಿಭಜನೆ: ${segments.map((s) => `${labels[s.key]} ${s.percent}%`).join(', ')}`
            : `Cost breakdown: ${segments.map((s) => `${labels[s.key]} ${s.percent}%`).join(', ')}`
        }
      >
        {segments.map((segment) => (
          <div
            key={segment.key}
            className={`${SEGMENT_STYLE[segment.key].bar} transition-all duration-500`}
            style={{ width: `${segment.percent}%` }}
          />
        ))}
      </div>

      {/* Legend — the text is the accessible source of truth, not the colour. */}
      <ul className="flex flex-wrap items-center justify-between text-xs text-gray-700 gap-2 pt-1">
        {segments.map((segment) => (
          <li key={segment.key} className="flex items-center gap-1.5">
            <span
              className={`h-3 w-3 rounded-full inline-block shrink-0 ${SEGMENT_STYLE[segment.key].dot}`}
              aria-hidden="true"
            />
            <span>
              {labels[segment.key]}:{' '}
              <strong>{formatPaiseINR(segment.amountPaise)}</strong> ({segment.percent}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
