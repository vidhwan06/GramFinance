'use client';

import React from 'react';
import { CheckCircle2, ClipboardList, FolderOpen, Info } from 'lucide-react';
import { DocumentChecklist } from './DocumentChecklist';
import { schemeDetailText } from './scheme-detail-copy';
import { getSchemeFieldDefinition } from '../eligibility/field-registry';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import type { SchemeDetail } from '../schemes-service';

/**
 * "Who is it for?" and "What you'll need" side by side.
 *
 * The left card is the eligibility criteria: one card per rule group, straight
 * from `scheme.rules`, each authored description rendered exactly once inside
 * its own paragraph. Nothing is deduplicated, inferred or invented — two rules
 * on the same field with different thresholds are two real conditions.
 *
 * The right card lists `requiredDocuments` verbatim, with the record's own
 * empty-state message when it lists none.
 */
export function SchemeCriteriaSection({ scheme }: { scheme: SchemeDetail }) {
  const { t, language } = useLanguage();
  const c = schemeDetailText(language);

  const groupedRules: Record<number, typeof scheme.rules> = {};
  for (const rule of scheme.rules) {
    const group = rule.ruleGroup;
    if (!groupedRules[group]) groupedRules[group] = [];
    groupedRules[group].push(rule);
  }
  const groupNumbers = Object.keys(groupedRules).map(Number).sort((a, b) => a - b);

  const conditionDescriptions = (rules: typeof scheme.rules): string[] => {
    const descriptions: string[] = [];
    for (const rule of rules) {
      const authored = language === 'kn' ? rule.descriptionKn : rule.descriptionEn;
      if (authored) {
        descriptions.push(authored);
      } else {
        // Fallback: use the field label.
        const def = getSchemeFieldDefinition(rule.field);
        descriptions.push(def ? (language === 'kn' ? def.labelKn : def.labelEn) : rule.field);
      }
    }
    return descriptions;
  };

  const hasRules = scheme.rules.length > 0;

  return (
    <section className="max-w-[1440px] w-full mx-auto px-margin-mobile lg:px-margin pb-space-xl">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ── Left: eligibility criteria ── */}
        {hasRules && (
          <div className="bg-surface-container-lowest p-8 rounded-2xl flex flex-col shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="font-label-sm text-label-sm text-secondary font-semibold uppercase tracking-wider">
                  {c.criteriaEyebrow}
                </span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  {c.criteriaTitle}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-secondary shrink-0">
                <ClipboardList className="w-5 h-5" aria-hidden="true" />
              </div>
            </div>

            <div className="mt-6 p-4 rounded-xl bg-surface-container-low space-y-3">
              <div className="flex items-center gap-2 text-secondary font-semibold font-title-md text-title-md">
                <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
                <span>{t.schemes.conditionsTitle}</span>
              </div>

              <div
                className="space-y-4"
                aria-label={t.schemes.conditionsTitle}
                data-testid="scheme-conditions"
              >
                {groupNumbers.map((groupNum) => {
                  const rules = groupedRules[groupNum];
                  const groupOp = rules[0]?.groupOperator ?? 'AND';
                  const descriptions = conditionDescriptions(rules);
                  return (
                    <div
                      key={groupNum}
                      className="rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-4"
                    >
                      {rules.length > 1 && (
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <span className="font-label-sm text-label-sm text-secondary font-semibold uppercase tracking-wider">
                            {c.groupLabel(groupNum)}
                          </span>
                          <span className="font-body-sm text-body-sm text-on-surface-variant">
                            {groupOp === 'OR' ? t.schemes.orGroupHint : t.schemes.andGroupHint}
                          </span>
                        </div>
                      )}
                      <div className="space-y-2">
                        {descriptions.map((desc, idx) => (
                          <p key={idx} className="font-body-sm text-body-sm text-on-surface">
                            {desc}
                          </p>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 pt-4 flex items-center gap-2 text-outline">
              <Info className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="font-label-sm text-label-sm">{c.criteriaNote}</span>
            </div>
          </div>
        )}

        {/* ── Right: documents ── */}
        <div className={hasRules ? '' : 'lg:col-span-2'}>
          <div className="bg-surface-container-lowest p-8 rounded-2xl h-full flex flex-col shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="font-label-sm text-label-sm text-secondary font-semibold uppercase tracking-wider">
                  {c.documentsEyebrow}
                </span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  {c.documentsTitle}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-secondary shrink-0">
                <FolderOpen className="w-5 h-5" aria-hidden="true" />
              </div>
            </div>

            <div className="mt-6">
              <DocumentChecklist
                documents={scheme.requiredDocuments}
                emptyLabel={t.schemes.documentsEmpty}
              />
            </div>

            <div className="mt-6 pt-4 flex items-center gap-2 text-secondary">
              <CheckCircle2 className="w-[18px] h-[18px] shrink-0" aria-hidden="true" />
              <span className="font-label-sm text-label-sm font-semibold">
                {c.documentsNote}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
