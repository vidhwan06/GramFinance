'use client';

import React, { useState } from 'react';
import { EngineLoanResult } from '../engine/types';
import { formatPaiseINR } from '../engine/utils/money';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { PiggyBank, ArrowRight, Info } from 'lucide-react';

export interface PrepaymentSimulatorProps {
  engineResult: EngineLoanResult;
  onPrepaymentChange: (prepayments: { month: number; amount: number }[]) => void;
  /**
   * Bilingual message describing why the current prepayment input is invalid.
   *
   * When set, the outcome panels are hidden. Previously an out-of-range month
   * was silently filtered out of the engine config while the panel still
   * rendered, so the user was shown "Interest Saved: ₹0" as though a simulation
   * had actually run.
   */
  prepaymentError?: string | null;
}

export function PrepaymentSimulator({
  engineResult,
  onPrepaymentChange,
  prepaymentError,
}: PrepaymentSimulatorProps) {
  const [amount, setAmount] = useState<number>(0);
  const [month, setMonth] = useState<number>(12);
  const { language } = useLanguage();

  const handleApply = (amt: number, mth: number) => {
    setAmount(amt);
    setMonth(mth);
    if (amt > 0 && mth >= 1) {
      onPrepaymentChange([{ month: mth, amount: amt }]);
    } else {
      onPrepaymentChange([]);
    }
  };

  const analysis = engineResult.prepaymentAnalysis;

  return (
    <Card className="border-2 border-indigo-200 bg-indigo-50/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-indigo-950 flex items-center space-x-2">
          <PiggyBank className="h-6 w-6 text-indigo-700" />
          <span>
            {language === 'kn' ? 'ಮುಂಗಡ ಪಾವತಿ ಸಿಮ್ಯುಲೇಟರ್ (Prepayment Simulator)' : 'Planning an Extra Payment? (Prepayment Simulation)'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-indigo-900 leading-relaxed">
          {language === 'kn'
            ? 'ಒಂದೇ ಬಾರಿಗೆ ಹೆಚ್ಚುವರಿ ಹಣ ಮರುಪಾವತಿಸಿದರೆ ನಿಮ್ಮ ಸಾಲದ ಬಡ್ಡಿ ಮತ್ತು ಕಂತು ಹೇಗೆ ಕಡಿಮೆಯಾಗುತ್ತದೆ ಎಂಬುದನ್ನು ಪರೀಕ್ಷಿಸಿ.'
            : 'Test how a lump-sum extra repayment reduces your overall interest burden and loan duration.'}
        </p>

        {/* Form Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <Input
            label={language === 'kn' ? 'ಹೆಚ್ಚುವರಿ ಪಾವತಿ ಮೊತ್ತ (₹):' : 'Prepayment Amount (₹):'}
            type="number"
            value={amount || ''}
            onChange={(e) => handleApply(parseFloat(e.target.value) || 0, month)}
            placeholder="50000"
            min={0}
          />
          <Input
            label={language === 'kn' ? 'ಯಾವ ತಿಂಗಳಲ್ಲಿ (Month #):' : 'In Month Number:'}
            type="number"
            inputMode="numeric"
            value={month || ''}
            onChange={(e) => handleApply(amount, parseInt(e.target.value, 10) || 1)}
            placeholder="12"
            min={1}
            max={engineResult.schedule.actualTenureMonths}
            error={prepaymentError ?? undefined}
          />
        </div>

        {/* Dual Scenario Display — only when the input is actually valid. */}
        {analysis && amount > 0 && !prepaymentError && (
          <div className="pt-3 border-t border-indigo-200 space-y-4 animate-fade-in">
            <h4 className="text-sm font-bold text-indigo-950">
              {language === 'kn' ? 'ಎರಡು ಪರ್ಯಾಯ ಪರಿಣಾಮಗಳ ವಿವರಣೆ:' : 'Two Numerical Outcomes Comparison:'}
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Scenario A: Reduce EMI */}
              <div className="p-4 rounded-xl border border-indigo-200 bg-white space-y-2 shadow-sm">
                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                  <span className="font-bold text-indigo-900 text-sm">
                    {language === 'kn' ? 'ಆಯ್ಕೆ A: ಕಂತು ಕಡಿತ (Reduce EMI)' : 'Outcome A: Reduce Monthly EMI'}
                  </span>
                  <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-semibold">
                    Same Tenure
                  </span>
                </div>
                <div className="text-sm space-y-1 text-gray-700">
                  <div className="flex justify-between">
                    <span>{language === 'kn' ? 'ಹೊಸ ತಿಂಗಳ ಕಂತು:' : 'New Monthly EMI:'}</span>
                    <strong className="text-green-700 font-bold">{formatPaiseINR(analysis.reduceEmiScenario.newMonthlyEmiPaise)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>{language === 'kn' ? 'ಉಳಿತಾಯವಾಗುವ ಒಟ್ಟು ಬಡ್ಡಿ:' : 'Interest Saved:'}</span>
                    <strong className="text-amber-700 font-bold">{formatPaiseINR(analysis.reduceEmiScenario.interestSavingsPaise)}</strong>
                  </div>
                </div>
              </div>

              {/* Scenario B: Reduce Tenure */}
              <div className="p-4 rounded-xl border border-indigo-200 bg-white space-y-2 shadow-sm">
                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                  <span className="font-bold text-indigo-900 text-sm">
                    {language === 'kn' ? 'ಆಯ್ಕೆ B: ಅವಧಿ ಕಡಿತ (Reduce Tenure)' : 'Outcome B: Finish Loan Earlier'}
                  </span>
                  <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-semibold">
                    Same EMI
                  </span>
                </div>
                <div className="text-sm space-y-1 text-gray-700">
                  <div className="flex justify-between">
                    <span>{language === 'kn' ? 'ಹೊಸ ಮುಕ್ತಾಯ ಅವಧಿ:' : 'New Loan Duration:'}</span>
                    <strong className="text-gray-900 font-bold">{analysis.reduceTenureScenario.actualTenureMonths} months</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>{language === 'kn' ? 'ಕಡಿತಗೊಂಡ ತಿಂಗಳುಗಳು:' : 'Months Saved:'}</span>
                    <strong className="text-green-700 font-bold">-{analysis.reduceTenureScenario.tenureReductionMonths} months</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>{language === 'kn' ? 'ಉಳಿತಾಯವಾಗುವ ಒಟ್ಟು ಬಡ್ಡಿ:' : 'Interest Saved:'}</span>
                    <strong className="text-amber-700 font-bold">{formatPaiseINR(analysis.reduceTenureScenario.interestSavingsPaise)}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-2 text-xs text-indigo-900 bg-indigo-100/60 p-3 rounded-lg border border-indigo-200/80">
              <Info className="h-4 w-4 shrink-0 text-indigo-700 mt-0.5" />
              <p>
                {language === 'kn'
                  ? 'ಇವು ಎರಡು ಭಿನ್ನ ಮರುಪಾವತಿ ಫಲಿತಾಂಶಗಳಾಗಿವೆ. ನಿಮ್ಮ ಬ್ಯಾಂಕ್ ಒಪ್ಪಂದದ ನಿಯಮಗಳ ಪ್ರಕಾರ ಅಂತಿಮ ಪಾವತಿ ಬದಲಾಗಬಹುದು.'
                  : 'These are two distinct numerical outcomes. Your lender actual prepayment terms may depend on your specific loan agreement.'}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
