import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { Calculator } from 'lucide-react';

export function InterestAssumption() {
  const { language } = useLanguage();

  const title =
    language === 'kn'
      ? 'ಬಡ್ಡಿ ಲೆಕ್ಕಾಚಾರ: ರಿಡ್ಯೂಸಿಂಗ್ ಬ್ಯಾಲೆನ್ಸ್ (ಇಳಿಕೆ ಆಧಾರಿತ ಬಡ್ಡಿ)'
      : 'Interest calculation: Reducing balance';

  const subtitle =
    language === 'kn'
      ? 'ಪ್ರತಿ ತಿಂಗಳು ನೀವು ಅಸಲು ಮರುಪಾವತಿಸಿದಂತೆ ಬಡ್ಡಿ ಮೊತ್ತವು ಕಡಿಮೆಯಾಗುತ್ತದೆ. ಇದು ಸಾಲಗಾರರಿಗೆ ಹೆಚ್ಚು ಪಾರದರ್ಶಕ ಮತ್ತು ಸುರಕ್ಷಿತ ವಿಧಾನವಾಗಿದೆ.'
      : 'Interest is charged only on the outstanding principal balance each month as you repay. This ensures fair, transparent cost evaluation.';

  return (
    <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50/80 p-4 shadow-sm">
      <div className="flex items-start space-x-3">
        <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800 shrink-0">
          <Calculator className="h-5 w-5" />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-bold text-emerald-950 text-base">{title}</span>
            <Badge variant="success">Standard Reducing Rate</Badge>
          </div>
          <p className="text-sm text-emerald-900 leading-relaxed">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}
