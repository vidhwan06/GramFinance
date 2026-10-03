'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ArrowRight, BookOpen } from 'lucide-react';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import type { LessonSummary } from '../types';

interface LessonCardProps {
  lesson: LessonSummary;
}

export function LessonCard({ lesson }: LessonCardProps) {
  const { language, t } = useLanguage();
  const isKn = language === 'kn';

  const title = isKn ? lesson.title_kn : lesson.title_en;
  const summary = isKn ? lesson.summary_kn : lesson.summary_en;
  const categoryLabel = t.learning.categoryLabels[lesson.category] || lesson.category;
  const difficultyLabel = t.learning.difficultyLabels[lesson.difficulty] || lesson.difficulty;

  return (
    <Card className="flex flex-col justify-between hover:border-green-600 transition-colors">
      <div>
        <CardHeader>
          <div className="flex items-center justify-between gap-2 mb-2">
            <Badge variant="primary" className="text-xs">
              {categoryLabel}
            </Badge>
            <span className="text-xs text-gray-700 font-medium">
              {difficultyLabel}
            </span>
          </div>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">{summary}</p>
        </CardContent>
      </div>
      <CardFooter>
        <Link
          href={`/learn/lesson/${lesson.id}`}
          className="inline-flex items-center justify-between w-full text-sm font-semibold text-green-700 hover:text-green-800 transition-colors group"
        >
          <span className="flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-green-600" />
            {t.learning.startLesson}
          </span>
          <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
        </Link>
      </CardFooter>
    </Card>
  );
}
