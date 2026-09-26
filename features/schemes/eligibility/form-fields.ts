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

export type FormControlKind = 'number' | 'text' | 'boolean' | 'select';

export interface FieldControl {
  field: SchemeFieldName;
  kind: FormControlKind;
  label: string;
  /** True for a monetary field, so the control can show a rupee hint. */
  monetary: boolean;
  /** Placeholder text for text and number controls. */
  placeholder?: string;
  /** Options for select controls. */
  options?: { value: string; label: string }[];
  /** Helper text shown below the control. */
  helperText?: string;
  /**
   * If set, this field is only shown when the dependent field has the
   * specified value. This is a UI convenience only — the server still
   * evaluates all rules.
   */
  visibleWhen?: { field: SchemeFieldName; value: string };
}

/** Raw form state: strings, because that is what a DOM control produces. */
export type RawFormValues = Partial<Record<SchemeFieldName, string>>;

/**
 * Maps server-supplied field names to controls.
 *
 * The control kind comes from the field registry's declared `type`, never from
 * the field name and never from the scheme. Adding a scheme therefore requires
 * no change here.
 *
 * Enum-backed string fields become selects with human-readable labels. The
 * backend canonical values are preserved — only the display changes.
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

    const base: FieldControl = {
      field: definition.name,
      // The registry speaks "string"; a control is a text field.
      kind: definition.type === 'string' ? 'text' : definition.type,
      label: language === 'kn' ? definition.labelKn : definition.labelEn,
      monetary: definition.monetary,
      placeholder:
        definition.type === 'number' ? (language === 'kn' ? 'ಉದಾಹರಣೆ' : 'e.g. ') + (definition.unit === 'years' ? '18' : '100000') : undefined,
    };

    // Enum-backed fields become selects with human-readable labels.
    const enumOptions = enumOptionsFor(definition.name, language);
    if (enumOptions) {
      base.kind = 'select';
      base.options = enumOptions;
    }

    // Conditional fields are only shown when a dependency is met.
    const conditional = conditionalFor(definition.name);
    if (conditional) {
      base.visibleWhen = conditional;
    }

    // Helper text for fields that need extra explanation.
    const helper = helperTextFor(definition.name, language);
    if (helper) {
      base.helperText = helper;
    }

    controls.push(base);
  }

  return controls;
}

/**
 * Human-readable options for enum-backed fields.
 *
 * The backend canonical values are preserved exactly. Only the display labels
 * are human-readable. This mapping is generic — it applies to any scheme that
 * uses these fields, not just PM-KISAN.
 */
function enumOptionsFor(
  field: SchemeFieldName,
  language: 'en' | 'kn'
): { value: string; label: string }[] | null {
  switch (field) {
    case 'applicantCategory':
      return [
        { value: 'farmer', label: language === 'kn' ? 'ರೈತ' : 'Farmer' },
        { value: 'institutional', label: language === 'kn' ? 'ಸಂಸ್ಥಾತ್ಮಕ' : 'Institutional' },
      ];
    case 'employmentType':
      return [
        { value: 'self-employed', label: language === 'kn' ? 'ಸ್ವಾಯತ್ತ ಉದ್ಯೋಗ' : 'Not a retired pensioner' },
        { value: 'pensioner', label: language === 'kn' ? 'ನಿವೃತ್ತ ಪನ್ಷನರ' : 'Retired pensioner' },
      ];
    case 'govtEmployeeCategory':
      return [
        { value: 'none', label: language === 'kn' ? 'ಸರ್ಕಾರಿ ಉದ್ಯೋಗಿಗೆ ಅಲ್ಲ' : 'Not a government employee' },
        { value: 'mts_class4_groupd', label: language === 'kn' ? 'MTS / ಕ್ಲಾಸ್ IV / ಗ್ರೂಪ್ D' : 'MTS / Class IV / Group D' },
        { value: 'other_govt', label: language === 'kn' ? 'ಇತರೆ ಸರ್ಕಾರಿ ಉದ್ಯೋಗಿ' : 'Other government employee' },
      ];
    default:
      return null;
  }
}

/**
 * Conditional field dependencies.
 *
 * A field with a `visibleWhen` is only rendered when the dependent field has
 * the specified value. This is a UI convenience — the server still evaluates all
 * rules regardless of what the UI shows.
 */
function conditionalFor(
  field: SchemeFieldName
): { field: SchemeFieldName; value: string } | null {
  switch (field) {
    case 'monthlyPension':
      return { field: 'employmentType', value: 'pensioner' };
    default:
      return null;
  }
}

/**
 * Helper text for fields that benefit from extra explanation.
 *
 * This is generic guidance text, not scheme-specific logic. It helps users
 * understand why a question is being asked without exposing backend details.
 */
