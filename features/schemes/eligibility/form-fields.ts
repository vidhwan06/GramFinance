import {
  SCHEME_FIELD_REGISTRY,
  getSchemeFieldDefinition,
  type SchemeApplicant,
  type SchemeFieldName,
} from './field-registry';
import { AGE_MAX, AGE_MIN, MAX_ANNUAL_INCOME_RUPEES, MAX_REQUESTED_LOAN_RUPEES } from './applicant-schema';

/**
 * The browser side of the eligibility flow.
 *
 * ── What this module deliberately does NOT do ───────────────────────────────
 * It does not decide eligibility. There is no verdict logic here, no
 * re-implementation of the engine, and no scheme-specific branching. It maps
 * server-supplied field names to controls, collects what the user typed, and
 * hands that to the server. The server's answer is the only answer.
 *
 * ── Why requiredFields is an input, not a lookup ────────────────────────────
 * The set of questions comes from the server (`requiredFields` on the detail
 * page, produced by the same service the API uses). A second hard-coded list
 * here would be a second source of truth that could drift from the rules, and
 * would mean adding a scheme required editing a React file.
 */

export type FormControlKind = 'number' | 'text' | 'boolean';

export interface FieldControl {
  field: SchemeFieldName;
  kind: FormControlKind;
  label: string;
  /** True for a monetary field, so the control can show a rupee hint. */
  monetary: boolean;
  /** Placeholder text for text and number controls. */
  placeholder?: string;
}

/** Raw form state: strings, because that is what a DOM control produces. */
export type RawFormValues = Partial<Record<SchemeFieldName, string>>;

/**
 * Maps server-supplied field names to controls.
 *
 * The control kind comes from the field registry's declared `type`, never from
 * the field name and never from the scheme. Adding a scheme therefore requires
 * no change here.
 */
export function buildFieldControls(
  requiredFields: readonly SchemeFieldName[],
  language: 'en' | 'kn'
): FieldControl[] {
  const controls: FieldControl[] = [];

  for (const field of requiredFields) {
    // Defence in depth: the registry already produced these names, but a
    // control is never built for something outside the closed registry.
    const definition = getSchemeFieldDefinition(field);
    if (!definition) continue;

    controls.push({
      field: definition.name,
      // The registry speaks "string"; a control is a text field.
      kind: definition.type === 'string' ? 'text' : definition.type,
      label: language === 'kn' ? definition.labelKn : definition.labelEn,
      monetary: definition.monetary,
      placeholder:
        definition.type === 'number' ? (language === 'kn' ? 'ಉದಾಹರಣೆ' : 'e.g. ') + (definition.unit === 'years' ? '18' : '100000') : undefined,
    });
  }

  return controls;
}

/** The boolean control's fixed options. Two values is not a taxonomy. */
export function booleanOptions(language: 'en' | 'kn') {
  return [
    { value: 'true', label: language === 'kn' ? 'ಹೌದು' : 'Yes' },
    { value: 'false', label: language === 'kn' ? 'ಇಲ್ಲ' : 'No' },
  ];
}

export interface ValidationMessages {
  required: string;
  invalidNumber: string;
  negative: string;
  ageRange: string;
}

export const EN_MESSAGES: ValidationMessages = {
  required: 'This answer is needed to check this scheme.',
  invalidNumber: 'Enter a number.',
  negative: 'Enter a number that is zero or more.',
  ageRange: 'Enter an age between 0 and 120.',
};

export const KN_MESSAGES: ValidationMessages = {
  required: 'ಈ ಯೋಜನೆ ಪರಿಶೀಲಿಸಲು ಈ ಉತ್ತರ ಅಗತ್ಯ.',
  invalidNumber: 'ಒಂದು ಸಂಖ್ಯೆ ನಮೂದಿಸಿ.',
  negative: 'ಸದು ಅಥವಾ ಅದಕ್ಕಿಂತ ದೊಡ್ಡ ಸಂಖ್ಯೆ ನಮೂದಿಸಿ.',
  ageRange: '0 ರಿಂದ 120 ರವರೆಗಿನ ವಯಸ್ಸು ನಮೂದಿಸಿ.',
};

/**
 * Client-side validation, for feedback speed only.
 *
 * The server revalidates everything; this exists so a user is told about a
 * typo before a round trip. It deliberately mirrors the server bounds loosely
 * rather than reimplementing them, so the two cannot drift into disagreeing
 * about what is valid.
 */
export function validateRawValues(
  controls: readonly FieldControl[],
  values: RawFormValues,
  messages: ValidationMessages
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const control of controls) {
    const raw = values[control.field];
    const trimmed = typeof raw === 'string' ? raw.trim() : '';

    if (trimmed.length === 0) {
      errors[control.field] = messages.required;
      continue;
    }

    if (control.kind === 'boolean') {
      if (trimmed !== 'true' && trimmed !== 'false') {
        errors[control.field] = messages.required;
      }
      continue;
    }

    if (control.kind === 'text') continue;

    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      errors[control.field] = messages.invalidNumber;
      continue;
    }

    if (control.field === 'age') {
      if (!Number.isInteger(parsed) || parsed < AGE_MIN || parsed > AGE_MAX) {
        errors[control.field] = messages.ageRange;
      }
      continue;
    }

    if (parsed < 0) {
      errors[control.field] = messages.negative;
      continue;
    }

    // Bounds mirror the server so an obviously out-of-range amount is caught
    // before a round trip. The server remains the authority either way.
    if (control.field === 'requestedLoanAmount' && parsed > MAX_REQUESTED_LOAN_RUPEES) {
      errors[control.field] = messages.negative;
    }
    if (control.field === 'annualIncome' && parsed > MAX_ANNUAL_INCOME_RUPEES) {
      errors[control.field] = messages.negative;
    }
  }

  return errors;
}

/**
 * Turns raw control values into the request payload.
 *
 * Only fields the server asked for, only keys from the closed registry, and
 * never a verdict. There is deliberately no code path here that could add
 * `verdict`, `eligible`, `status`, `result` or `score` to the body: the payload
 * is built by iterating `controls`, and `controls` is built from
 * `SCHEME_FIELD_REGISTRY`.
 */
export function buildApplicantPayload(
  controls: readonly FieldControl[],
  values: RawFormValues
): SchemeApplicant {
  const payload: Record<string, string | number | boolean> = {};

  for (const control of controls) {
    if (!getSchemeFieldDefinition(control.field)) continue;

    const raw = values[control.field];
    if (typeof raw !== 'string') continue;

    const trimmed = raw.trim();
    if (trimmed.length === 0) continue;

    if (control.kind === 'boolean') {
      payload[control.field] = trimmed === 'true';
      continue;
    }

    if (control.kind === 'number') {
      const parsed = Number(trimmed);
      if (Number.isFinite(parsed)) payload[control.field] = parsed;
      continue;
    }

    payload[control.field] = trimmed;
  }

  return payload as SchemeApplicant;
}

/** Every field the registry knows about, for tests and for documentation. */
export const KNOWN_FIELDS = SCHEME_FIELD_REGISTRY.map((f) => f.name);
