'use client';

import React from 'react';
import { FeeConfig, FeeType } from '../engine/types';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { Plus, Trash2, Receipt } from 'lucide-react';

export interface FeeEditorProps {
  fees: FeeConfig[];
  onAddFee: (fee: FeeConfig) => void;
  onRemoveFee: (feeId: string) => void;
  /** Surfaces the engine's per-fee validation errors, keyed `fee_<index>`. */
  validationErrors: Record<string, string>;
}

/**
 * Fee treatments, and what each one actually does to the loan.
 *
 * The four types come straight from the V2 engine (features/loan/engine/types.ts)
 * and their effects come from engine/models/fee-model.ts. No calculation here.
 */
const FEE_TYPE_INFO: Record<
  FeeType,
  { labelEn: string; labelKn: string; helpEn: string; helpKn: string; isPercent: boolean }
> = {
  'upfront-flat': {
    labelEn: 'Upfront (paid separately)',
    labelKn: 'ಮುಂಗಡ (ಪ್ರತ್ಯೇಕವಾಗಿ ಪಾವತಿಸಿದ)',
    helpEn: 'A flat amount you pay at the start, on top of every EMI.',
    helpKn: 'ಪ್ರತಿ ಕಂತಿಗೆ ಹೆಚ್ಚುವಾಗಿ ಆರಂಭದಲ್ಲಿ ಪಾವತಿಸುವ ನಿಗದಿತ ಮೊತ್ತ.',
    isPercent: false,
  },
  'upfront-percentage': {
    labelEn: 'Upfront (% of loan)',
    labelKn: 'ಮುಂಗಡ (ಸಾಲದ ಶೇಕಡಾಂಶ)',
    helpEn: 'A percentage of the loan amount, paid at the start.',
    helpKn: 'ಸಾಲದ ಮೊತ್ತದ ಶೇಕಡಾಂಶ, ಆರಂಭದಲ್ಲಿ ಪಾವತಿಸಿದ.',
    isPercent: true,
  },
  'deducted-disbursement': {
    labelEn: 'Deducted before you receive the loan',
    labelKn: 'ಸಾಲ ಸಿಕ್ಕಿಸುವ ಮೊದಲು ಕಪ್ಪಡಿಸಲಾಗುತ್ತದೆ',
    helpEn: 'Taken off the amount that lands in your account. You receive less than you borrowed.',
    helpKn: 'ನಿಮ್ಮ ಖಾತೆಗೆ ಬರುವ ಮೊತ್ತದಿಂದ ಕಪ್ಪಡಿಸಲಾಗುತ್ತದೆ. ನೀವು ಪಡೆದದ್ದಕ್ಕಿಂತ ಕಡಿಮೆ ಸಿಗುತ್ತದೆ.',
    isPercent: false,
  },
  capitalized: {
    labelEn: 'Added to the loan (capitalized)',
    labelKn: 'ಸಾಲಕ್ಕೇ ಸೇರಿಸಲಾಗುತ್ತದೆ',
    helpEn: 'Added to what you repay, so you pay interest on it too.',
    helpKn: 'ನೀವು ಮರುಪಾವತಿಸುವ ಮೊತ್ತಕ್ಕೇ ಸೇರಿಸಲಾಗುತ್ತದೆ, ಅದರ ಮೇಲೂ ಬಡ್ಡಿ ವರುತ್ತದೆ.',
    isPercent: false,
  },
};

const FEE_TYPES = Object.keys(FEE_TYPE_INFO) as FeeType[];

