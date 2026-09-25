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
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Table className="h-5 w-5 text-green-700" />
          <h3 className="font-bold text-gray-900 text-base">{title}</h3>
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
        <div className="space-y-3 pt-2 border-t border-gray-100 animate-fade-in">
          {/* Responsive Table Container */}
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-gray-200">
                <tr>
                  <th className="p-2.5">{language === 'kn' ? 'ತಿಂಗಳು' : 'Month'}</th>
                  <th className="p-2.5">{language === 'kn' ? 'ಆರಂಭಿಕ ಬಾಕಿ' : 'Opening Bal'}</th>
                  <th className="p-2.5">{language === 'kn' ? 'ಕಂತು (EMI)' : 'EMI'}</th>
                  <th className="p-2.5">{language === 'kn' ? 'ಅಸಲು' : 'Principal'}</th>
                  <th className="p-2.5">{language === 'kn' ? 'ಬಡ್ಡಿ' : 'Interest'}</th>
                  <th className="p-2.5">{language === 'kn' ? 'ಅಂತಿಮ ಬಾಕಿ' : 'Closing Bal'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayedRows.map((row) => (
                  <tr key={row.month} className="hover:bg-slate-50 transition-colors">
                    <td className="p-2.5 font-semibold text-gray-900">#{row.month}</td>
                    <td className="p-2.5 text-gray-700">{formatPaiseINR(row.openingBalancePaise)}</td>
                    <td className="p-2.5 font-bold text-green-800">{formatPaiseINR(row.scheduledEmiPaise)}</td>
                    <td className="p-2.5 text-slate-800">{formatPaiseINR(row.principalPaidPaise)}</td>
                    <td className="p-2.5 text-amber-700">{formatPaiseINR(row.interestPaidPaise)}</td>
                    <td className="p-2.5 text-gray-900 font-medium">{formatPaiseINR(row.closingBalancePaise)}</td>
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
                className="text-xs text-green-700"
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
