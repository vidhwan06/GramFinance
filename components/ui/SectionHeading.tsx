import React from 'react';
import { cn } from '@/lib/utils/cn';

export interface SectionHeadingProps {
  /** Optional id for aria-labelledby on the wrapping section. */
  id?: string;
  /** Small uppercase eyebrow above the title. */
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
}

/**
 * The single heading pattern used across public pages: a restrained
 * uppercase eyebrow, a bold title, and an optional description line.
 */
export function SectionHeading({ id, eyebrow, title, description, className }: SectionHeadingProps) {
  return (
    <div className={cn('space-y-1', className)}>
      {eyebrow && (
        <p className="text-xs font-bold tracking-widest uppercase text-seal-red">{eyebrow}</p>
      )}
      <h2 id={id} className="text-xl font-bold text-ink leading-snug">
        {title}
      </h2>
      {description && <p className="text-sm text-muted-ink leading-relaxed">{description}</p>}
    </div>
  );
}
