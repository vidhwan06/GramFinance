'use client';

import React from 'react';
import { useLoanCalculator } from '@/features/loan/hooks/useLoanCalculator';
import { InterestAssumption } from '@/features/loan/components/InterestAssumption';
import { LoanForm } from '@/features/loan/components/LoanForm';
import { FeeEditor } from '@/features/loan/components/FeeEditor';
import { LoanResult } from '@/features/loan/components/LoanResult';
import { LoanBreakdown } from '@/features/loan/components/LoanBreakdown';
import { AmortizationTable } from '@/features/loan/components/AmortizationTable';
import { PrepaymentSimulator } from '@/features/loan/components/PrepaymentSimulator';
import { LoanComparisonCard } from '@/features/loan/components/LoanComparisonCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { Calculator, Receipt } from 'lucide-react';

export default function LoanCalculatorPage() {
  const { language } = useLanguage();
  const kn = language === 'kn';

  const {
    inputState,
    validation,
    engineResult,
    bilingualSummary,
    prepaymentError,
    presets,
    handleChange,
    addFee,
    removeFee,
    applyPreset,
    setPrepayments,
    resetForm,
  } = useLoanCalculator();

  const isValid = validation.isValid;

  const title = kn
    ? 'ಸಾಲದ ವಿವರ ತಿಳಿಯುವ ಉಪಕರಣ (Loan Calculator)'
    : 'Loan Understanding Tool';

  const subtitle = kn
    ? 'ಸಾಲ ಪಡೆಯುವ ಮುನ್ನ ನಿಮ್ಮ ತಿಂಗಳ ಕಂತು (EMI) ಮತ್ತು ಒಟ್ಟು ಬಡ್ಡಿಯನ್ನು ನಿಖರವಾಗಿ ಲೆಕ್ಕಹಾಕಿ.'
    : 'Understand the actual cost of a loan before borrowing — calculate EMI, interest burden, and total repayment upfront.';

  const feesTitle = kn ? '2. ಶುಲ್ಕಗಳು ಮತ್ತು ಅಡಿಗೆಗಳು' : '2. Fees & charges';
  const feesHint = kn
    ? 'ಶುಲ್ಕಗಳನ್ನು ಸೇರಿಸಿದರೆ ಒಟ್ಟು ಪಾವತಿಸುವ ಮೊತ್ತ ಬದಲಾಗುತ್ತದೆ.'
    : 'Optional. Add fees only if your lender charges them.';

  // validation.errors is already Record<string, string>
  const validationErrors = validation.errors;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 flex items-center gap-2">
          <Calculator className="h-8 w-8 text-green-700" aria-hidden="true" />
          <span>{title}</span>
        </h1>
        <p className="text-base text-gray-600 leading-relaxed">{subtitle}</p>
      </div>

      {/* Interest Method Explainer — driven by the selected method */}
      <InterestAssumption interestMethod={inputState.interestMethod} />

      {/* Main Loan Form Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-gray-900">
            {kn ? '1. ಸಾಲದ ವಿವರಗಳನ್ನು ನಮೂದಿಸಿ' : '1. Enter Loan Details'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LoanForm
            inputState={inputState}
            validationErrors={validationErrors}
            onChange={handleChange}
            onApplyPreset={applyPreset}
            onReset={resetForm}
            presets={presets}
          />
        </CardContent>
      </Card>

      {/* Fees & Charges — exposes the V2 fee model, which was previously
          implemented in the engine but unreachable from the UI. */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-gray-900 flex items-center gap-2">
            <Receipt className="h-5 w-5 text-green-700" aria-hidden="true" />
            <span>{feesTitle}</span>
          </CardTitle>
          <p className="text-sm text-gray-500">{feesHint}</p>
        </CardHeader>
        <CardContent>
          <FeeEditor
            fees={inputState.fees}
            onAddFee={addFee}
            onRemoveFee={removeFee}
            validationErrors={validationErrors}
          />
        </CardContent>
      </Card>

      {/* Results Section */}
      {isValid && engineResult && bilingualSummary ? (
        <div className="space-y-6">
          {/* EMI Summary + Cost Breakdown */}
          <LoanResult
            inputState={inputState}
            engineResult={engineResult}
            bilingualSummary={bilingualSummary}
          />

          {/* Visual Cost Bar */}
          <LoanBreakdown engineResult={engineResult} />

          {/* Prepayment Simulator */}
          <PrepaymentSimulator
            engineResult={engineResult}
            onPrepaymentChange={setPrepayments}
            prepaymentError={prepaymentError}
          />

          {/* Amortization Table (collapsible) */}
          <AmortizationTable schedule={engineResult.schedule} />

          {/* Side-by-Side Loan Comparison */}
          <LoanComparisonCard />
        </div>
      ) : (
        <Alert
          variant="warning"
          title={kn ? 'ಸರಿಯಾದ ಅಂಕಿಅಂಶಗಳನ್ನು ನಮೂದಿಸಿ' : 'Please check input values'}
        >
          {kn
            ? 'ಲೆಕ್ಕಾಚಾರವನ್ನು ವೀಕ್ಷಿಸಲು ದಯವಿಟ್ಟು ಮೇಲಿನ ಫಾರ್ಮ್‌ನಲ್ಲಿ ಸರಿಯಾದ ಮೊತ್ತ ಮತ್ತು ದರವನ್ನು ನಮೂದಿಸಿ.'
            : 'Enter valid numbers above to calculate EMI, total repayment, and view the full loan breakdown.'}
        </Alert>
      )}
    </div>
  );
}
