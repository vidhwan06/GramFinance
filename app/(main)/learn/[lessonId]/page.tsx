'use client';

import React from 'react';
import { useLanguage } from '@/features/language/hooks/useLanguage';

export default function LessonDetailPage() {
  const { t } = useLanguage();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-ink">{t.nav.learn}</h1>
      <div className="p-6 bg-white rounded-xl border border-rule">
        <p className="text-muted-ink">Lesson detail reader placeholder.</p>
      </div>
    </div>
  );
}
