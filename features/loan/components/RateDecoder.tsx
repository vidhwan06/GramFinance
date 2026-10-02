'use client';

import React from 'react';
import { EngineLoanResult } from '../engine/types';
import { V2LoanInputState } from '../hooks/useLoanCalculator';
import { formatPaiseINR } from '../engine/utils/money';
import { formatPercent } from '@/lib/utils/format-currency';
import { pageCopy, getInterestMethodCopy } from '../presentation/dictionary';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { InterestAssumption } from './InterestAssumption';
import { Megaphone, SearchCheck } from 'lucide-react';

export interface RateDecoderProps {
  inputState: V2LoanInputState;
  engineResult: EngineLoanResult;
}

/**
 * "Flat rate vs reducing APR" decoder.
 *
 * The left box is an explicitly-labelled educational example. The right box
 * and the explainer underneath show only figures from the engine for the
 * borrower's own inputs — no converted or approximated APR is invented, since
 * converting a flat rate into an APR would require re-running the loan maths.
 */
export function RateDecoder({ inputState, engineResult }: RateDecoderProps) {
  const { language } = useLanguage();
  const kn = language === 'kn';
  const c = pageCopy[kn ? 'kn' : 'en'];
  const method = getInterestMethodCopy(inputState.interestMethod, language);

  return (
    <section
      className="w-full bg-surface-container-low py-space-xl border-b border-outline-variant/40"
      aria-labelledby="loan-decoder-heading"
    >
      <div className="max-w-[1440px] mx-auto px-margin-mobile lg:px-margin">
        <div className="max-w-3xl mb-space-lg">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-error font-semibold">
            {c.decoderEyebrow}
          </span>
          <h2
            id="loan-decoder-heading"
            className="font-headline-lg text-headline-lg text-on-surface mt-1"
          >
            {c.decoderTitle}
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2 leading-relaxed">
            {c.decoderLead}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-stretch">
          {/* The advertised pitch — educational example */}
          <div className="lg:col-span-6 bg-surface-container-lowest p-6 sm:p-8 rounded-2xl shadow-sm flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-error-container text-on-error-container font-label-sm text-label-sm font-semibold mb-4">
                <Megaphone className="h-4 w-4" aria-hidden="true" />
                <span>{c.pitchBadge}</span>
              </div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface">{c.pitchTitle}</h3>
              <p className="mt-2 inline-block px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm">
                {c.exampleLabel}
              </p>
              <p className="font-body-md text-body-md text-on-surface-variant mt-3">
                {c.pitchBody}
              </p>

              <div className="mt-6 p-4 rounded-lg bg-surface-container-low space-y-2">
                <div className="flex justify-between gap-3 font-body-sm text-body-sm">
                  <span className="text-on-surface-variant">{c.pitchRowRate}</span>
                  <span className="font-semibold text-on-surface">
                    1.0%{kn ? ' / ತಿಂಗಳು' : ' / month'}
                  </span>
                </div>
                <div className="flex justify-between gap-3 font-body-sm text-body-sm">
                  <span className="text-on-surface-variant">{c.pitchRowYear}</span>
                  <span className="font-semibold text-on-surface">12.0%</span>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                {c.pitchMechanismLabel}:
              </span>
              <p className="font-body-sm text-body-sm text-on-surface mt-1">{c.pitchMechanism}</p>
            </div>
          </div>

          {/* The borrower's own numbers, straight from the engine */}
          <div className="lg:col-span-6 bg-primary-container text-inverse-on-surface p-6 sm:p-8 rounded-2xl shadow-md flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm font-bold mb-4">
                <SearchCheck className="h-4 w-4" aria-hidden="true" />
                <span>{c.realityBadge}</span>
              </div>
              <h3 className="font-headline-sm text-headline-sm text-white">{c.realityTitle}</h3>

              <div className="mt-6 p-4 rounded-lg bg-white/10 space-y-3">
                <div className="flex justify-between gap-3 font-body-sm text-body-sm">
                  <span className="text-on-primary-container">{c.realityRowRate}</span>
                  <span className="text-white font-semibold">
                    {formatPercent(inputState.interestRate)}
                  </span>
                </div>
                <div className="flex justify-between gap-3 font-body-sm text-body-sm">
                  <span className="text-on-primary-container">{c.realityRowMethod}</span>
                  <span className="text-white font-semibold">{method.title}</span>
                </div>
                <div className="flex justify-between gap-3 font-body-sm text-body-sm">
                  <span className="text-on-primary-container">{c.realityRowInterest}</span>
                  <span className="text-tertiary-fixed font-bold">
                    {formatPaiseINR(engineResult.totalInterestPaise)}
                  </span>
                </div>
                <div className="flex justify-between gap-3 font-body-sm text-body-sm">
                  <span className="text-on-primary-container">{c.realityRowTotal}</span>
                  <span className="text-white font-bold">
                    {formatPaiseINR(engineResult.totalRepaymentPaise)}
                  </span>
                </div>
              </div>

              <p className="font-body-sm text-body-sm text-inverse-on-surface mt-4 leading-relaxed">
                {c.realityNote}
              </p>
            </div>
          </div>
        </div>

        {/* Real explanation of the method the borrower selected */}
        <div className="mt-space-lg">
          <InterestAssumption interestMethod={inputState.interestMethod} />
        </div>

        <p className="mt-3 font-body-sm text-body-sm text-on-surface-variant">
          {c.compareHint}
        </p>
      </div>
    </section>
  );
}
