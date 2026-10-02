'use client';

import React from 'react';
import { useLanguage } from '@/features/language/hooks/useLanguage';

/**
 * Bilingual header for the scheme catalogue page.
 *
 * The page itself is a Server Component (it reads through the anon-key client
 * so RLS applies server-side), so this small client shell exists purely to
 * render the title/subtitle in the active language.
 */
export function SchemesPageHeader() {
  const { t, language } = useLanguage();
  const kn = language === 'kn';

  return (
    <header className="space-y-1">
      <p className="text-xs font-bold tracking-widest uppercase text-seal-red">
        {kn ? 'ನೆರವು ಹುಡುಕಿ' : 'Find support'}
      </p>
      <h1 className="text-2xl sm:text-3xl font-black text-ink">{t.schemes.title}</h1>
      <p className="text-sm sm:text-base text-muted-ink max-w-2xl">{t.schemes.subtitle}</p>
    </header>
  );
}
