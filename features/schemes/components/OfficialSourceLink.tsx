import React from 'react';
import { ExternalLink } from 'lucide-react';
import type { OfficialSource } from '../schemes-service';

export interface OfficialSourceLinkProps {
  source: OfficialSource;
  label: string;
  warningLabel: string;
  lastVerifiedLabel: string;
  lastVerified: string;
  language: 'en' | 'kn';
}

/**
 * Formats an ISO date string (YYYY-MM-DD) for human-readable display.
 */
function formatDate(isoDate: string, language: 'en' | 'kn'): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat(language === 'kn' ? 'kn-IN' : 'en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/**
 * The scheme's stored official source, plus its verification date.
 *
 * The link opens in a new tab with `rel="noopener noreferrer"` so the opened
 * page cannot reach back through `window.opener`.
 *
 * When the stored host uses a reserved, non-resolving TLD the component says
 * so plainly. That check is on the URL, not on any scheme identity, so it also
 * catches a mistyped production URL — and it is what stops fabricated demo
 * fixtures from being presented as an official government portal.
 */
export function OfficialSourceLink({
  source,
  label,
  warningLabel,
  lastVerifiedLabel,
  lastVerified,
  language,
}: OfficialSourceLinkProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-bold text-gray-800">{label}</h3>

      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-base font-medium text-green-700 underline underline-offset-2 hover:text-green-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2 rounded break-all"
      >
        <span>{source.host || source.url}</span>
        <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="sr-only">(opens in a new tab)</span>
      </a>

      {!source.isResolving && (
        <p
          role="note"
          className="rounded-lg border-l-4 border-amber-500 bg-amber-50 p-3 text-sm text-amber-900"
        >
          {warningLabel}
        </p>
      )}

      <p className="text-xs text-gray-500">
        {lastVerifiedLabel}: <time dateTime={lastVerified}>{formatDate(lastVerified, language)}</time>
      </p>
    </div>
  );
}
