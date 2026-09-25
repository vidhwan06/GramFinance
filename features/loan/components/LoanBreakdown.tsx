'use client';

import React from 'react';
import { EngineLoanResult } from '../engine/types';
import { formatPaiseINR } from '../engine/utils/money';
import { useLanguage } from '@/features/language/hooks/useLanguage';

export interface LoanBreakdownProps {
  engineResult: EngineLoanResult;
}

export function LoanBreakdown({ engineResult }: LoanBreakdownProps) {
  const { language } = useLanguage();
  const kn = language === 'kn';

  const total = engineResult.totalCashOutflowPaise;
  if (total <= 0) return null;

  const principalPct = Math.round((engineResult.basePrincipalPaise / total) * 100);
  const interestPct = Math.round((engineResult.totalInterestPaise / total) * 100);
  const feePct = Math.max(0, 100 - principalPct - interestPct);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3 shadow-sm">
      <h4 className="text-sm font-bold text-gray-800">
        {kn ? 'ವೆಚ್ಚದ ಪ್ರಮಾಣ ವಿಭಜನೆ (Cost Ratio)' : 'Cost Ratio Visual Breakdown'}
      </h4>

      {/* Visual Bar */}
      <div className="h-5 w-full bg-gray-100 rounded-full overflow-hidden flex">
        <div
          className="bg-green-600 transition-all duration-500"
          style={{ width: `${principalPct}%` }}
          title={`Principal: ${principalPct}%`}
        />
        <div
          className="bg-amber-500 transition-all duration-500"
          style={{ width: `${interestPct}%` }}
          title={`Interest: ${interestPct}%`}
        />
        {feePct > 0 && (
          <div
            className="bg-blue-500 transition-all duration-500"
            style={{ width: `${feePct}%` }}
            title={`Fees: ${feePct}%`}
          />
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between text-xs text-gray-700 gap-2 pt-1">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-green-600 inline-block" />
          <span>
            {kn ? 'ಅಸಲು:' : 'Principal:'}{' '}
            <strong>{formatPaiseINR(engineResult.basePrincipalPaise)}</strong> ({principalPct}%)
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-amber-500 inline-block" />
          <span>
            {kn ? 'ಬಡ್ಡಿ:' : 'Interest:'}{' '}
            <strong>{formatPaiseINR(engineResult.totalInterestPaise)}</strong> ({interestPct}%)
          </span>
        </div>
        {feePct > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-blue-500 inline-block" />
            <span>
              {kn ? 'ಶುಲ್ಕ:' : 'Fees:'}{' '}
              <strong>{formatPaiseINR(engineResult.totalFeesPaise)}</strong> ({feePct}%)
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