function helperTextFor(
  field: SchemeFieldName,
  language: 'en' | 'kn'
): string | null {
  switch (field) {
    case 'ownsCultivableLand':
      return language === 'kn'
        ? 'ನಿಮ್ಮ ಉತ್ತರವನ್ನು ಅರ್ಹತೆ ಅಂದಾಜು ಮಾಡಲು ಮಾತ್ರ ಬಳಸುತ್ತೇವೆ. ಅಧಿಕೃತ ಭೂದಾಖಲೆ ಪರಿಶೀಲನೆ ಇನ್ನೂ ಅಗತ್ಯವಿದೆ.'
        : 'We can only use your answer to estimate eligibility. Official land-record verification is still required.';
    case 'isPoliticalOfficeHolder':
      return language === 'kn'
        ? 'ಇದು PM-KISAN ಹೊರಗಿಡುವಿಕೆ ನಿಯಮಗಳಲ್ಲಿ ಸೇರಿದ್ದ ಸಾರ್ವಜನಿಕ ಮತ್ತು ಸಂವಿಧಾನಿಕ ಹುದ್ದೆಗಳನ್ನು ಮಾತ್ರ ಸೂಚಿಸುತ್ತದೆ.'
        : 'This refers only to the public and constitutional offices covered by the PM-KISAN exclusion rules.';
    case 'isRegisteredProfessional':
      return language === 'kn'
        ? 'ಉದಾಹರಣೆಗೆ ವೈದ್ಯರು, ಎಂಜಿನಿಯರ್‌ಗಳು, ವಕೀಲರು, ಚಾರ್ಟರ್ಡ್ ಅಕೌಂಟೆಂಟ್‌ಗಳು, ವಾಸ್ತುಶಿಲ್ಪಿಗಳು — ಅರ್ಹತೆ ನಿಯಮಗಳಲ್ಲಿ ಸೇರಿದ್ದ ವೃತ್ತಿಪರ ವರ್ಗಗಳು.'
        : 'Examples include the professional categories covered by the PM-KISAN exclusion rules.';
    case 'monthlyPension':
      return language === 'kn'
        ? 'PM-KISAN ತಿಂಗಳಿಗೆ ₹10,000 ಅಥವಾ ಹೆಚ್ಚಿನ ಪನ್ಷನ್ ಪಡೆಯುವ ಕೆಲವು ನಿವೃತ್ತ ಪನ್ಷನರನ್ನು ಹೊರಗಿಡುತ್ತದೆ, ಅನ್ವಯಿಕ ವಿನಾಯಿತಿಗೆ ಒಳಪಟ್ಟು.'
        : 'PM-KISAN excludes certain retired pensioners receiving ₹10,000 or more per month, subject to the applicable exception.';
    case 'govtEmployeeCategory':
      return language === 'kn'
        ? 'ಕೇಂದ್ರ/ರಾಜ್ಯ ಸರ್ಕಾರ, ಪಿಎಸ್ಯೂ, ಸ್ವಾಯತ್ತ ಸಂಸ್ಥೆಗಳು ಮತ್ತು ಸ್ಥಳೀಯ ಸಂಸ್ಥೆಗಳ ಸೇವೆಯಲ್ಲಿರುವ ಅಥವಾ ನಿವೃತ್ತ ಅಧಿಕಾರಿಗಳು ಮತ್ತು ಉದ್ಯೋಗಿಗಳನ್ನು ಇದು ಸೂಚಿಸುತ್ತದೆ.'
        : 'This refers to serving or retired officers and employees of Central/State Government, PSEs, Autonomous bodies, and Local Bodies.';
    case 'applicantCategory':
      return language === 'kn'
        ? 'ಇದು ಸಂಸ್ಥಾತ್ಮಕ ಭೂಮಿದಾರರ ಹೊರಗಿಡುವಿಕೆಯನ್ನು ನಿರ್ಧರಿಸಲು ಸಹಾಯ ಮಾಡುತ್ತದೆ.'
        : 'This helps us determine whether the institutional-landholder exclusion applies.';
    default:
      return null;
  }
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

    if (control.kind === 'select') {
      // Select controls always have a valid value from the options list.
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
 *
 * Conditional fields that are not visible are excluded from the payload.
 * This is correct: the server treats a missing field as UNKNOWN, which is
 * the appropriate response when the user hasn't answered a question that
 * wasn't shown.
 */
export function buildApplicantPayload(
  controls: readonly FieldControl[],
  values: RawFormValues
): SchemeApplicant {
  const payload: Record<string, string | number | boolean> = {};

  for (const control of controls) {
    if (!getSchemeFieldDefinition(control.field)) continue;

    // Skip conditional fields that are not currently visible.
    if (control.visibleWhen) {
      const dependencyValue = values[control.visibleWhen.field];
      if (dependencyValue !== control.visibleWhen.value) continue;
    }

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
