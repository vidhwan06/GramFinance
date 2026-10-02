'use client';

import React from 'react';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { cn } from '@/lib/utils/cn';
import { copy } from '@/features/fraud/presentation/copy';
import type { FraudSignalMatch, SignalSeverity } from '@/lib/fraud/types';
import {
  getTranslatedSignalName,
  getTranslatedSignalExplanation,
  getTranslatedWhyItMatters,
} from '@/features/fraud/lib/fraud-translations';
import {
  KeyRound,
  Lock,
  Timer,
  TimerOff,
  IndianRupee,
  Wallet,
  Link2,
  Landmark,
  TriangleAlert,
  CircleAlert,
  Info,
  type LucideIcon,
} from 'lucide-react';

/**
 * Per-signal icons. Presentation only — the internal rule code is used to
 * pick a glyph and is never rendered as text.
 */
const SIGNAL_ICONS: Record<string, LucideIcon> = {
  OTP_REQUEST: KeyRound,
  ACCOUNT_ACCESS_REQUEST: Lock,
  URGENT_ACCOUNT_ACTION: TimerOff,
  URGENT_PAYMENT: Timer,
  UNOFFICIAL_FEE: IndianRupee,
  PERSONAL_UPI: Wallet,
  SUSPICIOUS_LINK: Link2,
  FAKE_GOVERNMENT_CLAIM: Landmark,
};

const SEVERITY_FALLBACK_ICONS: Record<SignalSeverity, LucideIcon> = {
  high: TriangleAlert,
  medium: CircleAlert,
  low: Info,
};

/**
 * Lists the fraud warning signals detected in the message.
 *
 * Stitch composition: section eyebrow + "What we found" heading + count badge,
 * then one card per signal with icon tile, name, severity chip, explanation,
 * why it matters and — when available — the detected phrase.
 *
 * Never renders internal rule codes. Signal severity is indicated by icon
 * tile and chip text, not by color alone.
 */
export function FraudSignalList({
  signals,
}: {
  signals: FraudSignalMatch[];
}) {
  const { t, language } = useLanguage();
  const c = copy[language === 'kn' ? 'kn' : 'en'];

  const severityTones: Record<string, string> = {
    low: 'bg-secondary-container text-on-secondary-container',
    medium: 'bg-warning-500/15 text-warning-700',
    high: 'bg-error-container text-on-error-container',
  };

  const severityLabels: Record<string, string> = {
    low: c.severityLow,
    medium: c.severityMedium,
    high: c.severityHigh,
  };

  return (
    <section aria-labelledby="signals-heading" className="space-y-space-md">
      <div className="flex items-end justify-between gap-space-sm flex-wrap">
        <div>
          <span className="font-label-sm text-label-sm text-secondary font-bold uppercase tracking-wider">
            {c.signalsEyebrow}
          </span>
          <h3
            id="signals-heading"
            className="font-title-lg text-title-lg text-on-surface"
          >
            {c.signalsTitle}
          </h3>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-error text-on-error font-label-sm text-label-sm font-semibold tracking-wide">
          {signals.length}{' '}
          {signals.length === 1 ? c.indicatorOne : c.indicators}
        </span>
      </div>

      <ul className="space-y-space-md" role="list">
        {signals.map((signal) => {
          const sev = signal.severity || 'low';
          const translatedName = getTranslatedSignalName(signal.code, signal.name, t);
          const translatedExplanation = getTranslatedSignalExplanation(
            signal.code,
            signal.explanation,
            t
          );
          const whyItMatters = getTranslatedWhyItMatters(signal.code, t);
          const Icon = SIGNAL_ICONS[signal.code] ?? SEVERITY_FALLBACK_ICONS[sev] ?? Info;

          return (
            <li
              key={signal.code}
              className="rounded-xl bg-surface-container-lowest shadow-sm border border-outline-variant/50 p-space-md lg:p-space-lg"
            >
              <div className="flex items-start gap-space-md">
                <div
                  className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                    severityTones[sev]
                  )}
                  aria-hidden="true"
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1 space-y-space-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <h4 className="font-title-lg text-title-lg text-on-surface">
                      {translatedName}
                    </h4>
                    <span
                      className={cn(
                        'self-start sm:self-auto px-2.5 py-0.5 rounded-full font-label-sm text-label-sm font-semibold w-fit',
                        severityTones[sev]
                      )}
                    >
                      {severityLabels[sev]}
                    </span>
                  </div>

                  <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                    {translatedExplanation}
                  </p>

                  {whyItMatters && (
                    <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                      <span className="font-label-md text-label-md text-on-surface font-semibold">
                        {c.whyThisMatters}:{' '}
                      </span>
                      {whyItMatters}
                    </p>
                  )}

                  {signal.matchedText && (
                    <div className="p-space-sm rounded-lg bg-surface-container-low border border-outline-variant/40">
                      <span className="font-label-sm text-label-sm text-on-surface-variant font-bold uppercase tracking-wider block">
                        {t.fraud.detectedPhrase}:
                      </span>
                      <p className="font-body-md text-body-md text-on-surface italic mt-0.5">
                        &ldquo;{signal.matchedText}&rdquo;
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** displayName for dev tools. */
FraudSignalList.displayName = 'FraudSignalList';
