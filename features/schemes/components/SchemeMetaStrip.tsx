'use client';

import React from 'react';
import { targetGroupLabel } from '../eligibility/form-fields';
import { formatSchemeDate, schemeDetailText } from './scheme-detail-copy';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import type { SchemeDetail } from '../schemes-service';

/**
 * The at-a-glance strip: four columns built only from fields the scheme record
 * actually holds — target group, coverage, last verified date and the stored
 * official source.
 *
 * There is deliberately no benefit/amount column: the schema has no amount
 * field, and inventing one would put a fabricated figure in front of the reader.
 */
export function SchemeMetaStrip({ scheme }: { scheme: SchemeDetail }) {
  const { t, language } = useLanguage();
  const c = schemeDetailText(language);

  const isNationwide = scheme.states.length === 0 || scheme.states.includes('ALL');
  const coverage = isNationwide ? t.schemes.allStates : scheme.states.join(', ');

  return (
    <section className="w-full bg-surface-container-low py-8">
      <div className="max-w-[1440px] mx-auto px-margin-mobile lg:px-margin">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {/* 1 — Target group */}
          <div className="flex flex-col space-y-2">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline">
              {c.metaTargetGroup}
            </span>
            {scheme.targetGroups.length === 0 ? (
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                {c.metaTargetGroupEmpty}
              </span>
            ) : (
              <ul className="flex flex-wrap gap-1.5" aria-label={c.metaTargetGroup}>
                {scheme.targetGroups.map((group) => (
                  <li key={group}>
                    <span className="inline-flex items-center rounded-full bg-secondary/10 text-secondary px-2.5 py-0.5 font-body-sm text-body-sm font-semibold">
                      {targetGroupLabel(group, language)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 2 — Coverage */}
          <div className="flex flex-col space-y-1">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline">
              {c.metaCoverage}
            </span>
            <span className="font-title-lg text-title-lg text-on-surface font-semibold">
              {coverage}
            </span>
          </div>

          {/* 3 — Last verified */}
          <div className="flex flex-col space-y-1">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline">
              {t.schemes.lastVerified}
            </span>
            <span className="font-title-lg text-title-lg text-on-surface font-semibold">
              <time dateTime={scheme.lastVerified}>
                {formatSchemeDate(scheme.lastVerified, language)}
              </time>
            </span>
          </div>

          {/* 4 — Stored official source */}
          <div className="flex flex-col space-y-1">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline">
              {c.metaPortal}
            </span>
            <span className="font-title-lg text-title-lg text-on-surface font-semibold break-all">
              {scheme.officialSource.host || scheme.officialSource.url}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
