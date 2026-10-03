import { ExistingLoanErrorCode } from './schema';

/**
 * Bilingual copy for "Check Existing Loan".
 *
 * Feature-local, matching `features/loan/presentation/dictionary.ts` and
 * `features/admin/feedback/presentation/copy.ts`. Every user-facing string for
 * this mode lives here in BOTH languages — there is no English fallback, and a
 * missing Kannada key would fail `tsc` rather than silently render English.
 *
 * ── The honesty rule ────────────────────────────────────────────────────────
 * This tool explains an arithmetic estimate. It must never imply it knows the
 * borrower's lender balance. So:
 *   * every money figure is called an ESTIMATE ("Estimated balance"), never a
 *     balance or an outstanding amount presented as fact;
 *   * the disclaimer lists the real reasons a lender's figure can differ;
 *   * nothing says or implies GramFinance can reach a bank or NBFC account, and
 *     nothing recommends what the borrower should do next — no "you should
 *     prepay", no "this is a good deal". It calculates and stops.
 */

export type ExistingLoanLanguage = 'en' | 'kn';

export interface ExistingLoanCopy {
  // ── Mode tabs ──
  modeCalculate: string;
  modeExisting: string;
  modeExistingHint: string;

  // ── Intro ──
  introTitle: string;
  introLead: string;
  /** Scope limit: this mode handles one loan shape only. */
  scopeNote: string;

  // ── Form ──
  formTitle: string;
  formLead: string;
  principalLabel: string;
  principalHelper: string;
  rateLabel: string;
  rateHelper: string;
  tenureLabel: string;
  tenureHelper: string;
  startDateLabel: string;
  startDateHelper: string;
  /** Explains why no payment date is derived. */
  startDateNote: string;
  emisPaidLabel: string;
  emisPaidHelper: string;

  emiModeLabel: string;
  emiModeProvided: string;
  emiModeProvidedHelper: string;
  emiModeDerived: string;
  emiModeDerivedHelper: string;
  emiLabel: string;
  emiHelper: string;

  calcButton: string;
  resetButton: string;

  // ── Results ──
  statusTitle: string;
  statusEyebrow: string;

  progressTitle: string;
  progressOf: string;

  outstandingLabel: string;
  outstandingCaption: string;

  emiCurrentLabel: string;
  rateCurrentLabel: string;
  emisRemainingLabel: string;

  breakdownTitle: string;
  breakdownPrincipal: string;
  breakdownInterest: string;
  breakdownTotal: string;

  // ── EMI consistency ──
  emiDerivedNote: string;
  emiMatchesNote: string;
  emiDiffersTitle: string;
  emiDiffersBody: string;

  // ── Completed state ──
  completedTitle: string;
  completedBody: string;

  // ── Schedule ──
  scheduleToggleOpen: string;
  scheduleToggleClose: string;
  scheduleTitle: string;
  scheduleNote: string;
  scheduleEmi: string;
  schedulePrincipal: string;
  scheduleInterest: string;
  scheduleBalance: string;
  scheduleRemainingOf: string;

  // ── Unsupported / disclaimer ──
  unsupportedTitle: string;
  unsupportedPrepayment: string;
  unsupportedFlatRate: string;

  disclaimerTitle: string;
  disclaimerBody: string;
  privacyNote: string;

  invalidTitle: string;
  invalidBody: string;
}

