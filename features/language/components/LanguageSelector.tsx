'use client';

import React from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { cn } from '@/lib/utils/cn';

export interface LanguageSelectorProps {
  className?: string;
}

/**
 * Compact segmented language pill from the Stitch header: hairline border,
 * ivory container, aubergine active segment. Kept visible at every viewport —
 * language switching must never be hidden behind a breakpoint.
 */
export function LanguageSelector({ className }: LanguageSelectorProps) {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-lg border border-outline-variant bg-surface-container-lowest p-1',
        className
      )}
      role="group"
      aria-label="Language"
    >
      <button
        onClick={() => setLanguage('en')}
        className={cn(
          'px-3 py-1.5 text-label-sm rounded-md transition-colors min-h-[40px] font-semibold',
          language === 'en'
            ? 'bg-primary-container text-surface shadow-sm'
            : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
        )}
        aria-label="Switch to English"
        aria-pressed={language === 'en'}
      >
        English
      </button>
      <button
        onClick={() => setLanguage('kn')}
        className={cn(
          'px-3 py-1.5 text-label-sm rounded-md transition-colors min-h-[40px] font-semibold font-kannada',
          language === 'kn'
            ? 'bg-primary-container text-surface shadow-sm'
            : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
        )}
        aria-label="ಕನ್ನಡಕ್ಕೆ ಬದಲಾಯಿಸಿ"
        aria-pressed={language === 'kn'}
      >
        ಕನ್ನಡ
      </button>
    </div>
  );
}