const nextFeeId = () =>
  `fee_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export function FeeEditor({ fees, onAddFee, onRemoveFee, validationErrors }: FeeEditorProps) {
  const { language } = useLanguage();
  const kn = language === 'kn';

  const labels = {
    title: kn ? 'ಶುಲ್ಕಗಳು ಮತ್ತು ಅಡಿಗೆಗಳು (Fees & Charges)' : 'Fees & Charges',
    intro: kn
      ? 'ಸಾಲದಲ್ಲಿ ಇರುವ ಶುಲ್ಕಗಳನ್ನು ನಮೂದಿಸಿ. ಇವು ನಿಮ್ಮ ಒಟ್ಟು ಹೆಚ್ಚನ್ನು ಬದಲಾಗಿಸುತ್ತವೆ.'
      : 'Add any fees your lender charges. They change what you actually repay.',
    addBtn: kn ? 'ಶುಲ್ಕ ಸೇರಿಸಿ' : 'Add a fee',
    nameLabel: kn ? 'ಶುಲ್ಕದ ಹೆಸರು' : 'Fee name',
    namePlaceholder: kn ? 'ಉದಾ: ಪ್ರೊಸೆಸಿಂಗ್ ಶುಲ್ಕ' : 'e.g. Processing fee',
    typeLabel: kn ? 'ಶುಲ್ಕದ ವಿಧ' : 'Fee type',
    valueRupees: kn ? 'ಮೊತ್ತ (₹):' : 'Amount (₹):',
    valuePercent: kn ? 'ಶೇಕಡಾಂಶ (%):' : 'Percentage (%):',
    removeBtn: kn ? 'ತೆಗೆದುಹಾಕಿ' : 'Remove',
    noFees: kn ? 'ಯಾವುದೇ ಶುಲ್ಕ ಸೇರಿಸಿಲ್ಲ.' : 'No fees added.',
    noFeesHint: kn
      ? 'ಸಾಲದಲ್ಲಿ ಯಾವುದೇ ಶುಲ್ಕ ಇಲ್ಲದಿದ್ದರೆ ಇಲ್ಲಿ ಏನೂ ಮಾಡಬೇಡಿ.'
      : 'If your loan has no fees, you do not need to add anything here.',
    listLabel: kn ? 'ಸೇರಿಸಿದ ಶುಲ್ಕಗಳು' : 'Added fees',
  };

  const addFee = () => {
    onAddFee({ id: nextFeeId(), name: '', type: 'upfront-flat', value: 0 });
  };

  const updateFee = (id: string, patch: Partial<FeeConfig>) => {
    // Re-adding through onAddFee keeps a single source of truth for the fee list.
    const current = fees.find((f) => f.id === id);
    if (!current) return;
    onAddFee({ ...current, ...patch });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 text-sm text-gray-700">
        <Receipt className="h-5 w-5 text-green-700 shrink-0 mt-0.5" aria-hidden="true" />
        <p className="leading-relaxed">{labels.intro}</p>
      </div>

      {fees.length === 0 ? (
        <p className="text-sm text-gray-500">{labels.noFees}</p>
      ) : (
        <ul className="space-y-3" aria-label={labels.listLabel}>
          {fees.map((fee, index) => {
            const info = FEE_TYPE_INFO[fee.type];
            const error = validationErrors[`fee_${index}`];
            return (
              <li key={fee.id} className="rounded-xl border border-gray-200 bg-slate-50 p-3 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input
                    id={`fee-name-${fee.id}`}
                    label={labels.nameLabel}
                    value={fee.name}
                    placeholder={labels.namePlaceholder}
                    onChange={(e) => updateFee(fee.id, { name: e.target.value })}
                  />
                  <Select
                    id={`fee-type-${fee.id}`}
                    label={labels.typeLabel}
                    value={fee.type}
                    onChange={(e) => updateFee(fee.id, { type: e.target.value as FeeType })}
                    options={FEE_TYPES.map((t) => ({
                      value: t,
                      label: kn ? FEE_TYPE_INFO[t].labelKn : FEE_TYPE_INFO[t].labelEn,
                    }))}
                  />
                  <Input
                    id={`fee-value-${fee.id}`}
                    label={info.isPercent ? labels.valuePercent : labels.valueRupees}
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min={0}
                    value={fee.value || ''}
                    error={error}
                    onChange={(e) => updateFee(fee.id, { value: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs text-gray-600 leading-snug">
                    {kn ? info.helpKn : info.helpEn}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveFee(fee.id)}
                    aria-label={`${labels.removeBtn}: ${fee.name || (kn ? info.labelKn : info.labelEn)}`}
                  >
                    <Trash2 className="h-4 w-4 mr-1" aria-hidden="true" />
                    <span>{labels.removeBtn}</span>
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Button variant="outline" onClick={addFee} className="flex items-center space-x-1">
        <Plus className="h-4 w-4" aria-hidden="true" />
        <span>{labels.addBtn}</span>
      </Button>

      {fees.length === 0 && (
        <p className="text-xs text-gray-400">{labels.noFeesHint}</p>
      )}
    </div>
  );
}
