'use client';

import React from 'react';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { cn } from '@/lib/utils/cn';
import { OfficialSourceLink } from '@/features/schemes/components/OfficialSourceLink';
import type { SchemeClaimFinding, RecognizedScheme } from '@/lib/fraud/types';

/**
 * Displays scheme-claim analysis findings in the three-state format.
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
  const { t } = useLanguage();

  if (schemeFindings.length === 0 && recognizedSchemes.length === 0) {
    return null;
  }

  const statusLabels: Record<string, string> = {
    supported: t.fraud.schemeSupported,
    contradicted: t.fraud.schemeContradicted,
    unknown: t.fraud.schemeUnknown,
  };

  const statusTones: Record<string, string> = {
    supported: 'border-green-300 bg-green-50',
    contradicted: 'border-red-300 bg-red-50',
    unknown: 'border-amber-300 bg-amber-50',
  };

  const statusGlyphs: Record<string, string> = {
    supported: '✓',
    contradicted: '✕',
    unknown: '?',
  };

  return (
    <div>
      <ul className="space-y-3" role="list">
        {schemeFindings.map((finding) => {
          const status = finding.status;

          return (
            <li
              key={`${finding.schemeId}-${finding.claimType}`}
              className={cn('rounded-lg border p-3', statusTones[status])}
            >
              <div className="flex items-start gap-2">
                <span
                  aria-hidden="true"
                  className="text-lg font-bold leading-6"
                >
                  {statusGlyphs[status]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">
                    {finding.schemeName}
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {finding.explanation}
                  </p>
                  <p className="text-xs font-medium text-gray-500 mt-1">
                    {statusLabels[status]}
                  </p>
                </div>
              </div>

              {finding.officialUrl && (
                <div className="mt-3 pl-8">
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
                    language="en"
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
              className="rounded-lg border border-rule bg-white p-3"
            >
              <div className="flex items-start gap-2">
                <span
                  aria-hidden="true"
                  className="text-lg font-bold leading-6 text-gray-400"
                >
                  ●
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">
                    {rs.schemeName}
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {t.fraud.schemeRecognizedDesc}
                  </p>
                </div>
              </div>
            </li>
          ))}
      </ul>
    </div>
  );
}

/** displayName for dev tools. */
SchemeFindings.displayName = 'SchemeFindings';
