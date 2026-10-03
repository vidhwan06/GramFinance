'use client';

import React from 'react';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { existingLoanCopy } from '../existing-loan/copy';

export type LoanToolMode = 'calculate' | 'existing';

/**
 * The two-mode switch for the Loan Tool.
 *
 * Implemented as a real ARIA tablist with roving `tabindex`, arrow-key movement
 * and `aria-controls`, so it behaves the way a keyboard user expects rather than
 * being two buttons that merely look like tabs.
 *
 * Switching mode does NOT clear the other mode's inputs: each panel owns its own
 * state, so a person comparing a quote against their existing loan does not lose
 * either figure when they move back and forth. That is the whole reason for the
 * tabs existing rather than two separate pages.
 */
interface LoanModeTabsProps {
  mode: LoanToolMode;
  onChange: (mode: LoanToolMode) => void;
}

const TABS: Array<{ id: LoanToolMode; key: 'modeCalculate' | 'modeExisting' }> = [
  { id: 'calculate', key: 'modeCalculate' },
  { id: 'existing', key: 'modeExisting' },
];

export function LoanModeTabs({ mode, onChange }: LoanModeTabsProps) {
  const { language } = useLanguage();
  const c = existingLoanCopy[language];

  /** Roving focus: only the selected tab is in the tab order. */
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = TABS.findIndex((tab) => tab.id === mode);
    let nextIndex: number | null = null;

    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % TABS.length;
    if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + TABS.length) % TABS.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = TABS.length - 1;
    if (nextIndex === null) return;

    event.preventDefault();
    const nextMode = TABS[nextIndex].id;
    onChange(nextMode);
    // Move focus with the selection, which is what a tablist should do.
    document.getElementById(`loan-mode-tab-${nextMode}`)?.focus();
  };

  return (
    <div className="w-full bg-surface">
      <div className="max-w-[1440px] mx-auto px-margin-mobile lg:px-margin pt-space-md">
        <div
          role="tablist"
          aria-label={language === 'kn' ? 'ಸಾಲ ಸಾಧನದ ಆಯ್ಕೆಗಳು' : 'Loan tool modes'}
          onKeyDown={onKeyDown}
          className="inline-flex rounded-xl border border-outline-variant/60 bg-surface-container-low p-1 gap-1 max-w-full"
        >
          {TABS.map((tab) => {
            const selected = tab.id === mode;
            return (
              <button
                key={tab.id}
                id={`loan-mode-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`loan-mode-panel-${tab.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => onChange(tab.id)}
                className={
                  selected
                    ? 'px-4 py-3 rounded-lg font-label-md text-label-md font-semibold bg-secondary text-on-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2'
                    : 'px-4 py-3 rounded-lg font-label-md text-label-md font-semibold text-on-surface-variant hover:text-on-surface transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2'
                }
              >
                {c[tab.key]}
              </button>
            );
          })}
        </div>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">{c.modeExistingHint}</p>
      </div>
    </div>
  );
}