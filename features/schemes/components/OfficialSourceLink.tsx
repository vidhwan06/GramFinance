import React from 'react';
import { ExternalLink, Landmark } from 'lucide-react';
import { formatSchemeDate, schemeDetailText } from './scheme-detail-copy';
import type { OfficialSource } from '../schemes-service';

export interface OfficialSourceLinkProps {
  source: OfficialSource;
  label: string;
  warningLabel: string;
  lastVerifiedLabel: string;
  lastVerified: string;
  language: 'en' | 'kn';
  /**
   * Label for the "visit the portal" call to action. When present the
   * component lays itself out as the Stitch scheme-detail source strip
   * (identity left, single outbound link right); when omitted it renders the
   * compact block its other callers rely on, with the host itself as the link.
   */
  visitLabel?: string;
}

/**
 * The stored official source, plus its verification date.
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
  visitLabel,
}: OfficialSourceLinkProps) {
  const isStrip = Boolean(visitLabel);

  if (!isStrip) {
    // Compact mode — used outside the scheme detail page.
    return (
      <div className="space-y-2">
        <h3 className="font-title-md text-title-md font-bold text-on-surface">{label}</h3>

        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-body-md font-medium text-secondary underline underline-offset-2 hover:text-on-surface rounded break-all"
        >
          <span>{source.host || source.url}</span>
          <ExternalLink className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>

        {!source.isResolving && (
          <p
            role="note"
            className="rounded-lg border-l-4 border-error bg-error-container/50 p-3 text-body-sm text-on-error-container"
          >
            {warningLabel}
          </p>
        )}

        <p className="font-body-sm text-body-sm text-on-surface-variant">
          {lastVerifiedLabel}:{' '}
          <time dateTime={lastVerified} className="font-semibold text-on-surface">
            {formatSchemeDate(lastVerified, language)}
          </time>
        </p>
      </div>
    );
  }

  const c = schemeDetailText(language);

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 w-full">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-surface-container-low flex items-center justify-center text-primary-container shrink-0">
          <Landmark className="w-6 h-6" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <span className="font-label-sm text-label-sm uppercase font-semibold text-outline">
            {c.sourceEyebrow}
          </span>
          <h3 className="font-title-lg text-title-lg text-on-surface font-bold">{label}</h3>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-on-surface-variant font-body-sm text-body-sm">
            <span>
              {c.sourcePortalLabel}:{' '}
              <span className="font-semibold text-on-surface break-all">
                {source.host || source.url}
              </span>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {lastVerifiedLabel}:{' '}
              <time dateTime={lastVerified} className="font-semibold text-on-surface">
                {formatSchemeDate(lastVerified, language)}
              </time>
            </span>
          </div>

          {!source.isResolving && (
            <p
              role="note"
              className="mt-2 rounded-lg border-l-4 border-error bg-error-container/50 p-3 text-body-sm text-on-error-container"
            >
              {warningLabel}
            </p>
          )}
        </div>
      </div>

      <div className="shrink-0">
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface transition-colors font-label-md text-label-md font-semibold border border-outline-variant/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2"
        >
          <span>{visitLabel}</span>
          <ExternalLink className="w-4 h-4" aria-hidden="true" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      </div>
    </div>
  );
}
