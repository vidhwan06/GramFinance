'use client';

import React from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { cn } from '@/lib/utils/cn';

export interface LanguageSelectorProps {
  className?: string;
}

export function LanguageSelector({ className }: LanguageSelectorProps) {
  const { language, setLanguage } = useLanguage();

  return (
    <div className={cn('inline-flex items-center rounded-lg bg-gray-100 p-1 border border-gray-300', className)}>
      <button
        onClick={() => setLanguage('en')}
        className={cn(
          'px-3 py-1.5 text-sm font-semibold rounded-md transition-colors min-h-[40px]',
          language === 'en'
            ? 'bg-green-700 text-white shadow-sm'
            : 'text-gray-700 hover:text-gray-900'
        )}
        aria-label="Switch to English"
      >
        English
      </button>
      <button
        onClick={() => setLanguage('kn')}
        className={cn(
          'px-3 py-1.5 text-sm font-semibold rounded-md transition-colors min-h-[40px]',
          language === 'kn'
            ? 'bg-green-700 text-white shadow-sm'
            : 'text-gray-700 hover:text-gray-900'
        )}
        aria-label="ಕನ್ನಡಕ್ಕೆ ಬದಲಾಯಿಸಿ"
      >
        ಕನ್ನಡ
      </button>
    </div>
  );
}
