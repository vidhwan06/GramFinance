'use client';

import React, { useState } from 'react';
import { AmortizationSchedule } from '../engine/types';
import { formatPaiseINR } from '../engine/utils/money';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { Button } from '@/components/ui/Button';
import { ChevronDown, ChevronUp, Table } from 'lucide-react';

export interface AmortizationTableProps {
  schedule: AmortizationSchedule;
}

export function AmortizationTable({ schedule }: AmortizationTableProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAllRows, setShowAllRows] = useState(false);
  const { language } = useLanguage();

  const title = language === 'kn' ? 'ಮರುಪಾವತಿ ವೇಳಾಪಟ್ಟಿ (Amortization Schedule)' : 'Repayment Schedule (Amortization Table)';
  const toggleBtnText = isExpanded
    ? language === 'kn' ? 'ವೇಳಾಪಟ್ಟಿ ಮರೆಮಾಡಿ' : 'Hide Schedule'
    : language === 'kn' ? 'ಸಂಪೂರ್ಣ ತಿಂಗಳ ಮರುಪಾವತಿ ವೇಳಾಪಟ್ಟಿ ವೀಕ್ಷಿಸಿ' : 'View Full Repayment Schedule';

  const displayedRows = showAllRows ? schedule.rows : schedule.rows.slice(0, 12);

  return (
    <div className="rounded-xl border border-rule bg-white p-4 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Table className="h-5 w-5 text-deep-teal" />
          <h3 className="font-bold text-ink text-base">{title}</h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center space-x-1"
        >
          <span>{toggleBtnText}</span>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {isExpanded && (
        <div className="space-y-3 pt-2 border-t border-rule animate-fade-in">
          {/* Responsive Table Container */}
          <div className="overflow-x-auto rounded-lg border border-rule">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-stone text-ink font-bold border-b border-rule">
                <tr>
                  <th className="p-2.5">{language === 'kn' ? 'ತಿಂಗಳು' : 'Month'}</th>
                  <th className="p-2.5">{language === 'kn' ? 'ಆರಂಭಿಕ ಬಾಕಿ' : 'Opening Bal'}</th>
                  <th className="p-2.5">{language === 'kn' ? 'ಕಂತು (EMI)' : 'EMI'}</th>
                  <th className="p-2.5">{language === 'kn' ? 'ಅಸಲು' : 'Principal'}</th>
                  <th className="p-2.5">{language === 'kn' ? 'ಬಡ್ಡಿ' : 'Interest'}</th>
                  <th className="p-2.5">{language === 'kn' ? 'ಅಂತಿಮ ಬಾಕಿ' : 'Closing Bal'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {displayedRows.map((row) => (
                  <tr key={row.month} className="hover:bg-warm-ivory transition-colors">
                    <td className="p-2.5 font-semibold text-ink">#{row.month}</td>
                    <td className="p-2.5 text-ink">{formatPaiseINR(row.openingBalancePaise)}</td>
                    <td className="p-2.5 font-bold text-deep-teal">{formatPaiseINR(row.scheduledEmiPaise)}</td>
                    <td className="p-2.5 text-ink">{formatPaiseINR(row.principalPaidPaise)}</td>
                    <td className="p-2.5 text-warning-700">{formatPaiseINR(row.interestPaidPaise)}</td>
                    <td className="p-2.5 text-ink font-medium">{formatPaiseINR(row.closingBalancePaise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {schedule.rows.length > 12 && (
            <div className="text-center pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllRows(!showAllRows)}
                className="text-xs text-deep-teal"
              >
                {showAllRows
                  ? language === 'kn' ? 'ಮೊದಲ 12 ತಿಂಗಳುಗಳನ್ನಷ್ಟೇ ತೋರಿಸಿ' : 'Show First 12 Months Only'
                  : language === 'kn' ? `ಎಲ್ಲಾ ${schedule.rows.length} ತಿಂಗಳುಗಳನ್ನು ತೋರಿಸಿ` : `Show All ${schedule.rows.length} Months`}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
