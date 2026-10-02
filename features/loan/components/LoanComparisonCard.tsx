'use client';

import React, { useState } from 'react';
import { useLoanComparison } from '../hooks/useLoanComparison';
import { formatPaiseINR } from '../engine/utils/money';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { Columns, Copy } from 'lucide-react';

export function LoanComparisonCard() {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useLanguage();
  const {
    configA,
    configB,
    comparisonResult,
    updateConfigA,
    updateConfigB,
    copyAToB,
  } = useLoanComparison();

  const labels = t.loan.comparison;

  if (!isOpen) {
    return (
      <div className="pt-2">
        <Button
          variant="outline"
          onClick={() => setIsOpen(true)}
          className="w-full border-dashed border-2 border-deep-teal text-deep-teal hover:bg-deep-teal/10 flex items-center justify-center space-x-2"
        >
          <Columns className="h-5 w-5" />
          <span>{labels.openBtn}</span>
        </Button>
      </div>
    );
  }

  return (
    <Card className="border-2 border-deep-teal/30 bg-white space-y-4 animate-fade-in">
      <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-rule">
        <CardTitle className="text-lg text-ink flex items-center space-x-2">
          <Columns className="h-5 w-5 text-deep-teal" />
          <span>{labels.cardTitle}</span>
        </CardTitle>
        <div className="flex space-x-2">
          <Button variant="ghost" size="sm" onClick={copyAToB}>
            <Copy className="h-4 w-4 mr-1" aria-hidden="true" />
            <span>{labels.copyBtn}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            aria-label={labels.closeBtn}
          >
            <span aria-hidden="true">✕</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Option A */}
          <div className="p-4 rounded-xl border border-rule bg-warm-ivory/70 space-y-3">
            <h4 className="font-bold text-ink text-base flex items-center justify-between">
              <span>{labels.optionA}</span>
              <span className="text-xs bg-stone text-ink px-2 py-0.5 rounded font-semibold">
                {labels.baseline}
              </span>
            </h4>
            <div className="space-y-2">
              <Input
                id="compare-a-principal"
                label={labels.principal}
                type="number"
                inputMode="decimal"
                value={configA.principalPaise / 100 || ''}
                onChange={(e) =>
                  updateConfigA({ principalPaise: (parseFloat(e.target.value) || 0) * 100 })
                }
              />
              <Input
                id="compare-a-rate"
                label={labels.rate}
                type="number"
                inputMode="decimal"
                step="0.01"
                value={configA.annualInterestRate || ''}
                onChange={(e) =>
                  updateConfigA({ annualInterestRate: parseFloat(e.target.value) || 0 })
                }
              />
              <Input
                id="compare-a-tenure"
                label={labels.tenure}
                type="number"
                inputMode="numeric"
                value={configA.tenureMonths || ''}
                onChange={(e) =>
                  updateConfigA({ tenureMonths: parseInt(e.target.value, 10) || 1 })
                }
              />
              <Select
                id="compare-a-method"
                label={labels.method}
                value={configA.interestMethod}
                onChange={(e) =>
                  updateConfigA({
                    interestMethod: e.target.value as 'reducing-balance' | 'flat-rate',
                  })
                }
                options={[
                  { value: 'reducing-balance', label: labels.reducingBalance },
                  { value: 'flat-rate', label: labels.flatRate },
                ]}
              />
            </div>
          </div>

          {/* Option B */}
          <div className="p-4 rounded-xl border border-rule bg-warm-ivory/70 space-y-3">
            <h4 className="font-bold text-ink text-base flex items-center justify-between">
              <span>{labels.optionB}</span>
              <span className="text-xs bg-deep-teal/10 text-deep-teal px-2 py-0.5 rounded font-semibold">
                {labels.alternative}
              </span>
            </h4>
            <div className="space-y-2">
              <Input
                id="compare-b-principal"
                label={labels.principal}
                type="number"
                inputMode="decimal"
                value={configB.principalPaise / 100 || ''}
                onChange={(e) =>
                  updateConfigB({ principalPaise: (parseFloat(e.target.value) || 0) * 100 })
                }
              />
              <Input
                id="compare-b-rate"
                label={labels.rate}
                type="number"
                inputMode="decimal"
                step="0.01"
                value={configB.annualInterestRate || ''}
                onChange={(e) =>
                  updateConfigB({ annualInterestRate: parseFloat(e.target.value) || 0 })
                }
              />
              <Input
                id="compare-b-tenure"
                label={labels.tenure}
                type="number"
                inputMode="numeric"
                value={configB.tenureMonths || ''}
                onChange={(e) =>
                  updateConfigB({ tenureMonths: parseInt(e.target.value, 10) || 1 })
                }
              />
              <Select
                id="compare-b-method"
                label={labels.method}
                value={configB.interestMethod}
                onChange={(e) =>
                  updateConfigB({
                    interestMethod: e.target.value as 'reducing-balance' | 'flat-rate',
                  })
                }
                options={[
                  { value: 'reducing-balance', label: labels.reducingBalance },
                  { value: 'flat-rate', label: labels.flatRate },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Comparison Table */}
        {comparisonResult && (
          <div className="pt-4 border-t border-rule overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone font-bold text-ink border-b border-rule">
                <tr>
                  <th className="p-3">{labels.metricCol}</th>
                  <th className="p-3 text-right">{labels.optionA}</th>
                  <th className="p-3 text-right">{labels.optionB}</th>
                  <th className="p-3 text-right">{labels.diffCol}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                <tr>
                  <td className="p-3 font-semibold text-ink">{labels.emiRow}</td>
                  <td className="p-3 text-right font-bold">
                    {formatPaiseINR(comparisonResult.optionA.initialMonthlyEmiPaise)}
                  </td>
                  <td className="p-3 text-right font-bold">
                    {formatPaiseINR(comparisonResult.optionB.initialMonthlyEmiPaise)}
                  </td>
                  <td className="p-3 text-right font-semibold text-ink">
                    {formatPaiseINR(comparisonResult.comparison.initialEmiPaise.difference)}
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-ink">{labels.interestRow}</td>
                  <td className="p-3 text-right text-warning-700 font-bold">
                    {formatPaiseINR(comparisonResult.optionA.totalInterestPaise)}
                  </td>
                  <td className="p-3 text-right text-warning-700 font-bold">
                    {formatPaiseINR(comparisonResult.optionB.totalInterestPaise)}
                  </td>
                  <td className="p-3 text-right font-semibold">
                    {formatPaiseINR(comparisonResult.comparison.totalInterestPaise.difference)}
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-ink">{labels.outflowRow}</td>
                  <td className="p-3 text-right font-bold">
                    {formatPaiseINR(comparisonResult.optionA.totalCashOutflowPaise)}
                  </td>
                  <td className="p-3 text-right font-bold">
                    {formatPaiseINR(comparisonResult.optionB.totalCashOutflowPaise)}
                  </td>
                  <td className="p-3 text-right font-semibold">
                    {formatPaiseINR(comparisonResult.comparison.totalCashOutflowPaise.difference)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
