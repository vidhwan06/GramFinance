'use client';

import React from 'react';
import { EngineLoanResult } from '../engine/types';
import { V2LoanInputState } from '../hooks/useLoanCalculator';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { formatPaiseINR } from '../engine/utils/money';
import { formatPercent } from '@/lib/utils/format-currency';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { ShieldCheck, Info } from 'lucide-react';
import { PlainLanguageSummary } from '../presentation/plain-language';

export interface LoanResultProps {
  inputState: V2LoanInputState;
  engineResult: EngineLoanResult;
  bilingualSummary: PlainLanguageSummary;
}

export function LoanResult({ inputState, engineResult, bilingualSummary }: LoanResultProps) {
  const { language } = useLanguage();
  const kn = language === 'kn';

  const methodBadge =
    inputState.interestMethod === 'flat-rate'
      ? kn ? 'ಸ್ಥಿರ ದರ' : 'Flat Rate'
      : kn ? 'ಕ್ಷೀಣಿಸುವ ಬ್ಯಾಲೆನ್ಸ್' : 'Reducing Balance';

  const labels = {
    summaryTitle: kn ? 'ಸಾಲದ ವಿವರಗಳ ಮುನ್ನೋಟ' : 'LOAN SUMMARY',
    monthlyTitle: kn ? 'ಪ್ರತಿ ತಿಂಗಳ ಕಂತು (EMI)' : 'MONTHLY EMI',
    totalCostTitle: kn ? 'ಒಟ್ಟು ವೆಚ್ಚದ ವಿವರ' : 'TOTAL COST BREAKDOWN',
    principalAmount: kn ? 'ಸಾಲದ ಅಸಲು:' : 'Loan Amount:',
    disbursed: kn ? 'ನಿಮ್ಮ ಖಾತೆಗೆ ಬರುವ ಮೊತ್ತ:' : 'Net Disbursed to Account:',
    interestRate: kn ? 'ವಾರ್ಷಿಕ ಬಡ್ಡಿ ದರ:' : 'Annual Rate:',
    tenure: kn ? 'ಸಾಲದ ಅವಧಿ:' : 'Tenure:',
    months: (m: number) => (kn ? `${m} ತಿಂಗಳುಗಳು` : `${m} months`),
    totalInterest: kn ? 'ಒಟ್ಟು ಬಡ್ಡಿ:' : 'Total Interest:',
    totalFees: kn ? 'ಒಟ್ಟು ಶುಲ್ಕ:' : 'Total Fees:',
    totalRepayment: kn ? 'ಅಸಲು + ಬಡ್ಡಿ:' : 'Principal + Interest:',
    totalCashOutflow: kn ? 'ಒಟ್ಟು ಹೊರಗೆ ಹೋಗುವ ಮೊತ್ತ:' : 'Total Cash Outflow:',
    plainLanguageTitle: kn ? 'ಸರಳ ವಿವರಣೆ' : 'Plain-Language Explanation',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Monthly EMI Card (Prominent Highlight) */}
      <div className="bg-gradient-to-br from-green-800 to-green-700 text-white rounded-2xl p-6 shadow-lg border-2 border-green-600">
        <div className="flex justify-between items-start mb-2">
          <span className="text-sm font-bold tracking-wider text-green-100 uppercase">
            {labels.monthlyTitle}
          </span>
          <span className="bg-green-900/60 text-green-200 text-xs px-2.5 py-1 rounded-full border border-green-500/40">
            {methodBadge}
          </span>
        </div>
        <div className="text-4xl sm:text-5xl font-black tracking-tight my-2">
          {formatPaiseINR(engineResult.initialMonthlyEmiPaise)}
          <span className="text-lg font-medium text-green-200 ml-1">/ {kn ? 'ತಿಂಗಳು' : 'month'}</span>
        </div>
        <p className="text-sm text-green-100 font-medium leading-relaxed mt-3 pt-3 border-t border-green-600/60">
          {bilingualSummary.monthlyText}
        </p>
      </div>

      {/* Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Input Parameters Summary */}
        <Card className="bg-slate-50 border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-gray-700 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-green-700" />
              <span>{labels.summaryTitle}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <span className="text-gray-600">{labels.principalAmount}</span>
              <span className="font-bold text-gray-900">
                {formatPaiseINR(engineResult.basePrincipalPaise)}
              </span>
            </div>
            {engineResult.netDisbursedAmountPaise !== engineResult.basePrincipalPaise && (
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-gray-600">{labels.disbursed}</span>
                <span className="font-bold text-blue-700">
                  {formatPaiseINR(engineResult.netDisbursedAmountPaise)}
                </span>
              </div>
            )}
            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <span className="text-gray-600">{labels.interestRate}</span>
              <span className="font-bold text-gray-900">
                {formatPercent(inputState.interestRate)}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gray-600">{labels.tenure}</span>
              <span className="font-bold text-gray-900">
                {labels.months(inputState.tenureMonths)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Cost Breakdown */}
        <Card className="bg-slate-50 border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-gray-700 flex items-center gap-2">
              <Info className="h-4 w-4 text-green-700" />
              <span>{labels.totalCostTitle}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <span className="text-gray-600">{labels.totalInterest}</span>
              <span className="font-bold text-amber-700">
                {formatPaiseINR(engineResult.totalInterestPaise)}
              </span>
            </div>
            {engineResult.totalFeesPaise > 0 && (
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-gray-600">{labels.totalFees}</span>
                <span className="font-bold text-blue-700">
                  {formatPaiseINR(engineResult.totalFeesPaise)}
                </span>
              </div>
            )}
            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <span className="text-gray-600">{labels.totalRepayment}</span>
              <span className="font-bold text-gray-900">
                {formatPaiseINR(engineResult.totalRepaymentPaise)}
              </span>
            </div>
            <div className="flex justify-between py-1 pt-1">
              <span className="font-bold text-gray-900">{labels.totalCashOutflow}</span>
              <span className="font-extrabold text-green-800 text-base">
                {formatPaiseINR(engineResult.totalCashOutflowPaise)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plain Language Summary Card */}
      <Card className="bg-amber-50/70 border-amber-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-amber-900">{labels.plainLanguageTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-amber-950 leading-relaxed">
          <p>• {bilingualSummary.monthlyText}</p>
          <p>• {bilingualSummary.interestText}</p>
          <p>• {bilingualSummary.totalText}</p>
          {bilingualSummary.disbursementText && (
            <p>• {bilingualSummary.disbursementText}</p>
          )}
          <p className="text-xs text-amber-800 italic pt-2 border-t border-amber-200">
            {bilingualSummary.estimateDisclaimer}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
