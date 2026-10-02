'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { formatSchemeDate, schemeDetailText } from './scheme-detail-copy';
import { useLanguage } from '@/features/language/hooks/useLanguage';

export interface SchemeBreadcrumbsProps {
  /** Display name for the current page, in the active language. */
  schemeName: string;
  lastVerified: string;
}

/**
 * The Stitch breadcrumb bar: a "back to schemes" trail plus the verified-date
 * pill that opens the page.
 *
 * The date is the record's own `lastVerified`, formatted for reading — the raw
 * ISO string is never shown.
 */
export function SchemeBreadcrumbs({ schemeName, lastVerified }: SchemeBreadcrumbsProps) {
  const { t, language } = useLanguage();
  const c = schemeDetailText(language);

  return (
    <section className="max-w-[1440px] w-full mx-auto px-margin-mobile lg:px-margin pt-6 pb-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2">
          <Link
            href="/schemes"
            className="group flex items-center gap-1.5 font-label-md text-label-md text-on-surface-variant hover:text-on-surface transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2"
          >
            <ArrowLeft
              className="w-4 h-4 text-outline group-hover:text-on-surface transition-colors"
              aria-hidden="true"
            />
            <span>{t.schemes.title}</span>
          </Link>
          <span className="text-outline-variant font-label-md text-label-md" aria-hidden="true">
            /
          </span>
          <span className="font-label-md text-label-md text-on-surface font-semibold">
            {schemeName}
          </span>
        </nav>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-low text-secondary">
          <span className="w-2 h-2 rounded-full bg-secondary" aria-hidden="true" />
          <span className="font-label-sm text-label-sm font-semibold tracking-wide">
            {c.verifiedPillLabel} ·{' '}
            <time dateTime={lastVerified} className="font-semibold">
              {formatSchemeDate(lastVerified, language)}
            </time>
          </span>
        </div>
      </div>
    </section>
  );
}
