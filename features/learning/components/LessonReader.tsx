'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Lightbulb, BookOpen, Sparkles, ShieldCheck, Eye, AlertTriangle, ListChecks, RotateCcw } from 'lucide-react';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import type { LessonDetail } from '../types';

interface LessonReaderProps {
  lesson: LessonDetail;
}

function isArrayField(value: string[] | string | undefined): value is string[] {
  return Array.isArray(value);
}

export function LessonReader({ lesson }: LessonReaderProps) {
  const { language, t } = useLanguage();
  const isKn = language === 'kn';

  const title = isKn ? lesson.title_kn : lesson.title_en;
  const content = isKn ? lesson.content_kn : lesson.content_en;
  const categoryLabel = t.learning.categoryLabels[lesson.category] || lesson.category;
  const difficultyLabel = t.learning.difficultyLabels[lesson.difficulty] || lesson.difficulty;

  return (
    <div className="space-y-6">
      {/* Lesson Header */}
      <div className="space-y-2 border-b border-gray-200 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="primary">{categoryLabel}</Badge>
          <Badge variant="neutral">{difficultyLabel}</Badge>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
          {title}
        </h1>
      </div>

      {/* 1. Core Concept */}
      <Card className="border-l-4 border-l-green-600 bg-green-50/50">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-green-100 text-green-800 shrink-0 mt-0.5">
            <Lightbulb className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-green-950">
              {t.learning.concept}
            </h2>
            <p className="text-gray-800 leading-relaxed font-medium">
              {content.concept}
            </p>
          </div>
        </div>
      </Card>

      {/* 2. Why This Matters (new section) */}
      {content.whyItMatters && (
        <Card className="border-l-4 border-l-blue-500 bg-blue-50/50">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-800 shrink-0 mt-0.5">
              <ListChecks className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-blue-950">
                {t.learning.whyItMatters}
              </h2>
              <p className="text-gray-800 leading-relaxed">
                {content.whyItMatters}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* 3. Detailed Explanation */}
      <Card>
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-blue-100 text-blue-800 shrink-0 mt-0.5">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="space-y-2 flex-1">
            <h2 className="text-base font-bold text-gray-900">
              {t.learning.explanation}
            </h2>
            <p className="text-gray-700 leading-relaxed text-base">
              {content.explanation}
            </p>
          </div>
        </div>
      </Card>

      {/* 4. Step-by-Step Guide (new section) */}
      {content.steps && content.steps.length > 0 && (
        <Card className="border-l-4 border-l-indigo-500 bg-indigo-50/30">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-indigo-100 text-indigo-800 shrink-0 mt-0.5">
              <ListChecks className="w-5 h-5" />
            </div>
            <div className="space-y-3 flex-1">
              <h2 className="text-base font-bold text-indigo-950">
                {t.learning.stepByStep}
              </h2>
              <ol className="list-decimal list-inside space-y-2">
                {content.steps.map((step, idx) => (
                  <li key={idx} className="text-gray-800 leading-relaxed text-sm">
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </Card>
      )}

      {/* 5. Real-Life Practical Example */}
      <Card className="bg-amber-50/40 border-amber-200">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-100 text-amber-900 shrink-0 mt-0.5">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="space-y-2 flex-1">
            <h2 className="text-base font-bold text-amber-950">
              {t.learning.example}
            </h2>
            <p className="text-gray-800 leading-relaxed text-base italic">
              &quot;{content.example}&quot;
            </p>
          </div>
        </div>
      </Card>

      {/* 6. Visual Representation */}
      <Card className="bg-slate-900 text-white border-slate-800 shadow-md">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-emerald-400">
            <Eye className="w-5 h-5" />
            <h2 className="text-sm font-bold uppercase tracking-wider">
              {t.learning.visual}
            </h2>
          </div>
          <div className="p-4 rounded-lg bg-slate-800 border border-slate-700 font-mono text-sm leading-relaxed text-slate-200">
            {content.visual}
          </div>
        </div>
      </Card>

      {/* 7. Common Mistakes */}
      <Card className="border-l-4 border-l-red-400 bg-red-50/30">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-red-100 text-red-700 shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-2 flex-1">
            <h2 className="text-base font-bold text-red-950">
              {t.learning.commonMistakes}
            </h2>
            {isArrayField(content.commonMistakes) ? (
              <ul className="list-disc list-inside space-y-1">
                {content.commonMistakes.map((mistake, idx) => (
                  <li key={idx} className="text-gray-800 leading-relaxed text-sm">
                    {mistake}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-800 leading-relaxed">
                {content.commonMistakes}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* 8. Practical Takeaway */}
      <Card className="border-2 border-emerald-500 bg-emerald-50">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-emerald-200 text-emerald-900 shrink-0 mt-0.5">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="space-y-2 flex-1">
            <h2 className="text-base font-bold text-emerald-950">
              {t.learning.takeaway}
            </h2>
            {isArrayField(content.practicalTakeaway) ? (
              <ul className="list-disc list-inside space-y-1">
                {content.practicalTakeaway.map((takeaway, idx) => (
                  <li key={idx} className="text-emerald-900 font-semibold leading-relaxed text-sm">
                    {takeaway}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-emerald-900 font-semibold leading-relaxed">
                {content.practicalTakeaway}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* 9. Quick Recap (new section) */}
      {content.quickRecap && content.quickRecap.length > 0 && (
        <Card className="border-2 border-purple-500 bg-purple-50/50">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-purple-100 text-purple-800 shrink-0 mt-0.5">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div className="space-y-2 flex-1">
              <h2 className="text-base font-bold text-purple-950">
                {t.learning.quickRecap}
              </h2>
              <ul className="list-disc list-inside space-y-1">
                {content.quickRecap.map((recap, idx) => (
                  <li key={idx} className="text-gray-800 leading-relaxed text-sm">
                    {recap}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
