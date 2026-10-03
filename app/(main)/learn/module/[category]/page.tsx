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
          className="inline-flex items-center gap-1.5 rounded text-sm font-semibold text-muted-ink transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-teal focus-visible:ring-offset-2 motion-reduce:transition-none"
        >
          <ArrowLeft className="w-4 h-4" />
          {t.learning.backToLessons}
        </Link>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <Spinner size="lg" />
          <p className="text-sm text-muted-ink">{t.learning.loading}</p>
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
          <h2 className="text-xl font-bold text-ink">
            {t.learning.categoryLabels[category as LessonCategory] || category}
          </h2>
          <div className="space-y-2">
            {lessons.map((lesson, idx) => (
              <Link
                key={lesson.id}
                href={`/learn/lesson/${lesson.id}`}
                className="block group rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-teal focus-visible:ring-offset-2"
              >
                <div className="flex items-center gap-3 rounded-xl border border-rule bg-white p-4 transition-colors group-hover:border-deep-teal/50 group-hover:bg-surface-container-low motion-reduce:transition-none">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-deep-teal/10 text-sm font-bold text-deep-teal"
                    aria-hidden="true"
                  >
                    {idx + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-ink">
                      {isKn ? lesson.title_kn : lesson.title_en}
                    </span>
                    <span className="block truncate text-sm text-muted-ink">
                      {isKn ? lesson.summary_kn : lesson.summary_en}
                    </span>
                  </span>
                  <ArrowRight
                    className="h-5 w-5 shrink-0 text-muted-ink transition-colors group-hover:text-deep-teal motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
