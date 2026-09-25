import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { getInterestMethodCopy } from '../presentation/dictionary';
import { InterestMethod } from '../engine/types';
import { Calculator } from 'lucide-react';

export interface InterestAssumptionProps {
  /**
   * The method the user actually selected in the form.
   *
   * This component previously took no props and unconditionally rendered
   * "Interest calculation: Reducing balance" with a "Standard Reducing Rate"
   * badge. A user who chose Flat Rate for an MFI/SHG loan was still told the app
   * used reducing balance — a factual misstatement in a financial-safety tool.
   * The method is now read from state, never assumed.
   */
  interestMethod: InterestMethod;
}

export function InterestAssumption({ interestMethod }: InterestAssumptionProps) {
  const { language } = useLanguage();
  const { title, description, context, badge } = getInterestMethodCopy(interestMethod, language);

  const isFlatRate = interestMethod === 'flat-rate';
  const palette = isFlatRate
    ? {
        shell: 'rounded-xl border-2 border-amber-200 bg-amber-50/80 p-4 shadow-sm',
        iconWrap: 'p-2 rounded-lg bg-amber-100 text-amber-800 shrink-0',
        heading: 'font-bold text-amber-950 text-base',
        body: 'text-sm text-amber-900 leading-relaxed',
      }
    : {
        shell: 'rounded-xl border-2 border-emerald-200 bg-emerald-50/80 p-4 shadow-sm',
        iconWrap: 'p-2 rounded-lg bg-emerald-100 text-emerald-800 shrink-0',
        heading: 'font-bold text-emerald-950 text-base',
        body: 'text-sm text-emerald-900 leading-relaxed',
      };

  return (
    <div className={palette.shell}>
      <div className="flex items-start space-x-3">
        <div className={palette.iconWrap}>
          <Calculator className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={palette.heading}>
              {language === 'kn' ? 'ಬಡ್ಡಿ ಲೆಕ್ಕಾಚಾರ ವಿಧಾನ' : 'Interest calculation method'}
            </span>
            {/* Announced to screen readers as the current selection, not just a colour. */}
            <Badge variant={isFlatRate ? 'warning' : 'success'}>{badge}</Badge>
          </div>
          <p className={palette.body}>
            <span className="font-semibold">{title}: </span>
            {description}
          </p>
          <p className={`${palette.body} mt-1`}>
            <span className="opacity-80">{context}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
