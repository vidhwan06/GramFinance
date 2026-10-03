'use client';

import React, { useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { reducingBalanceStrategy } from '../../engine/strategies/reducing-balance';
import { toPaise } from '../../engine/utils/money';
import { validateExistingLoan } from '../schema';
import { calculateExistingLoanStatusOrNull } from '../calculator';
import { existingLoanCopy, existingLoanErrorCopy } from '../copy';
import { ExistingLoanInput, ExistingLoanStatus } from '../types';
import { ExistingLoanStatusCard } from './ExistingLoanStatus';

/**
 * "Check Existing Loan" — form plus result.
 *
 * All arithmetic lives in `calculator.ts`; this file only collects input and
 * renders. There is no calculation in JSX.
 */

/** Form fields as strings, so a half-typed value like "12." is representable. */
interface FormState {
  principalRupees: string;
  annualInterestRate: string;
  tenureMonths: string;
  startDate: string;
  emiRupees: string;
  emisPaid: string;
}

const EMPTY_FORM: FormState = {
  principalRupees: '',
  annualInterestRate: '',
  tenureMonths: '',
  startDate: '',
  emiRupees: '',
  emisPaid: '',
};

function toNumber(value: string): number {
  const trimmed = value.trim();
  if (trimmed === '') return Number.NaN;
  return Number(trimmed);
}

export function ExistingLoanPanel() {
  const { language } = useLanguage();
  const c = existingLoanCopy[language];
  const t = existingLoanErrorCopy[language];

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [emiSource, setEmiSource] = useState<ExistingLoanInput['emiSource']>('derived');
  const [status, setStatus] = useState<ExistingLoanStatus | null>(null);
  const [submitted, setSubmitted] = useState(false);

  /**
   * The live EMI preview for the "Calculate it for me" option.
   *
   * Computed from the same strategy the calculator uses, so the figure shown
   * while typing cannot disagree with the one used on submit. Returns null until
   * the amount, rate and tenure are all usable — a partial EMI is worse than none.
   */
  const standardEmiPreview = useMemo<number | null>(() => {
    const principal = toNumber(form.principalRupees);
    const rate = toNumber(form.annualInterestRate);
    const tenure = toNumber(form.tenureMonths);
    if (!isFinite(principal) || principal <= 0) return null;
    if (!isFinite(rate) || rate < 0) return null;
    if (!isFinite(tenure) || tenure <= 0) return null;
    const emi = reducingBalanceStrategy.calculateInitialEmiPaise(
      toPaise(principal),
      rate,
      Math.floor(tenure)
    );
    return emi > 0 ? emi : null;
  }, [form.principalRupees, form.annualInterestRate, form.tenureMonths]);

  /**
   * An untouched field must be `undefined`, not `NaN`.
   *
   * `toNumber('')` yields NaN, which the schema would read as "you typed
   * something that is not a number" and answer `PRINCIPAL_NOT_POSITIVE` — so an
   * empty box scolded the user for being greater than zero before they had typed
   * anything. `undefined` produces the honest `*_REQUIRED` message instead.
   */
  const optionalNumber = (value: string): number | undefined => {
    const trimmed = value.trim();
    return trimmed === '' ? undefined : Number(trimmed);
  };

  const candidate = useMemo<Partial<ExistingLoanInput>>(
    () => ({
      principalRupees: optionalNumber(form.principalRupees),
      annualInterestRate: optionalNumber(form.annualInterestRate),
      tenureMonths: optionalNumber(form.tenureMonths),
      startDate: form.startDate,
      emisPaid: optionalNumber(form.emisPaid),
      emiRupees: emiSource === 'provided' ? optionalNumber(form.emiRupees) ?? null : null,
      emiSource,
    }),
    [form, emiSource]
  );

  const validation = useMemo(() => validateExistingLoan(candidate), [candidate]);
  // Errors appear once the person has asked for a result, so an untouched form
  // is not covered in red before they have finished typing.
  const visibleErrors = submitted ? validation.errors : {};

  const update = (field: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((previous) => ({ ...previous, [field]: event.target.value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    setStatus(validateExistingLoan(candidate).isValid ? calculateExistingLoanStatusOrNull(candidate) : null);
  };

  const handleReset = () => {
    setForm(EMPTY_FORM);
    setEmiSource('derived');
    setStatus(null);
    setSubmitted(false);
  };

  return (
    <div className="w-full bg-surface pb-space-xl">
      <div className="max-w-[1440px] mx-auto px-margin-mobile lg:px-margin py-space-md">
        {/* ── Intro ── */}
        <div className="max-w-3xl">
          <h2 className="font-headline-lg text-headline-lg text-on-surface">{c.introTitle}</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2 leading-relaxed">
            {c.introLead}
          </p>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">{c.scopeNote}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start mt-space-lg">
          {/* ── Form ── */}
          <div className="lg:col-span-6 bg-surface-container-lowest rounded-xl p-6 sm:p-8 shadow-sm">
            <h3 className="font-title-lg text-title-lg text-on-surface">{c.formTitle}</h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">{c.formLead}</p>

            <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
              <Input
                label={c.principalLabel}
                helperText={c.principalHelper}
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                value={form.principalRupees}
                onChange={update('principalRupees')}
                error={visibleErrors.principalRupees ? t[visibleErrors.principalRupees] : undefined}
              />

              <Input
                label={c.rateLabel}
                helperText={c.rateHelper}
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                value={form.annualInterestRate}
                onChange={update('annualInterestRate')}
                error={
                  visibleErrors.annualInterestRate ? t[visibleErrors.annualInterestRate] : undefined
                }
              />

              <Input
                label={c.tenureLabel}
                helperText={c.tenureHelper}
                type="number"
                inputMode="numeric"
                min={1}
                max={360}
                step={1}
                value={form.tenureMonths}
                onChange={update('tenureMonths')}
                error={visibleErrors.tenureMonths ? t[visibleErrors.tenureMonths] : undefined}
              />

              <Input
                label={c.startDateLabel}
                helperText={c.startDateHelper}
                type="date"
                value={form.startDate}
                onChange={update('startDate')}
                error={visibleErrors.startDate ? t[visibleErrors.startDate] : undefined}
              />
              <p className="font-body-sm text-body-sm text-on-surface-variant">{c.startDateNote}</p>

              {/* EMI: either supplied, or derived. */}
              <fieldset className="space-y-3">
                <legend className="font-label-md text-label-md text-on-surface font-semibold">
                  {c.emiModeLabel}
                </legend>

                <div className="flex flex-col gap-2">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="existing-loan-emi-source"
                      value="derived"
                      checked={emiSource === 'derived'}
                      onChange={() => setEmiSource('derived')}
                      // An explicit `aria-label` keeps the accessible name to the
                      // option title alone. Left to the wrapping `<label>`, the
                      // name would swallow the helper sentence too, so assistive
                      // tech and any `getByRole(..., { name })` would both have to
                      // match two unrelated sentences joined together.
                      aria-label={c.emiModeDerived}
                      aria-describedby="existing-loan-emi-derived-helper"
                      className="mt-1 h-4 w-4 accent-secondary"
                    />
                    <span>
                      <span className="block font-body-md text-body-md text-on-surface">
                        {c.emiModeDerived}
                      </span>
                      <span
                        id="existing-loan-emi-derived-helper"
                        className="block font-body-sm text-body-sm text-on-surface-variant"
                      >
                        {c.emiModeDerivedHelper}
                      </span>
                    </span>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="existing-loan-emi-source"
                      value="provided"
                      checked={emiSource === 'provided'}
                      onChange={() => setEmiSource('provided')}
                      aria-label={c.emiModeProvided}
                      aria-describedby="existing-loan-emi-provided-helper"
                      className="mt-1 h-4 w-4 accent-secondary"
                    />
                    <span>
                      <span className="block font-body-md text-body-md text-on-surface">
                        {c.emiModeProvided}
                      </span>
                      <span
                        id="existing-loan-emi-provided-helper"
                        className="block font-body-sm text-body-sm text-on-surface-variant"
                      >
                        {c.emiModeProvidedHelper}
                      </span>
                    </span>
                  </label>
                </div>

                {emiSource === 'provided' ? (
                  <Input
                    label={c.emiLabel}
                    helperText={c.emiHelper}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    value={form.emiRupees}
                    onChange={update('emiRupees')}
                    error={visibleErrors.emiRupees ? t[visibleErrors.emiRupees] : undefined}
                  />
                ) : (
                  <p className="font-body-md text-body-md text-on-surface tabular-nums">
                    {c.emiCurrentLabel}:{' '}
                    <span className="font-semibold">
                      {standardEmiPreview === null
                        ? '—'
                        : new Intl.NumberFormat('en-IN', {
                            style: 'currency',
                            currency: 'INR',
                            maximumFractionDigits: 0,
                          }).format(standardEmiPreview / 100)}
                    </span>
                  </p>
                )}
              </fieldset>

              <Input
                label={c.emisPaidLabel}
                helperText={c.emisPaidHelper}
                type="number"
                inputMode="numeric"
                min={0}
                max={360}
                step={1}
                value={form.emisPaid}
                onChange={update('emisPaid')}
                error={visibleErrors.emisPaid ? t[visibleErrors.emisPaid] : undefined}
              />

              <div className="flex flex-wrap gap-3 pt-2">
                <Button type="submit" variant="primary">
                  {c.calcButton}
                </Button>
                <Button type="button" variant="outline" onClick={handleReset}>
                  <RotateCcw className="w-4 h-4 mr-1.5" aria-hidden="true" />
                  {c.resetButton}
                </Button>
              </div>
            </form>
          </div>

          {/* ── Result ── */}
          <div className="lg:col-span-6">
            {status ? (
              <ExistingLoanStatusCard status={status} />
            ) : submitted && !validation.isValid ? (
              // `role="alert"` is correct only here: the content appeared as a
              // direct result of pressing the button, so it must be announced.
              <Alert variant="warning" title={c.invalidTitle}>
                {c.invalidBody}
              </Alert>
            ) : (
              // The idle placeholder is a plain div. `Alert` hard-codes
              // `role="alert"`, a live region, so using it here would announce an
              // error to screen readers on page load before anything was wrong.
              <div className="rounded-xl border border-outline-variant/60 bg-surface-container-low p-5">
                <h3 className="font-title-lg text-title-lg text-on-surface">{c.statusTitle}</h3>
                <p className="mt-2 font-body-md text-body-md leading-relaxed text-on-surface-variant">
                  {c.introLead}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}