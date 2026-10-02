'use client';

import React from 'react';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { cn } from '@/lib/utils/cn';
import { OfficialSourceLink } from '@/features/schemes/components/OfficialSourceLink';
import { copy } from '@/features/fraud/presentation/copy';
import type { SchemeClaimFinding, RecognizedScheme } from '@/lib/fraud/types';
import { translateSchemeFindingExplanation } from '@/features/fraud/lib/fraud-translations';
import { Landmark } from 'lucide-react';

/**
 * Displays scheme-claim analysis findings in the three-state format.
 *
 * Stitch composition: teal "matched scheme record" block with the section
 * heading, then one light card per finding.
 *
 * Three states, preserved distinctly:
 *   - Supported: claim is consistent with available scheme information
 *   - Contradicted: claim does not match the scheme information currently available
 *   - Unknown: we could not verify this claim using the available information
 *
 * Does NOT collapse `unknown` into `contradicted`. Uses `Not verified` wording
 * for the unknown state.
 *
 * If a finding has an `officialUrl`, a "Verify on official source" link is shown.
 */
export function SchemeFindings({
  schemeFindings,
  recognizedSchemes,
}: {
  schemeFindings: SchemeClaimFinding[];
  recognizedSchemes: RecognizedScheme[];
}) {
  const { t, language } = useLanguage();
  const c = copy[language === 'kn' ? 'kn' : 'en'];

  if (schemeFindings.length === 0 && recognizedSchemes.length === 0) {
    return null;
  }

  const statusLabels: Record<string, string> = {
    supported: t.fraud.schemeSupported,
    contradicted: t.fraud.schemeContradicted,
    unknown: t.fraud.schemeUnknown,
  };

  const statusTones: Record<string, string> = {
    supported: 'bg-secondary text-on-secondary',
    contradicted: 'bg-error text-on-error',
    unknown: 'bg-surface-container-highest text-on-surface',
  };

  const statusGlyphs: Record<string, string> = {
    supported: '✓',
    contradicted: '✕',
    unknown: '?',
  };

  return (
    <section
      aria-labelledby="scheme-heading"
      className="rounded-xl bg-secondary text-on-secondary shadow-sm p-space-md lg:p-space-lg"
    >
      <div className="flex items-start gap-space-sm">
        <div
          className="w-8 h-8 rounded bg-on-secondary/10 flex items-center justify-center shrink-0 mt-0.5"
          aria-hidden="true"
        >
          <Landmark className="h-5 w-5 text-tertiary-fixed" />
        </div>
        <div className="min-w-0 flex-1 space-y-space-sm">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-label-sm text-label-sm bg-tertiary-fixed text-primary-container px-2 py-0.5 rounded font-semibold uppercase tracking-wider">
              {c.schemeEyebrow}
            </span>
          </div>
          <h3 id="scheme-heading" className="font-title-md text-title-md text-on-secondary">
            {t.fraud.schemeRecognized}
          </h3>

          <ul className="space-y-space-sm pt-1" role="list">
            {schemeFindings.map((finding) => {
              const status = finding.status;
              const translatedExplanation = translateSchemeFindingExplanation(
                finding.explanation,
                finding.schemeName,
                t
              );

              return (
                <li
                  key={`${finding.schemeId}-${finding.claimType}`}
                  className="rounded-lg bg-surface-container-lowest text-on-surface p-space-sm shadow-sm"
                >
                  <div className="flex items-start gap-2">
                    <span
                      aria-hidden="true"
                      className="text-label-md font-bold leading-5 shrink-0"
                    >
                      {statusGlyphs[status]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-label-lg text-label-lg font-semibold text-on-surface">
                          {finding.schemeName}
                        </p>
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-full font-label-sm text-label-sm font-semibold',
                            statusTones[status]
                          )}
                        >
                          {statusLabels[status]}
                        </span>
                      </div>
                      <p className="text-body-sm text-on-surface-variant mt-1 leading-relaxed">
                        {translatedExplanation}
                      </p>
                    </div>
                  </div>

                  {finding.officialUrl && (
                    <div className="mt-3 pl-6">
                      <OfficialSourceLink
                        source={{
                          url: finding.officialUrl,
                          host: new URL(finding.officialUrl).hostname,
                          isResolving: true,
                        }}
                        label={t.fraud.schemeOfficialSource}
                        warningLabel={t.fraud.sourceWarning}
                        lastVerifiedLabel={t.fraud.lastVerified}
                        lastVerified={new Date().toISOString().split('T')[0]}
                        language={language}
                      />
                    </div>
                  )}
                </li>
              );
            })}

            {/* Show recognized schemes that have no findings */}
            {recognizedSchemes
              .filter(
                (rs) =>
                  !schemeFindings.some((f) => f.schemeId === rs.schemeId)
              )
              .map((rs) => (
                <li
                  key={rs.schemeId}
                  className="rounded-lg bg-surface-container-lowest text-on-surface p-space-sm shadow-sm"
                >
                  <div className="flex items-start gap-2">
                    <span
                      aria-hidden="true"
                      className="text-label-md font-bold leading-5 shrink-0 text-outline"
                    >
                      ●
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-label-lg text-label-lg font-semibold text-on-surface">
                        {rs.schemeName}
                      </p>
                      <p className="text-body-sm text-on-surface-variant mt-1 leading-relaxed">
                        {t.fraud.schemeRecognizedDesc}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/** displayName for dev tools. */
SchemeFindings.displayName = 'SchemeFindings';
