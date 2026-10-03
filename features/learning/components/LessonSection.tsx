'use client';

import React, { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useLanguage } from '@/features/language/hooks/useLanguage';

/**
 * The neutral section frame every part of a lesson sits in.
 *
 * The previous reader gave each section its own saturated colour (green, blue,
 * indigo, amber, slate, red, emerald, purple), which made eight things compete
 * for attention and left nothing reading as more urgent than the rest. This
 * frame is deliberately quiet — a white surface, a hairline rule and a heading —
 * so colour is left free to mean something: green for "this is safe / remember
 * this", amber for "watch out", teal for structure.
 *
 * Colour is never the only signal: every variant also carries a distinct icon
 * and a text heading, so the meaning survives for a colour-blind reader, in
 * greyscale print, and on a screen in direct sunlight.
 */

export type LessonSectionTone = 'neutral' | 'key' | 'warning' | 'structure';

const TONES: Record<LessonSectionTone, { shell: string; eyebrow: string }> = {
  neutral: {
    shell: 'bg-white border-rule',
    eyebrow: 'text-muted-ink',
  },
  key: {
    shell: 'bg-white border-deep-teal/40',
    eyebrow: 'text-deep-teal',
  },
  warning: {
    shell: 'bg-white border-warning-500/50',
    eyebrow: 'text-warning-700',
  },
  structure: {
    shell: 'bg-white border-aubergine/20',
    eyebrow: 'text-aubergine',
  },
};

interface LessonSectionProps {
  id: string;
  title: string;
  eyebrow?: string;
  icon?: React.ReactNode;
  tone?: LessonSectionTone;
  /** Optional one-line orientation under the heading. */
  hint?: string;
  className?: string;
  children: React.ReactNode;
}

export function LessonSection({
  id,
  title,
  eyebrow,
  icon,
  tone = 'neutral',
  hint,
  className,
  children,
}: LessonSectionProps) {
  const headingId = `${id}-heading`;

  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn(
        'scroll-mt-24 rounded-xl border p-4 shadow-sm sm:p-5',
        TONES[tone].shell,
        className
      )}
    >
      <div className="mb-3 flex items-start gap-2.5">
        {icon && (
          <span className="mt-0.5 shrink-0" aria-hidden="true">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          {eyebrow && (
            <p
              className={cn(
                'text-[11px] font-bold uppercase tracking-widest',
                TONES[tone].eyebrow
              )}
            >
              {eyebrow}
            </p>
          )}
          <h2
            id={headingId}
            className="text-lg font-bold leading-snug text-ink sm:text-xl"
          >
            {title}
          </h2>
          {hint && <p className="mt-1 text-sm leading-relaxed text-muted-ink">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

interface LessonProseProps {
  paragraphs: string[];
  className?: string;
}

/** Short, generously spaced body copy. Never a paragraph wider than the measure. */
export function LessonProse({ paragraphs, className }: LessonProseProps) {
  if (paragraphs.length === 0) return null;
  return (
    <div className={cn('space-y-3', className)}>
      {paragraphs.map((paragraph, index) => (
        <p key={index} className="text-base leading-7 text-ink">
          {paragraph}
        </p>
      ))}
    </div>
  );
}

interface ReadMoreProps {
  /** Always-visible lead paragraph. */
  lead: string;
  /** The remaining paragraphs, revealed on request. */
  rest: string[];
}

/**
 * Progressive disclosure for long prose.
 *
 * The lead is the first sentence or two; everything after it stays one tap
 * away. Nothing is deleted — the full text is in the DOM either way, and the
 * control is a real `<button>` with `aria-expanded`/`aria-controls` so a screen
 * reader announces the state and a keyboard can reach it.
 */
export function ReadMore({ lead, rest }: ReadMoreProps) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();

  if (rest.length === 0) {
    return <LessonProse paragraphs={lead ? [lead] : []} />;
  }

  return (
    <div className="space-y-3">
      <p className="text-base leading-7 text-ink">{lead}</p>
      <button
        type="button"
        onClick={() => setExpanded((previous) => !previous)}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-rule bg-surface px-3 py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-teal focus-visible:ring-offset-2 motion-reduce:transition-none"
      >
        <ChevronDown
          className={cn(
            'h-4 w-4 transition-transform motion-reduce:transition-none',
            expanded && 'rotate-180'
          )}
          aria-hidden="true"
        />
        {expanded ? t.learning.showLess : t.learning.readMore}
      </button>
      <div id={panelId} hidden={!expanded}>
        <LessonProse paragraphs={rest} className="border-l-2 border-rule pl-3" />
      </div>
    </div>
  );
}