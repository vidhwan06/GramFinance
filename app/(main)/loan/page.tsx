'use client';

import React from 'react';
import { useLanguage } from '@/features/language/hooks/useLanguage';

export default function LoanPage() {
  const { t } = useLanguage();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">{t.nav.loan}</h1>
      <div className="p-6 bg-white rounded-xl border border-gray-200">
        <p className="text-gray-600">Loan Understanding Tool calculator placeholder.</p>
      </div>
    </div>
  );
}
