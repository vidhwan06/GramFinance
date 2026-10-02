'use client';

import React from 'react';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { copy } from '@/features/fraud/presentation/copy';

/**
 * Education strip: five common scam patterns.
 *
 * Stitch composition — section header (pill eyebrow, headline, right-hand
 * sub-line) + responsive card grid. Card 5 spans two columns on large screens.
 *
 * All copy is generic educational content (no statistics, no product claims).
 * Example lines are clearly quoted examples of scam wording.
 */
export function CheckEducation() {
  const { language } = useLanguage();
  const c = copy[language === 'kn' ? 'kn' : 'en'];

  return (
    <div className="space-y-space-lg pt-space-md">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-sm">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-surface-container-highest text-on-surface font-label-sm text-label-sm mb-1">
            <span>
              {c.eduEyebrow} · {c.eduEyebrowKn}
            </span>
          </div>
          <h2 className="font-headline-md text-headline-md text-on-surface">
            {c.eduTitle}
          </h2>
        </div>
        <span className="font-body-sm text-body-sm text-on-surface-variant max-w-sm">
          {c.eduSub}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md">
        {c.eduCards.map((card, index) => (
          <article
            key={card.tag}
            className={
              'rounded-xl p-space-md bg-surface-container-lowest shadow-sm border border-outline-variant/50 flex flex-col justify-between space-y-space-md' +
              (index === 4 ? ' lg:col-span-2' : '')
            }
          >
            <div className="space-y-space-sm">
              <div className="flex items-center justify-between gap-2">
                <span
                  className="w-8 h-8 rounded bg-surface-container flex items-center justify-center font-bold text-on-surface text-sm shrink-0"
                  aria-hidden="true"
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="px-2 py-0.5 rounded bg-error-container text-on-error-container font-label-sm text-[11px] font-semibold text-right">
                  {card.tag}
                </span>
              </div>
              <h3 className="font-title-md text-title-md text-on-surface">{card.title}</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                {card.example}
              </p>
            </div>
            <div className="p-2 rounded bg-surface-container-low border border-outline-variant/40 text-on-surface-variant font-body-sm text-body-sm leading-relaxed">
              <strong className="text-on-surface font-semibold">{c.realityLabel}:</strong>{' '}
              {card.reality}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
