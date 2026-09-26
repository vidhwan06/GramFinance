'use client';

import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Alert';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { EligibilityResult } from './EligibilityResult';
import {
  EN_MESSAGES,
  KN_MESSAGES,
  booleanOptions,
  buildApplicantPayload,
  buildFieldControls,
  validateRawValues,
  type FieldControl,
  type RawFormValues,
} from '../eligibility/form-fields';
import type { SchemeFieldName } from '../eligibility/field-registry';
// Type-only on purpose: this component receives the server's result shape but
// must not pull the evaluation service into the browser bundle at all.
import type { SchemeOutcome } from '../eligibility/check-eligibility-service';

export interface EligibilityFormProps {
  schemeId: string;
  /** Field names from the server. The form has no list of its own. */
  requiredFields: SchemeFieldName[];
  language: 'en' | 'kn';
  labels: {
    formTitle: string;
    formHelp: string;
    checkButton: string;
    checking: string;
    addInformation: string;
    errorTitle: string;
    fieldRequired: string;
  };
}

/**
 * Collects applicant information and posts it to the server.
 *
 * ── This component holds no eligibility logic ───────────────────────────────
 * It never imports the engine, never compares a value against a threshold, and
 * never produces a verdict. On success it renders whatever the server returned.
 * An architecture test enforces the first rule, and a payload test enforces the
 * last: the request body is built only from server-supplied field names, so it
 * has no field in which a result could be smuggled.
 */
export function EligibilityForm({ schemeId, requiredFields, language, labels }: EligibilityFormProps) {
  const { t } = useLanguage();
  const [values, setValues] = useState<RawFormValues>({});
  const [errors, setErrors] = useState<Record<string, string>>({ });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [result, setResult] = useState<SchemeOutcome | null>(null);
  const [disclaimer, setDisclaimer] = useState<{ en: string; kn: string } | null>(null);

  const allControls = useMemo(
    () => buildFieldControls(requiredFields, language),
    [requiredFields, language]
  );

  // Filter controls based on conditional visibility.
  const controls = useMemo(() => {
    return allControls.filter((control) => {
      if (!control.visibleWhen) return true;
      const dependencyValue = values[control.visibleWhen.field];
      return dependencyValue === control.visibleWhen.value;
    });
  }, [allControls, values]);

  const messages = language === 'kn' ? KN_MESSAGES : EN_MESSAGES;

  const handleChange = (field: SchemeFieldName, value: string) => {
    setValues((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => {
      if (!previous[field]) return previous;
      const next = { ...previous };
      delete next[field];
      return next;
    });
  };

  const submit = async () => {
    // Validate only the currently visible controls.
    const validationErrors = validateRawValues(controls, values, messages);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      // Move focus to the first problem so keyboard users are not stranded.
      const firstInvalid = controls.find((c) => validationErrors[c.field]);
      if (firstInvalid) {
        document.getElementById(`eligibility-field-${firstInvalid.field}`)?.focus();
      }
      return;
    }

    setIsSubmitting(true);
    setServerError(null);

    try {
      const response = await fetch('/api/schemes/eligibility', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        // Only applicant input. No verdict, and no way to add one.
        body: JSON.stringify({
          schemeId,
          applicant: buildApplicantPayload(controls, values),
        }),
      });

      if (response.status === 404) {
        setServerError(labels.errorTitle);
        return;
      }

      if (response.status === 400) {
        setServerError(labels.errorTitle);
        return;
      }

      if (!response.ok) {
        // Never surface a raw server message or exception.
        setServerError(labels.errorTitle);
        return;
      }

      const body = (await response.json()) as {
        success: boolean;
        data?: {
          results: SchemeOutcome[];
          disclaimer: { en: string; kn: string };
        };
      };

      if (!body.success || !body.data || body.data.results.length === 0) {
        setServerError(labels.errorTitle);
        return;
      }

      setResult(body.data.results[0]);
      setDisclaimer(body.data.disclaimer);
    } catch {
      setServerError(labels.errorTitle);
    } finally {
      setIsSubmitting(false);
    }
  };

  /** Returns to the form with every answer intact. */
  const editAnswers = () => {
    setResult(null);
  };

  /** Renders a single control based on its kind. */
  const renderControl = (control: FieldControl) => {
    const id = `eligibility-field-${control.field}`;

    if (control.kind === 'boolean') {
      return (
        <Select
          key={control.field}
          id={id}
          label={control.label}
          value={values[control.field] ?? ''}
          onChange={(e) => handleChange(control.field, e.target.value)}
          options={[{ value: '', label: language === 'kn' ? 'ಆಯ್ಕೆ ಮಾಡಿ' : 'Select an option' }, ...booleanOptions(language)]}
          error={errors[control.field]}
          helperText={control.helperText}
          required
        />
      );
    }

    if (control.kind === 'select') {
      return (
        <Select
          key={control.field}
          id={id}
          label={control.label}
          value={values[control.field] ?? ''}
          onChange={(e) => handleChange(control.field, e.target.value)}
          options={[{ value: '', label: language === 'kn' ? 'ಆಯ್ಕೆ ಮಾಡಿ' : 'Select an option' }, ...(control.options ?? [])]}
          error={errors[control.field]}
          helperText={control.helperText}
          required
        />
      );
    }

    return (
      <Input
        key={control.field}
        id={id}
        label={control.label}
        type={control.kind === 'number' ? 'number' : 'text'}
        inputMode={control.kind === 'number' ? 'decimal' : 'text'}
        value={values[control.field] ?? ''}
        onChange={(e) => handleChange(control.field, e.target.value)}
        error={errors[control.field]}
        helperText={errors[control.field] ? undefined : control.helperText}
        placeholder={control.placeholder}
        required
      />
    );
  };

  if (allControls.length === 0 && !result) {
    return (
      <Alert variant="info" title={labels.formTitle}>
        {labels.formHelp}
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {!result && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{labels.formTitle}</h2>
            <p className="text-sm text-gray-600 mt-1">{labels.formHelp}</p>
          </div>

          {serverError && (
            <Alert variant="danger" title={labels.errorTitle}>
              {labels.errorTitle}
            </Alert>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {controls.map(renderControl)}
          </div>

          <Button
            variant="primary"
            size="lg"
            onClick={submit}
            isLoading={isSubmitting}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? labels.checking : labels.checkButton}
          </Button>
        </div>
      )}

      {result && disclaimer && (
        <EligibilityResult
          outcome={result}
          disclaimer={disclaimer}
          language={language}
          onEdit={editAnswers}
          labels={{
            title: t.schemes.resultTitle,
            intro: t.schemes.resultIntro,
            yourValue: t.schemes.ruleYourValue,
            expected: t.schemes.ruleExpected,
            pass: t.schemes.statusLabels.pass,
            fail: t.schemes.statusLabels.fail,
            unknown: t.schemes.statusLabels.unknown,
            missingTitle: t.schemes.missingTitle,
            missingEmpty: t.schemes.missingEmpty,
            addInformation: labels.addInformation,
          }}
        />
      )}

      {result && !disclaimer && (
        <p className="text-sm text-gray-600">{labels.formHelp}</p>
      )}

      <p className="sr-only" aria-live="polite">
        {result ? labels.addInformation : ''}
      </p>
    </div>
  );
}