const EN: ExistingLoanCopy = {
  modeCalculate: 'Calculate a Loan',
  modeExisting: 'Check Existing Loan',
  modeExistingHint: 'See where a loan you already have stands today.',

  introTitle: 'Check an existing loan',
  introLead:
    "Already have a loan? Enter your loan details to understand how much you've paid, what's left, and how your remaining payments are distributed.",
  scopeNote:
    'This covers a fixed-rate loan that reduces its balance every month, with the same EMI each month.',

  formTitle: 'Your loan details',
  formLead: 'Everything stays on this device. Nothing is sent or stored.',
  principalLabel: 'Original loan amount',
  principalHelper: 'The amount you originally borrowed, in rupees.',
  rateLabel: 'Annual interest rate',
  rateHelper: 'The fixed yearly rate in percent. Enter 0 for an interest-free loan.',
  tenureLabel: 'Original loan tenure',
  tenureHelper: 'Total number of months in the loan.',
  startDateLabel: 'Loan start date',
  startDateHelper: 'When the first EMI was due.',
  startDateNote:
    'GramFinance does not show a next payment date. Your due date is set by the lender, and guessing one could be wrong by weeks.',
  emisPaidLabel: 'EMIs already paid',
  emisPaidHelper: 'How many monthly payments you have made so far.',

  emiModeLabel: 'Monthly EMI',
  emiModeProvided: 'I know my EMI amount',
  emiModeProvidedHelper: 'Enter the amount you pay each month.',
  emiModeDerived: 'Calculate it for me',
  emiModeDerivedHelper: 'Work it out from the amount, rate and tenure above.',
  emiLabel: 'EMI amount',
  emiHelper: 'The monthly payment you pay, in rupees.',

  calcButton: 'Check my loan',
  resetButton: 'Clear',

  statusTitle: 'Your loan right now',
  statusEyebrow: 'Estimated',

  progressTitle: 'Loan progress',
  progressOf: '{paid} of {total} EMIs paid',

  outstandingLabel: 'Estimated outstanding principal',
  outstandingCaption: 'What is estimated to be left to repay.',

  emiCurrentLabel: 'Current EMI',
  rateCurrentLabel: 'Interest rate',
  emisRemainingLabel: 'EMIs remaining',

  breakdownTitle: 'Remaining payment breakdown',
  breakdownPrincipal: 'Remaining principal',
  breakdownInterest: 'Remaining interest',
  breakdownTotal: 'Total remaining payments',

  emiDerivedNote:
    'Your EMI is calculated from the amount, rate and tenure you entered.',
  emiMatchesNote: 'The EMI you entered matches this loan.',
  emiDiffersTitle: 'Your EMI does not match these loan details',
  emiDiffersBody:
    'For this amount, rate and tenure the standard EMI is different from the one you entered. The estimate below uses the standard EMI, because a loan with a smaller EMI would not finish inside the stated tenure. Please check the amount, rate and tenure.',

  completedTitle: 'Loan completed',
  completedBody:
    'Based on the information provided, all scheduled EMIs have been accounted for.',

  scheduleToggleOpen: 'View payment schedule',
  scheduleToggleClose: 'Hide payment schedule',
  scheduleTitle: 'Remaining payment schedule',
  scheduleNote: 'Each row is one EMI you still have to pay.',
  scheduleEmi: 'EMI',
  schedulePrincipal: 'Principal',
  scheduleInterest: 'Interest',
  scheduleBalance: 'Balance left',
  scheduleRemainingOf: 'Remaining EMI {n} of {total}',

  unsupportedTitle: 'Not covered in this version',
  unsupportedPrepayment:
    'Prepayments are not included. If you have already made extra principal payments, your lender’s real balance will be lower than this estimate.',
  unsupportedFlatRate:
    'Only fixed-rate loans that reduce the balance each month are supported here. A flat-rate loan charges interest on the original amount throughout, so its remaining balance cannot be worked out this way.',

  disclaimerTitle: 'Estimated balance',
  disclaimerBody:
    "Your lender's actual outstanding amount may differ because of prepayments, missed payments, late fees, changes in interest rate, payment timing, or lender-specific calculations.",
  privacyNote:
    'Nothing you type here is sent anywhere. GramFinance cannot see your loan and does not connect to your bank.',

  invalidTitle: 'Check these details',
  invalidBody: 'Some details are missing or not possible. Correct them to see the estimate.',
};

