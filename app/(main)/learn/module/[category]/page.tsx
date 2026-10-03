'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import type { LessonCategory, LessonSummary } from '@/features/learning/types';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface PageProps {
  params: Promise<{ category: string }>;
}

const VALID_CATEGORIES: LessonCategory[] = [
  'banking',
  'saving',
  'borrowing',
  'insurance',
  'digital-payments',
  'fraud-awareness',
];

export default function ModulePage({ params }: PageProps) {
  const { category } = use(params);
  const { language, t } = useLanguage();
  const isKn = language === 'kn';
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isValidCategory = VALID_CATEGORIES.includes(category as LessonCategory);

  const fetchLessons = async () => {
    if (!isValidCategory) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/learning/lessons');
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || t.learning.errorMessage);
      }
      const allLessons = data.data?.lessons || [];
      setLessons(allLessons.filter((l: LessonSummary) => l.category === category));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.learning.errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLessons();
  }, [category]);

  if (!isValidCategory) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <Alert variant="danger" title={t.learning.errorTitle}>
          {t.learning.invalidCategory}
        </Alert>
        <Link href="/learn">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            {t.learning.backToLessons}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back Link */}
      <div>
        <Link
          href="/learn"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t.learning.backToLessons}
        </Link>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
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
          <Button variant="outline" onClick={fetchLessons}>
            {t.common.retry}
          </Button>
        </div>
      )}

      {/* Chapter List */}
      {!loading && !error && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">
            {t.learning.categoryLabels[category as LessonCategory] || category}
          </h2>
          <div className="space-y-3">
            {lessons.map((lesson, idx) => (
              <Link
                key={lesson.id}
                href={`/learn/lesson/${lesson.id}`}
                className="block group"
              >
                <div className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 bg-white hover:border-green-500 hover:shadow-md transition-all">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 text-green-800 font-bold text-sm shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 group-hover:text-green-700 transition-colors truncate">
                      {isKn ? lesson.title_kn : lesson.title_en}
                    </h3>
                    <p className="text-sm text-gray-500 truncate">
                      {isKn ? lesson.summary_kn : lesson.summary_en}
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition-colors shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
