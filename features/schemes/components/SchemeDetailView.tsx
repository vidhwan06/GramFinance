'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { DocumentChecklist } from './DocumentChecklist';
import { OfficialSourceLink } from './OfficialSourceLink';
import { EligibilityForm } from './EligibilityForm';
import { getSchemeFieldDefinition } from '../eligibility/field-registry';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { ELIGIBILITY_DISCLAIMER_EN, ELIGIBILITY_DISCLAIMER_KN } from '../types';
import type { SchemeDetail } from '../schemes-service';

export interface SchemeDetailViewProps {
  scheme: SchemeDetail;
}

/**
 * The scheme detail body.
 *
 * A Client Component so it can read the active language. All data was fetched
 * on the server and arrives as a plain serialisable prop.
 *
 * The eligibility section is passed `requiredFields`, which the SERVER computed
 * from the scheme's own rules using the same service the API uses. The form has
 * no list of fields of its own, so adding a scheme needs no change here.
 */
export function SchemeDetailView({ scheme }: SchemeDetailViewProps) {
  const { t, language } = useLanguage();

  const isNationwide = scheme.states.length === 0 || scheme.states.includes('ALL');

  // Group rules by their ruleGroup for human-readable display.
  const groupedRules: Record<number, typeof scheme.rules> = {};
  for (const rule of scheme.rules) {
    const group = rule.ruleGroup;
    if (!groupedRules[group]) groupedRules[group] = [];
    groupedRules[group].push(rule);
  }

  const groupNumbers = Object.keys(groupedRules).map(Number).sort((a, b) => a - b);

  const conditionDescriptions = (rules: typeof scheme.rules): string[] => {
    // Collect all authored descriptions in the group.
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

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900">
          {language === 'kn' ? scheme.nameKn : scheme.nameEn}
        </h1>
        <p className="text-sm text-gray-500">
          {t.schemes.lastVerified}:{' '}
          <time dateTime={scheme.lastVerified}>{scheme.lastVerified}</time>
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{language === 'kn' ? 'ಈ ಯೋಜನೆ ಬಗ್ಗೆ' : 'About this scheme'}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-base text-gray-700 leading-relaxed whitespace-pre-line">
            {language === 'kn' ? scheme.descriptionKn : scheme.descriptionEn}
          </p>
        </CardContent>
      </Card>

      {(scheme.targetGroups.length > 0 || !isNationwide) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.schemes.forWhom}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {scheme.targetGroups.length > 0 && (
              <ul className="flex flex-wrap gap-1.5">
                {scheme.targetGroups.map((group) => (
                  <li key={group}>
                    <Badge variant="neutral">{group}</Badge>
                  </li>
                ))}
              </ul>
            )}
            {!isNationwide && <p className="text-sm text-gray-600">{scheme.states.join(', ')}</p>}
            {isNationwide && (
              <p className="text-sm text-gray-600">{t.schemes.allStates}</p>
            )}
          </CardContent>
        </Card>
      )}

      {scheme.rules.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.schemes.conditionsTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="space-y-3"
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
                    className="rounded-lg border border-gray-200 bg-white p-4"
                  >
                    <div className="space-y-1">
                      {descriptions.map((desc, idx) => (
                        <p key={idx} className="text-sm text-gray-700">
                          <span className="font-semibold">{desc}</span>
                        </p>
                      ))}
                    </div>
                    {rules.length > 1 && (
                      <p className="text-xs text-gray-500 mt-1">
                        {groupOp === 'OR'
                          ? (language === 'kn'
                              ? 'ಈ ನಿಯಮಗಳಲ್ಲಿ ಕನಿಷ್ಟ ಒಂದು ಪೂರೈಯಬೇಕು.'
                              : 'At least one of these conditions must be met.')
                          : (language === 'kn'
                              ? 'ಈ ನಿಯಮಗಳೆಲ್ಲವೂ ಪೂರೈಯಬೇಕು.'
                              : 'All of these conditions must be met.')}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.schemes.documentsTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <DocumentChecklist
            documents={scheme.requiredDocuments}
            title={t.schemes.documentsTitle}
            emptyLabel={t.schemes.documentsEmpty}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.schemes.sourceTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <OfficialSourceLink
            source={scheme.officialSource}
            label={t.schemes.sourceTitle}
            warningLabel={t.schemes.sourceWarning}
            lastVerifiedLabel={t.schemes.lastVerified}
            lastVerified={scheme.lastVerified}
          />
        </CardContent>
      </Card>

      <section id="check" className="scroll-mt-20 space-y-3">
        <h2 className="text-xl font-bold text-gray-900">{t.schemes.checkEligibility}</h2>

        <p className="rounded-lg border-l-4 border-gray-300 bg-gray-50 p-3 text-sm text-gray-700">
          {language === 'kn' ? ELIGIBILITY_DISCLAIMER_KN : ELIGIBILITY_DISCLAIMER_EN}
        </p>

        <EligibilityForm
          schemeId={scheme.id}
          requiredFields={scheme.requiredFields}
          language={language}
          labels={{
            formTitle: t.schemes.formTitle,
            formHelp: t.schemes.formHelp,
            checkButton: t.schemes.checkButton,
            checking: t.schemes.checking,
            addInformation: t.schemes.addInformation,
            errorTitle: t.schemes.errorTitle,
            fieldRequired: t.schemes.fieldRequired,
          }}
        />
      </section>
    </div>
  );
}
