'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import type { ModuleInfo } from '@/features/learning/types';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { GraduationCap, BookOpen, ArrowRight } from 'lucide-react';

const MODULE_ICONS: Record<string, string> = {
  banking: '🏦',
  saving: '💰',
  borrowing: '📋',
  insurance: '🛡️',
  'digital-payments': '📱',
  'fraud-awareness': '🔒',
};

export default function LearnPage() {
  const { language, t } = useLanguage();
  const isKn = language === 'kn';
  const [modules, setModules] = useState<ModuleInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchModules = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/learning/lessons');
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || t.learning.errorMessage);
      }
      setModules(data.data?.modules || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.learning.errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModules();
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="space-y-2 border-b border-gray-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-green-100 text-green-800">
            <GraduationCap className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              {t.learning.title}
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mt-0.5">
              {t.learning.subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
          <Spinner size="lg" />
          <p className="text-sm text-gray-600">{t.learning.loading}</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="space-y-4">
          <Alert variant="danger" title={t.learning.errorTitle}>
            {error}
          </Alert>
          <Button variant="outline" onClick={fetchModules}>
            {t.common.retry}
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && modules.length === 0 && (
        <div className="text-center py-12 p-8 bg-white rounded-xl border border-gray-200 space-y-3">
          <GraduationCap className="w-12 h-12 text-gray-400 mx-auto" />
          <h3 className="text-lg font-bold text-gray-900">
            {t.learning.emptyTitle}
          </h3>
          <p className="text-sm text-gray-600 max-w-md mx-auto">
            {t.learning.emptyMessage}
          </p>
        </div>
      )}

      {/* Module Cards */}
      {!loading && !error && modules.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((module) => (
            <Link
              key={module.category}
              href={`/learn/module/${module.category}`}
              className="block group"
            >
              <div className="p-6 rounded-xl border-2 border-gray-200 bg-white hover:border-green-500 hover:shadow-lg transition-all h-full">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-3xl">{MODULE_ICONS[module.category] || '📚'}</span>
                  <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded-full">
                    {module.chapterCount} {t.learning.chapters}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-green-700 transition-colors">
                  {isKn ? module.title_kn : module.title_en}
                </h3>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {isKn ? module.description_kn : module.description_en}
                </p>
                <div className="flex items-center gap-1.5 text-sm font-semibold text-green-700">
                  <BookOpen className="w-4 h-4" />
                  <span>{t.learning.startLesson}</span>
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
