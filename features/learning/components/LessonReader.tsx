'use client';

import React from 'react';
import { BookOpen, Layers } from 'lucide-react';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { LessonHeader } from './LessonHeader';
import { LessonTakeaway } from './LessonTakeaway';
import { LessonFlow } from './LessonFlow';
import { LessonMistakes, LessonTakeawayList } from './LessonMistakes';
import { LessonScenarios } from './LessonScenarios';
import { LessonSteps } from './LessonSteps';
import { LessonRecap } from './LessonRecap';
import { LessonProse, LessonSection, ReadMore } from './LessonSection';
import {
  estimateReadingMinutes,
  heroTakeaway,
  parseFlow,
  parseScenarios,
  progressiveSplit,
  toLines,
  toParagraphs,
} from '../lesson-content';
import type { ChapterNavigation, LessonDetail } from '../types';

interface LessonReaderProps {
  lesson: LessonDetail;
  navigation?: ChapterNavigation | null;
}

/**
 * Guided lesson reader: understand → why it matters → how it works → what goes
 * wrong → apply it → remember it → prove it.
 *
 * ── What changed, and what did not ───────────────────────────────────────────
 * This component used to render nine sections as nine large saturated cards in
 * a fixed order, which produced a very long page where nothing stood out. It is
 * now a sequence of neutral sections with a single strong element at the top.
 *
 * Every field of `LessonContent` is still rendered, still in the lesson's own
 * wording, and still in the same language. `concept` and `explanation` are split
 * into short paragraphs and the tail sits behind "Read more"; `example` is split
 * into its scenarios; `visual` becomes a flow. No text is edited, summarised or
 * dropped, and no field is read from anywhere but the API response — the data
 * model, the API contract and the database are untouched.
 *
 * Sections that a given lesson does not have are simply skipped, which is why
 * each block is guarded rather than rendered with a placeholder.
 */
export function LessonReader({ lesson, navigation }: LessonReaderProps) {
  const { language, t } = useLanguage();
  const isKn = language === 'kn';

  const content = isKn ? lesson.content_kn : lesson.content_en;

  const concept = progressiveSplit(content.concept, 2);
  const explanation = progressiveSplit(content.explanation, 2);
  const whyParagraphs = toParagraphs(content.whyItMatters ?? '', 2);
  const flow = parseFlow(content.visual);
  const mistakes = toLines(content.commonMistakes);
  const takeaways = toLines(content.practicalTakeaway);
  const recap = toLines(content.quickRecap);
  const scenarios = parseScenarios(content.example, t.learning.scenarioMarker);
  const minutes = estimateReadingMinutes(
    [content.concept, content.explanation, content.whyItMatters, content.visual, content.example],
    language
  );

  return (
    <div className="space-y-6">
      <LessonHeader lesson={lesson} navigation={navigation} minutes={minutes} />

      {/* The lesson's own first takeaway, lifted to the top. The full sentence
          still appears unchanged in the Practical Takeaway section below. */}
      {takeaways.length > 0 && <LessonTakeaway text={heroTakeaway(takeaways[0])} />}

      {/* 1. What is this? */}
      <LessonSection
        id="lesson-concept"
        eyebrow={t.learning.eyebrowUnderstand}
        title={t.learning.concept}
        icon={<BookOpen className="h-5 w-5 text-deep-teal" />}
      >
        <ReadMore lead={concept.lead} rest={concept.rest} />
      </LessonSection>

      {/* 2. Why does it matter? */}
      {whyParagraphs.length > 0 && (
        <LessonSection
          id="lesson-why"
          eyebrow={t.learning.eyebrowUnderstand}
          title={t.learning.whyItMatters}
        >
          <LessonProse paragraphs={whyParagraphs} />
        </LessonSection>
      )}

      {/* 3. How does it work? */}
      <LessonFlow flow={flow} />

      {/* 4. What goes wrong? */}
      <LessonMistakes mistakes={mistakes} />

      {/* 5. How do I do it? */}
      <LessonSteps steps={toLines(content.steps)} />

      {/* 6. Apply it — the full explanation, chunked. */}
      {explanation.lead.length > 0 && (
        <LessonSection
          id="lesson-detail"
          eyebrow={t.learning.eyebrowUnderstand}
          title={t.learning.explanation}
          icon={<Layers className="h-5 w-5 text-aubergine" />}
          hint={t.learning.chunkHint}
        >
          <ReadMore lead={explanation.lead} rest={explanation.rest} />
        </LessonSection>
      )}

      {/* 7. Real situations */}
      <LessonScenarios scenarios={scenarios} />

      {/* 8. What should I remember? */}
      <LessonTakeawayList takeaways={takeaways} />

      {/* 9. Self-check */}
      <LessonRecap recap={recap} />
    </div>
  );
}