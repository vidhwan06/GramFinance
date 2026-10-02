'use client';

import React from 'react';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { copy } from '@/features/fraud/presentation/copy';
import { ScanText, ListChecks, Landmark, Info, Ban, RefreshCw, Scale, Phone, Globe, IndianRupee } from 'lucide-react';

/**
 * Explanatory + action-guidance block at the bottom of the inspector page:
 *
 *   1. "How the Scam Inspector checks a message" — three numbered steps
 *   2. "What this tool cannot do" — honest limitations
 *   3. "If you think you are being targeted" — action steps (aubergine card)
 *      with the national cybercrime helpline (1930) and cybercrime.gov.in tiles
 *
 * All copy is bilingual and truthful — no fabricated statistics.
 */
export function CheckGuidance() {
  const { t, language } = useLanguage();
  const c = copy[language === 'kn' ? 'kn' : 'en'];

  const howIcons = [ScanText, ListChecks, Landmark];
  const limitIcons = [Ban, Info, RefreshCw, Scale];
  const actionIcons = [Ban, IndianRupee, Landmark, Phone];

  return (
    <div className="space-y-space-lg pt-space-md">
      {/* How it works + Limitations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
        {/* How it works */}
        <div className="lg:col-span-7 rounded-xl bg-surface-container-lowest shadow-sm border border-outline-variant/50 p-space-md lg:p-space-lg">
          <span className="font-label-sm text-label-sm text-secondary font-bold uppercase tracking-wider">
            {c.howEyebrow}
          </span>
          <h2 className="font-title-lg text-title-lg text-on-surface mt-1 mb-space-md">
            {c.howTitle}
          </h2>

          <ol className="space-y-space-md" role="list">
            {c.howSteps.map((step, index) => {
              const Icon = howIcons[index] ?? ListChecks;
              return (
                <li key={step.title} className="flex items-start gap-space-sm">
                  <span
                    className="w-6 h-6 rounded-full bg-tertiary-fixed text-primary-container flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-secondary shrink-0" aria-hidden="true" />
                      <p className="font-label-lg text-label-lg text-on-surface font-semibold">
                        {step.title}
                      </p>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed mt-0.5">
                      {step.body}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Limitations */}
        <div className="lg:col-span-5 rounded-xl bg-surface-container shadow-sm border border-outline-variant/50 p-space-md lg:p-space-lg">
          <span className="font-label-sm text-label-sm text-secondary font-bold uppercase tracking-wider">
            {c.limitsEyebrow}
          </span>
          <h2 className="font-title-lg text-title-lg text-on-surface mt-1 mb-space-md">
            {c.limitsTitle}
          </h2>

          <ul className="space-y-space-sm" role="list">
            {c.limits.map((limit, index) => {
              const Icon = limitIcons[index] ?? Info;
              return (
                <li
                  key={limit}
                  className="flex items-start gap-2 p-space-sm rounded-lg bg-surface-container-lowest border border-outline-variant/40"
                >
                  <Icon
                    className="h-4 w-4 text-on-surface-variant shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                    {limit}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Action guidance + emergency channels */}
      <div className="rounded-xl bg-primary-container shadow-md p-space-md lg:p-space-lg space-y-space-md">
        <div className="flex items-center gap-space-sm">
          <span
            className="w-8 h-8 rounded-full bg-tertiary-fixed text-primary-container flex items-center justify-center font-bold shrink-0"
            aria-hidden="true"
          >
            !
          </span>
          <div>
            <span className="font-label-sm text-label-sm text-on-primary-container uppercase tracking-wider font-semibold block">
              {c.actionEyebrow}
            </span>
            <h2 className="font-title-md text-title-md text-inverse-on-surface leading-tight">
              {c.actionTitle}
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
          <ul className="lg:col-span-8 space-y-space-md" role="list">
            {c.actionSteps.map((step, index) => {
              const Icon = actionIcons[index] ?? Phone;
              return (
                <li key={step} className="flex items-start gap-space-sm">
                  <span
                    className="w-6 h-6 rounded-full bg-white/10 text-tertiary-fixed flex items-center justify-center shrink-0 mt-0.5"
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1 flex items-start gap-2">
                    <p className="font-body-md text-body-md text-inverse-on-surface leading-relaxed flex-1">
                      {step}
                    </p>
                    <Icon
                      className="h-4 w-4 text-tertiary-fixed shrink-0 mt-1"
                      aria-hidden="true"
                    />
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Emergency channel tiles */}
          <div className="lg:col-span-4 space-y-space-sm">
            <div className="p-space-sm rounded-lg bg-surface-container-lowest flex items-center justify-between gap-2 shadow-sm">
              <div>
                <span className="font-label-sm text-label-sm text-on-surface-variant block">
                  {c.helplineTileLabel}
                </span>
                <span className="font-title-md text-title-md font-bold text-error">
                  {c.helplineTileValue}
                </span>
              </div>
              <span className="font-label-sm text-label-sm text-on-surface-variant text-right">
                {c.helplineTileNote}
              </span>
            </div>

            <div className="p-space-sm rounded-lg bg-surface-container-lowest flex items-center justify-between gap-2 shadow-sm">
              <div>
                <span className="font-label-sm text-label-sm text-on-surface-variant block">
                  {c.reportTileLabel}
                </span>
                <span className="font-title-md text-title-md font-semibold text-secondary break-all">
                  {c.reportTileValue}
                </span>
              </div>
              <Globe className="h-4 w-4 text-outline shrink-0" aria-hidden="true" />
            </div>

            <p className="font-label-sm text-label-sm text-on-primary-container leading-relaxed pt-1">
              {t.fraud.helplineNote}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
