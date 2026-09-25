'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/features/language/hooks/useLanguage';

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);

    setIsOffline(!navigator.onLine);

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="status"
      className="bg-amber-600 text-white text-sm font-semibold px-4 py-2 text-center shadow-inner"
    >
      ⚠️ {t.common.offline}
    </div>
  );
}
