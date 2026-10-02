'use client';

import React from 'react';
import { useLanguage } from '@/features/language/hooks/useLanguage';

export default function LearnPage() {
  const { t, language } = useLanguage();
  const kn = language === 'kn';

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* ─────────────── HEADER ─────────────── */}
      <header className="space-y-1">
        <p className="text-xs font-bold tracking-widest uppercase text-seal-red">
          {kn ? 'ಕಲಿಕೆ' : 'Learn'}
        </p>
        <h1 className="text-2xl sm:text-3xl font-black text-ink">{t.nav.learn}</h1>
        <p className="text-sm sm:text-base text-muted-ink">
          {kn
            ? 'ಹಣಕಾಸು ಪಾಠಗಳು ಮತ್ತು ಪ್ರಶ್ನೋತ್ತರಗಳ ಮೂಲಕ ಕಲಿಯಿರಿ.'
            : 'Learn through short financial lessons and quizzes.'}
        </p>
      </header>

      <div className="p-6 bg-white rounded-xl border border-rule">
        <p className="text-muted-ink">
          {kn
            ? 'ಕಲಿಕೆ ಮತ್ತು ಪ್ರಶ್ನೋತ್ತರ ಘಟಕ ಶೀಘ್ರದಲ್ಲೇ ಬರಲಿದೆ.'
            : 'Financial learning and quiz module — coming soon.'}
        </p>
      </div>
    </div>
  );
}