const KN: ExistingLoanCopy = {
  modeCalculate: 'ಸಾಲ ಲೆಕ್ಕು',
  modeExisting: 'ಇರುವ ಸಾಲ ಪರಿಶೀಲಿಸಿ',

  modeExistingHint: 'ನಿಮ್ಮಲ್ಲಿರುವ ಸಾಲ ಈಗ ಎಲ್ಲಿದೆ ಎಂದು ನೋಡಿ.',

  introTitle: 'ಇರುವ ಸಾಲವನ್ನು ಪರಿಶೀಲಿಸಿ',
  introLead:
    'ಈಗಾಗಲೇ ಸಾಲ ಇದೆಯೇ? ನಿಮ್ಮ ಸಾಲದ ವಿವರ ನಮೂದಿಸಿ — ಎಷ್ಟು ಪಾವತಿಸಿದಿರು, ಎಷ್ಟು ಉಳಿದಿದೆ ಮತ್ತು ಉಳಿದ ಪಾವತಿಗಳು ಹೇಗೆ ಹಂಚಿಕೆಯಾಗಿವೆ ಎಂದು ತಿಳಿಯಿರಿ.',
  scopeNote:
    'ಇದು ಪ್ರತಿ ತಿಂಗಳು ಬಾಕಿದ ಮೊತ್ತ ಕಡಿಮೆಯಾಗುವ, ಸ್ಥಿರ ದರದ ಸಾಲಕ್ಕೆ ಮಾತ್ರ ಅನ್ವಯಿಕ.',

  formTitle: 'ನಿಮ್ಮ ಸಾಲದ ವಿವರ',
  formLead: 'ಎಲ್ಲವೂ ಈ ಸಾಧನದಲ್ಲೇಯೇ ಉಳಿಯುತ್ತದೆ. ಎಲ್ಲಿಗೂ ಕಳುಹಿಸಲಾಗುವುದಿಲ್ಲ ಅಥವಾ ಸಂಗ್ರಹಿಸಲಾಗುವುದಿಲ್ಲ.',
  principalLabel: 'ಮೊದಲ ಸಾಲದ ಮೊತ್ತ',
  principalHelper: 'ನೀವು ಮೊದಲು ಪಡೆದ ಮೊತ್ತ, ರೂಪಾಯಿಗಳಲ್ಲಿ.',
  rateLabel: 'ವಾರ್ಷಿಕ ಬಡ್ಡಿ ದರ',
  rateHelper: 'ಸ್ಥಿರ ವಾರ್ಷಿಕ ದರ, ಶೇಕಡಾಕಾರದಲ್ಲಿ. ಬಡ್ಡಿಯಿಲ್ಲದ ಸಾಲಕ್ಕೆ 0 ನಮೂದಿಸಿ.',
  tenureLabel: 'ಮೊದಲ ಸಾಲದ ಅವಧಿ',
  tenureHelper: 'ಸಾಲದ ಒಟ್ಟು ತಿಂಗಳ ಸಂಖ್ಯೆ.',
  startDateLabel: 'ಸಾಲ ಪ್ರಾರಂಭಿಸಿದ ದಿನಾಂಕ',
  startDateHelper: 'ಮೊದಲ EMI ಬಾಧ್ಯ ಬಂದ ದಿನ.',
  startDateNote:
    'ಮುಂದಿನ ಪಾವತಿ ದಿನಾಂಕವನ್ನು GramFinance ತೋರಿಸುವುದಿಲ್ಲ. ನಿಮ್ಮ ಪಾವತಿ ದಿನಾಂಕವನ್ನು ಸಾಲದಾರ ನಿರ್ಧರಿಸುತ್ತಾರೆ; ಅದನ್ನು ಊಹಿಸಿದರೆ ವಾರಗಳ ತಫಾಕ ತಪ್ಪಾಗಬಹುದು.',
  emisPaidLabel: 'ಪಾವತಿಸಿದ EMI ಸಂಖ್ಯೆ',
  emisPaidHelper: 'ಇದುವರೆಗೆ ನೀವು ಮಾಸಿಕ ಪಾವತಿ ಎಷ್ಟು ಮಾಡಿದ್ದೀರಿ.',

  emiModeLabel: 'ಮಾಸಿಕ EMI',
  emiModeProvided: 'EMI ಮೊತ್ತ ನನಗೆ ಗೊತ್ತಿದೆ',
  emiModeProvidedHelper: 'ನೀವು ಪ್ರತಿ ತಿಂಗಳು ಪಾವತಿಸುವ ಮೊತ್ತ ನಮೂದಿಸಿ.',
  emiModeDerived: 'ನನಗೇ ಲೆಕ್ಕಿಸಿ',
  emiModeDerivedHelper: 'ಮೇಲಿನ ಮೊತ್ತ, ದರ ಮತ್ತು ಅವಧಿಯಿಂದ ಲೆಕ್ಕಿಸಿಕೊಡೆ.',
  emiLabel: 'EMI ಮೊತ್ತ',
  emiHelper: 'ನೀವು ಪ್ರತಿ ತಿಂಗಳು ಪಾವತಿಸುವ ಮೊತ್ತ, ರೂಪಾಯಿಗಳಲ್ಲಿ.',

  calcButton: 'ನನ್ನ ಸಾಲ ಪರಿಶೀಲಿಸಿ',
  resetButton: 'ಅಳಿಸಿ',

  statusTitle: 'ನಿಮ್ಮ ಸಾಲ ಈಗ',
  statusEyebrow: 'ಅಂದಾಜು',

  progressTitle: 'ಸಾಲದ ಪ್ರಗತಿ',
  progressOf: '{total} EMI ಯಲ್ಲಿ {paid} ಪಾವತಿಸಲಾಗಿದೆ',

  outstandingLabel: 'ಅಂದಾಜು ಉಳಿದ ಅಸಲು',
  outstandingCaption: 'ಮರುಪಾವತಿಸಬೇಕಾದ ಅಂದಾಜು ಮೊತ್ತ.',

  emiCurrentLabel: 'ಪ್ರಸ್ತುತ EMI',
  rateCurrentLabel: 'ಬಡ್ಡಿ ದರ',
  emisRemainingLabel: 'ಉಳಿದ EMI ಸಂಖ್ಯೆ',

  breakdownTitle: 'ಉಳಿದ ಪಾವತಿಗಳ ವಿವರ',
  breakdownPrincipal: 'ಉಳಿದ ಅಸಲು',
  breakdownInterest: 'ಉಳಿದ ಬಡ್ಡಿ',
  breakdownTotal: 'ಒಟ್ಟು ಉಳಿದ ಪಾವತಿ',

  emiDerivedNote:
    'ನಿಮ್ಮ EMI ಅನ್ನು ನೀವು ನಮೂದಿಸಿದ ಮೊತ್ತ, ದರ ಮತ್ತು ಅವಧಿಯಿಂದ ಲೆಕ್ಕಿಸಲಾಗಿದೆ.',
  emiMatchesNote: 'ನೀವು ನಮೂದಿಸಿದ EMI ಈ ಸಾಲಕ್ಕೆ ಸರಿಹೊಂದುತ್ತದೆ.',
  emiDiffersTitle: 'ನಿಮ್ಮ EMI ಈ ಸಾಲದ ವಿವರಕ್ಕೆ ಸರಿಹೊಂದುತ್ತಿಲ್ಲ',
  emiDiffersBody:
    'ಈ ಮೊತ್ತ, ದರ ಮತ್ತು ಅವಧಿಗೆ ಶಿಷ್ಟ EMI ನೀವು ನಮೂದಿಸಿದದಕ್ಕಿಂತ ಬೇರೆಯಾಗುತ್ತದೆ. ಕಡಿಮೆ EMI ಇರುವ ಸಾಲ ಹೇಳಿದ ಅವಧಿಯಲ್ಲೇ ಮುಕ್ತಾಯಗೊಳಿಯುವುದಿಲ್ಲ; ಹಾಗಾಗಿ ಕೆಳಗಿನ ಅಂದಾಜಿನಲ್ಲಿ ಶಿಷ್ಟ EMI ಬಳಸಲಾಗಿದೆ. ದಯವಿಟ್ಟು ಮೊತ್ತ, ದರ ಮತ್ತು ಅವಧಿ ಪರಿಶೀಲಿಸಿ.',

  completedTitle: 'ಸಾಲ ಮುಗಿದಿದೆ',
  completedBody:
    'ನೀವು ನಮೂದಿಸಿದ ಮಾಹಿತಿಯ ಪ್ರಕಾರ, ಎಲ್ಲಾ ನಿಗದಿತ EMI ಗಳನ್ನು ಪರಿಗಣಿಸಲಾಗಿದೆ.',

  scheduleToggleOpen: 'ಪಾವತಿ ವೇಳಾಪಟ್ಟಿ ನೋಡಿ',
  scheduleToggleClose: 'ಪಾವತಿ ವೇಳಾಪಟ್ಟಿ ಮರೆಮಾಡಿ',
  scheduleTitle: 'ಉಳಿದ ಪಾವತಿ ವೇಳಾಪಟ್ಟಿ',
  scheduleNote: 'ಪ್ರತಿ ಸಾಲು ಅನ್ನು ನೀವು ಇನ್ನೂ ಪಾವತಿಸಬೇಕಾದ EMI ಆಗಿದೆ.',
  scheduleEmi: 'EMI',
  schedulePrincipal: 'ಅಸಲು',
  scheduleInterest: 'ಬಡ್ಡಿ',
  scheduleBalance: 'ಉಳಿದ ಬಾಕಿ',
  scheduleRemainingOf: 'ಉಳಿದ EMI {n} / {total}',

  unsupportedTitle: 'ಈ ಆವೃತ್ತಿಯಲ್ಲಿ ಸೇರಿಲ್ಲ',
  unsupportedPrepayment:
    'ಮುಂಗಡ ಪಾವತಿಗಳನ್ನು ಇಲ್ಲಿ ಸೇರಿಲ್ಲ. ನೀವು ಈಗಾಗಲೇ ಹೆಚ್ಚು ಅಸಲು ಪಾವತಿಸಿದಿದ್ದರೆ, ನಿಮ್ಮ ಸಾಲದಾರದ ನಿಜವಾದ ಬಾಕಿ ಈ ಅಂದಾಜಿಗಿಂತ ಕಡಿಮೆಯಿರುತ್ತದೆ.',
  unsupportedFlatRate:
    'ಪ್ರತಿ ತಿಂಗಳು ಬಾಕಿದ ಮೊತ್ತ ಕಡಿಮೆಯಾಗುವ ಸ್ಥಿರ ದರದ ಸಾಲಗಳಿಗೆ ಮಾತ್ರ ಇಲ್ಲಿ ಬೆಂಬಲ ಇದೆ. ಸ್ಥಿರ ದರದ ಸಾಲವು ಸಂಪೂರ್ಣ ಅವಧಿ ಮೂಲ ಅಸಲಿನ ಮೇಲೆ ಬಡ್ಡಿ ಹಾಕುವುದರಿಂದ, ಅದರ ಉಳಿದ ಬಾಕಿ ಈ ರೀತಿಯಲ್ಲಿ ಕಂಡುಹಿಡಿಯುವುದಿಲ್ಲ.',

  disclaimerTitle: 'ಅಂದಾಜು ಬಾಕಿ',
  disclaimerBody:
    'ಮುಂಗಡ ಪಾವತಿ, ಪಾವತಿ ಬಿಟ್ಟಿದ್ದು, ವಿಳಂಬ ಶುಲ್ಕ, ಬಡ್ಡಿ ದರದ ಬದಲಾವಣೆ, ಪಾವತಿಯ ಸಮಯ ಬದಲಾದರು ಅಥವಾ ಸಾಲದಾರದ ವಿಶೇಷ ಲೆಕ್ಕಾಚಾರಗಳ ಕಾರಣದಿಂದ ನಿಮ್ಮ ಸಾಲದಾರದ ನಿಜವಾದ ಬಾಕಿ ಬೇರೆಯಾಗಬಹುದು.',
  privacyNote:
    'ನೀವು ಇಲ್ಲಿ ನಮೂದಿಸಿದ್ದನ್ನು ಎಲ್ಲಿಗೂ ಕಳುಹಿಸಲಾಗುವುದಿಲ್ಲ. GramFinance ನಿಮ್ಮ ಸಾಲ ನೋಡಲಾಗುವುದಿಲ್ಲ ಮತ್ತು ನಿಮ್ಮ ಬ್ಯಾಂಕ್‌ಗೆ ಸಂಪರ್ಕಗೊಳ್ಳುವುದಿಲ್ಲ.',

  invalidTitle: 'ಈ ವಿವರಗಳನ್ನು ಪರಿಶೀಲಿಸಿ',
  invalidBody: 'ಕೆಲವು ವಿವರಗಳು ಇಲ್ಲ ಅಥವಾ ಸಾಧ್ಯವಿಲ್ಲ. ಅಂದಾಜನ್ನು ನೋಡಲು ಅವುಗಳನ್ನು ಸರಿಪಡಿಸಿ.',
};

export const existingLoanCopy: Record<ExistingLoanLanguage, ExistingLoanCopy> = { en: EN, kn: KN };

/**
 * Validation messages, keyed by the codes `validateExistingLoan` returns.
 *
 * Held next to the rest of the copy so a new error code cannot be added without
 * its two translations: `Record<ExistingLoanErrorCode, ...>` makes a missing key
 * a compile error rather than an English string leaking into the Kannada form.
 */
export const existingLoanErrorCopy: Record<
  ExistingLoanLanguage,
  Record<ExistingLoanErrorCode, string>
> = {
  en: {
    PRINCIPAL_REQUIRED: 'Enter the original loan amount.',
    PRINCIPAL_NOT_POSITIVE: 'The loan amount must be greater than zero.',
    PRINCIPAL_TOO_LARGE: 'The loan amount cannot exceed ₹1,00,00,000.',
    RATE_REQUIRED: 'Enter the annual interest rate.',
    RATE_NEGATIVE: 'The interest rate cannot be negative.',
    RATE_TOO_HIGH: 'The interest rate cannot exceed 100%.',
    TENURE_REQUIRED: 'Enter the loan tenure in months.',
    TENURE_NOT_WHOLE: 'The tenure must be a whole number of months.',
    TENURE_OUT_OF_RANGE: 'The tenure must be between 1 and 360 months.',
    EMI_REQUIRED: 'Enter your EMI amount, or choose "Calculate it for me".',
    EMI_NOT_POSITIVE: 'The EMI must be greater than zero.',
    EMI_TOO_LARGE: 'That EMI amount is too large to be a monthly payment on this loan.',
    PAID_REQUIRED: 'Enter how many EMIs you have paid.',
    PAID_NOT_WHOLE: 'The number of EMIs paid must be a whole number.',
    PAID_NEGATIVE: 'The number of EMIs paid cannot be negative.',
    PAID_EXCEEDS_TENURE: 'You cannot have paid more EMIs than the total tenure.',
    DATE_REQUIRED: 'Enter the loan start date.',
    DATE_INVALID: 'Enter a valid date in YYYY-MM-DD format.',
    DATE_FUTURE: 'The loan start date cannot be in the future.',
  },
  kn: {
    PRINCIPAL_REQUIRED: 'ಮೊದಲ ಸಾಲದ ಮೊತ್ತ ನಮೂದಿಸಿ.',
    PRINCIPAL_NOT_POSITIVE: 'ಸಾಲದ ಮೊತ್ತ ಸೊನೆಯಿಗಿಂತ ಹೆಚ್ಚಿರಿಬೇಕು.',
    PRINCIPAL_TOO_LARGE: 'ಸಾಲದ ಮೊತ್ತ ₹1,00,00,000 ಅನ್ನು ಮೀರಿಯಲು ಸಾಧ್ಯವಿಲ್ಲ.',
    RATE_REQUIRED: 'ವಾರ್ಷಿಕ ಬಡ್ಡಿ ದರ ನಮೂದಿಸಿ.',
    RATE_NEGATIVE: 'ಬಡ್ಡಿ ದರ ಋಣಾತ್ಮಕವಾಗಬಹುದಿಲ್ಲ.',
    RATE_TOO_HIGH: 'ಬಡ್ಡಿ ದರ 100% ಅನ್ನು ಮೀರಿಯಲು ಸಾಧ್ಯವಿಲ್ಲ.',
    TENURE_REQUIRED: 'ಸಾಲದ ಅವಧಿಯನ್ನು ತಿಂಗಳಗಳಲ್ಲಿ ನಮೂದಿಸಿ.',
    TENURE_NOT_WHOLE: 'ಅವಧಿ ಪೂರ್ಣ ಸಂಖ್ಯೆಯ ತಿಂಗಳು ಆಗಿರಬೇಕು.',
    TENURE_OUT_OF_RANGE: 'ಅವಧಿ 1 ರಿಂದ 360 ತಿಂಗಳ ನಡುವೆ ಇರಬೇಕು.',
    EMI_REQUIRED: 'EMI ಮೊತ್ತ ನಮೂದಿಸಿ ಅಥವಾ "ನನಗೇ ಲೆಕ್ಕಿಸಿ" ಆಯ್ಕೆಮಾಡಿ.',
    EMI_NOT_POSITIVE: 'EMI ಸೊನೆಯಿಗಿಂತ ಹೆಚ್ಚಿರಿಬೇಕು.',
    EMI_TOO_LARGE: 'ಈ EMI ಮೊತ್ತ ಈ ಸಾಲದ ಮಾಸಿಕ ಪಾವತಿಗೆ ಬಹಳ ದೊಡ್ಡದ್ದೆ.',
    PAID_REQUIRED: 'ಎಷ್ಟು EMI ಪಾವತಿಸಿದ್ದೀರಿ ಎಂದು ನಮೂದಿಸಿ.',
    PAID_NOT_WHOLE: 'ಪಾವತಿಸಿದ EMI ಸಂಖ್ಯೆ ಪೂರ್ಣ ಸಂಖ್ಯೆಯಾಗಿರಬೇಕು.',
    PAID_NEGATIVE: 'ಪಾವತಿಸಿದ EMI ಸಂಖ್ಯೆ ಋಣಾತ್ಮಕವಾಗಬಹುದಿಲ್ಲ.',
    PAID_EXCEEDS_TENURE: 'ಒಟ್ಟು ಅವಧಿಗಿಂತ ಹೆಚ್ಚು EMI ಪಾವತಿಸಿರಲು ಸಾಧ್ಯವಿಲ್ಲ.',
    DATE_REQUIRED: 'ಸಾಲ ಪ್ರಾರಂಭಿಸಿದ ದಿನಾಂಕ ನಮೂದಿಸಿ.',
    DATE_INVALID: 'YYYY-MM-DD ಸ್ವರೂಪದಲ್ಲಿ ಸರಿಯಾದ ದಿನಾಂಕ ನಮೂದಿಸಿ.',
    DATE_FUTURE: 'ಸಾಲ ಪ್ರಾರಂಭಿಸಿದ ದಿನಾಂಕ ಭವಿಷ್ಯದಲ್ಲಿ ಇರಬಹುದಿಲ್ಲ.',
  },
};