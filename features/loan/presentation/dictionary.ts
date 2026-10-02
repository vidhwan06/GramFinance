import { InterestMethod } from '../engine/types';

export const presentationDictionary = {
  en: {
    estimateDisclaimer: 'Note: These figures are estimates based on the entered assumptions. Exact bank terms may vary.',
    reducingMethod: 'Interest is calculated only on the remaining loan balance each month as you repay.',
    flatMethod: 'Interest is calculated on the original base loan amount throughout the full tenure.',
    monthlyText: (emi: string, months: number) => `You would pay approximately ${emi} every month for ${months} months.`,
    interestText: (interest: string, months: number) => `Over the full loan period of ${months} months, you would pay approximately ${interest} in interest.`,
    totalText: (total: string) => `The total cash amount you pay (including principal, interest, and upfront fees) will be ${total}.`,
    disbursementText: (disbursed: string) => `The net amount you will receive in your bank account is ${disbursed}.`,
    reduceEmiSummary: (newEmi: string, oldEmi: string) => `Prepayment lowers your monthly bill from ${oldEmi} to ${newEmi}, keeping the original tenure unchanged.`,
    reduceTenureSummary: (monthsSaved: number, newTenure: number) => `Prepayment shortens your loan by ${monthsSaved} months, finishing in ${newTenure} months while keeping monthly payment constant.`,
    reducingMethodTitle: 'Reducing Balance',
    flatMethodTitle: 'Flat Rate',
    /** Neutral context. Deliberately does NOT rank or recommend a method. */
    reducingMethodContext: 'Common for bank loans',
    flatMethodContext: 'Common for MFI / SHG loans',
    upfrontFeesLabel: 'Upfront fees',
    principalRepaidLabel: 'Principal repaid',
  },
  kn: {
    reducingMethod: 'ಪ್ರತಿ ತಿಂಗಳು ನೀವು ಅಸಲು ಮರುಪಾವತಿಸಿದಂತೆ ಬಾಕಿ ಇರುವ ಮೊತ್ತದ ಮೇಲಷ್ಟೇ ಬಡ್ಡಿ ಲೆಕ್ಕಹಾಕಲಾಗುತ್ತದೆ.',
    flatMethod: 'ಸಂಪೂರ್ಣ ಸಾಲದ ಅವಧಿಯಲ್ಲಿ ಆರಂಭಿಕ ಅಸಲು ಮೊತ್ತದ ಮೇಲೆಯೇ ಬಡ್ಡಿಯನ್ನು ಲೆಕ್ಕಹಾಕಲಾಗುತ್ತದೆ.',
    monthlyText: (emi: string, months: number) => `ನೀವು ಪ್ರತಿಯೊಂದು ತಿಂಗಳಿಗೆ ಸುಮಾರು ${emi} ರೂಪಾಯಿಗಳನ್ನು ${months} ತಿಂಗಳ ಕಾಲ ಪಾವತಿಸಬೇಕಾಗುತ್ತದೆ.`,
    interestText: (interest: string, months: number) => `ಸಂಪೂರ್ಣ ಸಾಲದ ಅವಧಿಯಲ್ಲಿ (${months} ತಿಂಗಳು), ನೀವು ಅಂದಾಜು ${interest} ರೂಪಾಯಿಗಳನ್ನು ಬಡ್ಡಿಯಾಗಿ ಪಾವತಿಸುತ್ತೀರಿ.`,
    totalText: (total: string) => `ಅಸಲು, ಬಡ್ಡಿ ಮತ್ತು ಶುಲ್ಕ ಸೇರಿದಂತೆ ಒಟ್ಟು ಪಾವತಿಸಬೇಕಾದ ನೈಜ ಮೊತ್ತ ${total}.`,
    disbursementText: (disbursed: string) => `ನಿಮ್ಮ ಬ್ಯಾಂಕ್ ಖಾತೆಗೆ ತಲುಪುವ ನೈಜ ಚುಕ್ತಾ ಮೊತ್ತ ${disbursed}.`,
    estimateDisclaimer: 'ಸೂಚನೆ: ಇವು ನೀವು ನಮೂದಿಸಿದ ಅಂಕಿಅಂಶಗಳ ಆಧಾರದ ಮೇಲೆ ಮಾಡಿದ ಅಂದಾಜು ಲೆಕ್ಕಾಚಾರಗಳಾಗಿವೆ. ಬ್ಯಾಂಕ್‌ನ ನಿಯಮಗಳು ಬದಲಾಗಬಹುದು.',
    reduceEmiSummary: (newEmi: string, oldEmi: string) => `ಮುಂಗಡ ಪಾವತಿಯು ನಿಮ್ಮ ತಿಂಗಳ ಕಂತನ್ನು ${oldEmi} ರಿಂದ ${newEmi} ಗೆ ಕಡಿಮೆ ಮಾಡುತ್ತದೆ, ಸಾಲದ ಅವಧಿ ಬದಲಾಗುವುದಿಲ್ಲ.`,
    reduceTenureSummary: (monthsSaved: number, newTenure: number) => `ಮುಂಗಡ ಪಾವತಿಯು ನಿಮ್ಮ ಸಾಲದ ಅವಧಿಯನ್ನು ${monthsSaved} ತಿಂಗಳುಗಳಷ್ಟು ಕಡಿಮೆ ಮಾಡಿ, ${newTenure} ತಿಂಗಳಲ್ಲಿ ಮುಕ್ತಾಯಗೊಳಿಸುತ್ತದೆ.`,
    reducingMethodTitle: 'ಕ್ಷೀಣಿಸುವ ಬ್ಯಾಲೆನ್ಸ್',
    flatMethodTitle: 'ಸ್ಥಿರ ದರ',
    reducingMethodContext: 'ಬ್ಯಾಂಕ್ ಸಾಲಗಳಲ್ಲಿ ಸಾಮಾನ್ಯ',
    flatMethodContext: 'ಎಂಫಾಐ / ಸ್ವ-ಸಹಾಯ ಗುಂಪು ಸಾಲಗಳಲ್ಲಿ ಸಾಮಾನ್ಯ',
    upfrontFeesLabel: 'ಮುಂಗಡ ಶುಲ್ಕ',
    principalRepaidLabel: 'ಮರುಪಾವತಿಸಿದ ಅಸಲು',
  },
};

export type Language = 'en' | 'kn';

/**
 * Copy for the interest-method explainer, derived from the selected method.
 *
 * Previously this component hardcoded "Interest calculation: Reducing balance"
 * and a "Standard Reducing Rate" badge regardless of what the user selected, so
 * a user modelling a flat-rate MFI loan was told the app used reducing balance.
 * For a financial-safety tool that is a trust-breaking correctness bug, so the
 * component now derives everything from the actual `interestMethod`.
 *
 * Kept as a pure function so the mapping is unit-testable without a DOM.
 */
export function getInterestMethodCopy(
  method: InterestMethod,
  lang: Language = 'en'
): { title: string; description: string; context: string; badge: string } {
  const dict = presentationDictionary[lang];
  const isFlat = method === 'flat-rate';

  return {
    title: isFlat ? dict.flatMethodTitle : dict.reducingMethodTitle,
    description: isFlat ? dict.flatMethod : dict.reducingMethod,
    context: isFlat ? dict.flatMethodContext : dict.reducingMethodContext,
    badge: isFlat ? dict.flatMethodTitle : dict.reducingMethodTitle,
  };
}

// ─── Page copy — the Loan & EMI page (Stitch sections) ───────────────────────
//
// Section-by-section bilingual copy for `app/(main)/loan`. It deliberately
// lives in the feature's presentation layer rather than
// `features/language/translations`, which are chrome-only files shared with
// every other page.
//
// `Record<Language, LoanPageCopy>` is the enforcement mechanism: adding a key
// to one language without the other is a type error, so `tsc` keeps en/kn in
// lockstep. Dynamic strings are functions so no component ever builds a
// sentence out of concatenated fragments.

export interface LoanGlossaryTerm {
  id: string;
  termEn: string;
  termKn: string;
  defEn: string;
  defKn: string;
}

export interface LoanPageCopy {
  // 1 · Trust bar
  metaLead: string;
  trustInBrowser: string;
  trustNoLogin: string;
  trustNoCommissions: string;

  // 2 · Breadcrumb
  breadcrumbLoans: string;
  breadcrumbCurrent: string;

  // 3 · Hero
  heroEyebrow: string;
  /** Sentence is split so one phrase can be highlighted: pre + em + post. */
  heroTitlePre: string;
  heroTitleEm: string;
  heroTitlePost: string;
  /** Always rendered in the *other* language, so both appear together. */
  heroSubline: string;
  heroLead: string;
  clientSideTitle: string;
  clientSideNote: string;
  resetBaseline: string;

  // 4 · Parameter workspace
  workspaceSectionTitle: string;
  workspaceEyebrow: string;
  workspaceTitle: string;
  feesEyebrow: string;
  feesTitle: string;
  feesHint: string;
  quickAdd: (amount: string) => string;
  minLabel: (amount: string) => string;
  maxLabel: (amount: string) => string;
  invalidTitle: string;
  invalidBody: string;
  signTitle: string;
  signBody: string;
  signCheck: string;
  viewAmortization: string;

  // 4 · Aubergine result card
  emiEyebrow: string;
  emiPerMonth: string;
  emiDuration: (months: number, years: string) => string;
  legendPrincipal: string;
  legendInterest: string;
  legendCharges: string;
  rowLoanAmount: string;
  rowNetDisbursed: string;
  rowTotalInterest: string;
  rowTotalCharges: string;
  rowTotalOutflow: string;
  ratioTitle: string;
  ratioSentence: (perHundred: string, months: number) => string;
  plainLanguageTitle: string;

  // 5 · Cost insights
  insightsEyebrow: string;
  insightsTitle: string;
  insightsLead: string;
  tenureTrapTitle: string;
  tenureTrapBody: (interest: string, months: number, percent: number, principal: string) => string;
  deductionTitle: string;
  deductionBodyDeducted: (received: string, borrowed: string) => string;
  deductionBodyCharges: (charges: string) => string;
  deductionBodyNoFees: string;
  deductionExampleLabel: string;
  deductionExample: (received: string, borrowed: string) => string;
  frontLoadedTitle: string;
  frontLoadedBody: (early: string, total: string, percent: number, months: number) => string;
  frontLoadedNoInterest: string;
  ruleLabel: string;
  ruleTenure: string;
  checkLabel: string;
  checkDeduction: string;
  defenceLabel: string;
  defenceFrontLoaded: string;

  // 6 · What-if / scenario analysis
  scenEyebrow: string;
  scenTitle: string;
  scenLead: string;
  scenChip: string;
  scenTip: string;

  // 7 · Flat vs reducing decoder
  decoderEyebrow: string;
  decoderTitle: string;
  decoderLead: string;
  pitchBadge: string;
  pitchTitle: string;
  exampleLabel: string;
  pitchBody: string;
  pitchRowRate: string;
  pitchRowYear: string;
  pitchMechanismLabel: string;
  pitchMechanism: string;
  realityBadge: string;
  realityTitle: string;
  realityRowRate: string;
  realityRowMethod: string;
  realityRowInterest: string;
  realityRowTotal: string;
  realityNote: string;
  compareHint: string;

  // 8 · Amortization ledger
  ledgerEyebrow: string;
  ledgerTitle: string;
  ledgerLead: string;
  yearLabel: (year: number) => string;
  monthsRange: (from: number, to: number) => string;
  openingBalance: string;
  principalPaid: string;
  interestPaid: string;
  endingBalance: string;
  localNote: string;

  // 9 · Glossary
  glossaryEyebrow: string;
  glossaryTitle: string;
  glossaryLead: string;
  glossary: LoanGlossaryTerm[];

  // 10 · Mandate strip
  mandateTitle: string;
  mandateBody: string;
  rbiLinkLabel: string;
  printLabel: string;
}

/**
 * Glossary entries carry both languages in one record, so the list itself is
 * shared rather than duplicated per locale.
 */
const loanGlossary: LoanGlossaryTerm[] = [
  {
    id: 'emi',
    termEn: 'Equated Monthly Instalment (EMI)',
    termKn: 'ಸಮಾನ ಮಾಸಿಕ ಕಂತು (EMI)',
    defEn:
      'One fixed payment made every month. Each payment has two parts: the interest for that month, and a slice of the principal.',
    defKn:
      'ಪ್ರತಿ ತಿಂಗಳು ಒಂದೇ ನಿಗದಿತ ಮೊತ್ತದ ಪಾವತಿ. ಪ್ರತಿ ಕಂತಿನಲ್ಲಿ ಆ ತಿಂಗಳಿನ ಬಡ್ಡಿ ಮತ್ತು ಅಸಲಿನ ಒಂದು ಭಾಗ ಇರುತ್ತದೆ.',
  },
  {
    id: 'principal',
    termEn: 'Principal Amount',
    termKn: 'ಅಸಲು ಮೊತ್ತ',
    defEn:
      'The money you actually borrow and have to return, counted without interest, fees or insurance.',
    defKn:
      'ನೀವು ನಿಜವಾಗಿ ಪಡೆಯುವ ಮತ್ತು ಮರುಪಾವತಿಸಬೇಕಾದ ಮೊತ್ತ — ಬಡ್ಡಿ, ಶುಲ್ಕ ಅಥವಾ ವಿಮೆ ಇಲ್ಲದೆ.',
  },
  {
    id: 'reducing',
    termEn: 'Reducing Balance Rate',
    termKn: 'ಇಳಿಕೆಯಾಗುವ ಬಾಕಿ ಬಡ್ಡಿ',
    defEn:
      'Interest is calculated only on the amount still owed after each payment, never on the original full loan.',
    defKn:
      'ಪ್ರತಿ ಪಾವತಿಯ ನಂತರ ಬಾಕಿ ಇರುವ ಮೊತ್ತದ ಮೇಲೆ ಮಾತ್ರ ಬಡ್ಡಿ ಲೆಕ್ಕಹಾಕಲಾಗುತ್ತದೆ; ಮೂಲ ಪೂರ್ಣ ಸಾಲದ ಮೇಲೆ ಅಲ್ಲ.',
  },
  {
    id: 'processing',
    termEn: 'Processing Fee',
    termKn: 'ಸಂಸ್ಕರಣಾ ಶುಲ್ಕ',
    defEn:
      'A one-time charge for handling your loan file. Ask for it in writing before the money is disbursed.',
    defKn:
      'ಸಾಲದ ದಾಖಲೆ ಸಂಸ್ಕರಿಸಲು ಒಂದು ಬಾರಿ ವಸೂಲಾಗುವ ಶುಲ್ಕ. ಹಣ ಬರುವ ಮೊದಲು ಅದನ್ನು ಬರೆದು ಕೇಳಿ.',
  },
  {
    id: 'foreclosure',
    termEn: 'Foreclosure / Pre-closure',
    termKn: 'ಮುಂಗಡ ಮುಕ್ತಾಯ',
    defEn:
      'Paying the whole loan off before the scheduled end date. Ask your lender what penalty, if any, this carries.',
    defKn:
      'ನಿಗದಿತ ಅವಧಿ ಮುಗಿಯುವ ಮೊದಲೇ ಸಾಲವನ್ನು ಸಂಪೂರ್ಣ ಮರುಪಾವತಿಸುವುದು. ಇದಕ್ಕೆ ದಂಡ ಇದೆಯೇ ಎಂದು ಸಾಲ ನೀಡುವವರನ್ನು ಕೇಳಿ.',
  },
  {
    id: 'apr',
    termEn: 'Annual Percentage Rate (APR)',
    termKn: 'ವಾರ್ಷಿಕ ನೈಜ ದರ (APR)',
    defEn:
      'The yearly cost of the loan including interest and every charge, shown as one percentage. Ask for it in the Key Fact Statement.',
    defKn:
      'ಬಡ್ಡಿ ಮತ್ತು ಎಲ್ಲಾ ಶುಲ್ಕ ಸೇರಿದ ವಾರ್ಷಿಕ ವೆಚ್ಚ ಒಂದೇ ಶೇಕಡಾದಲ್ಲಿ ತೋರಿಸಲಾಗುತ್ತದೆ. ಕೀ ಫ್ಯಾಕ್ಟ್ ಸ್ಟೇಟ್‌ಮೆಂಟ್‌ನಲ್ಲಿ ಇದನ್ನು ಕೇಳಿ.',
  },
];

const pageCopyEn: LoanPageCopy = {
  metaLead: 'Public-interest financial utility',
  trustInBrowser: '100% in-browser calculation',
  trustNoLogin: 'No login or phone number',
  trustNoCommissions: 'No commissions, no lead sales',

  breadcrumbLoans: 'Loans',
  breadcrumbCurrent: 'Borrowing Cost Revealer & EMI Explorer',

  heroEyebrow: 'Civic Credit Transparency Engine',
  heroTitlePre: 'Understand what your loan will',
  heroTitleEm: 'really cost',
  heroTitlePost: '',
  heroSubline: 'ಸಾಲದ ನೈಜ ವೆಚ್ಚವನ್ನು ಮುಕ್ತವಾಗಿ ಅರ್ಥಮಾಡಿಕೊಳ್ಳಿ.',
  heroLead:
    'A loan is far more than the instalment shown to you. Change the amount, the interest rate and the tenure to see the total interest you will actually pay and any charge taken upfront. Every figure is calculated here, in your browser.',
  clientSideTitle: 'Client-Side Engine',
  clientSideNote: 'No phone number or login needed',
  resetBaseline: 'Reset Baseline',

  workspaceSectionTitle: 'Loan parameters and result',
  workspaceEyebrow: 'Step 01 · Calibration',
  workspaceTitle: 'Your Loan Parameters',
  feesEyebrow: 'Step 02 · Charges',
  feesTitle: 'Upfront Deductions & Processing Fees',
  feesHint:
    'Origination, stamp duty, insurance or file registration — add only the charges your lender actually asks for.',
  quickAdd: (amount) => `+ ${amount}`,
  minLabel: (amount) => `Min: ${amount}`,
  maxLabel: (amount) => `Max: ${amount}`,
  invalidTitle: 'Please check the values you entered',
  invalidBody:
    'Enter a valid amount, rate and tenure above to see the EMI, total interest and full repayment plan.',
  signTitle: 'Before you sign the note',
  signBody:
    'If an agent says “the processing fee comes out of the loan, so you pay nothing now” — remember: you still pay interest on the full amount while less cash actually reaches your hand.',
  signCheck: 'Ask for a written, itemised list of every charge before the money is disbursed.',
  viewAmortization: 'View amortization ↓',

  emiEyebrow: 'Monthly instalment (EMI)',
  emiPerMonth: 'month',
  emiDuration: (months, years) =>
    `Payable monthly for ${months} months (${years} ${years === '1' ? 'year' : 'years'})`,
  legendPrincipal: 'Principal repaid',
  legendInterest: 'Interest paid',
  legendCharges: 'Charges paid',
  rowLoanAmount: 'Loan amount',
  rowNetDisbursed: 'Credited to your account',
  rowTotalInterest: 'Total interest',
  rowTotalCharges: 'Total charges',
  rowTotalOutflow: 'Total out-of-pocket',
  ratioTitle: 'True cost ratio',
  ratioSentence: (perHundred, months) =>
    `For every ₹100 you borrow, you hand back ${perHundred} over ${months} months.`,
  plainLanguageTitle: 'Plain-language explanation',

  insightsEyebrow: 'Civic insight · Chapter 01',
  insightsTitle: 'Here is what a low EMI quietly hides from you',
  insightsLead:
    'Lending agents often sell a small monthly figure. A cheaper instalment bought with a longer tenure, or money deducted before it reaches you, can quietly cost much more in total.',
  tenureTrapTitle: 'The Tenure Trap',
  tenureTrapBody: (interest, months, percent, principal) =>
    `On your numbers you pay ${interest} of interest over ${months} months — about ${percent}% of the ${principal} you borrowed. You are buying a smaller bill with more months of interest.`,
  deductionTitle: 'Upfront Deductions',
  deductionBodyDeducted: (received, borrowed) =>
    `Your lender keeps part of the loan before it reaches you: you receive ${received} but still pay interest on ${borrowed}.`,
  deductionBodyCharges: (charges) =>
    `Your loan carries ${charges} of charges. They sit on top of every instalment, so the true cost is higher than the EMI suggests.`,
  deductionBodyNoFees:
    'Add a fee in Step 02 to see how much less cash reaches your hand while interest still runs on the full amount.',
  deductionExampleLabel: 'Educational example — not your loan',
  deductionExample: (deducted, borrowed) =>
    `A ${borrowed} loan with ${deducted} less credited to your account still earns interest on the full ${borrowed}.`,
  frontLoadedTitle: 'Front-Loaded Interest',
  frontLoadedBody: (early, total, percent, months) =>
    `In your first ${months} instalments you pay ${early} in interest — ${percent}% of the ${total} interest this loan will ever charge.`,
  frontLoadedNoInterest:
    'Under the numbers you entered this loan charges no interest at all, so nothing is loaded at the front.',
  ruleLabel: 'Household golden rule',
  ruleTenure: 'Choose the shortest tenure your income can safely cover.',
  checkLabel: 'Actionable check',
  checkDeduction: 'Compare the amount credited to your account with the amount on the sanction letter.',
  defenceLabel: 'Strategic defence',
  defenceFrontLoaded: 'When you have spare cash, repaying part of the principal early saves the most interest.',

  scenEyebrow: 'Real-time scenario analysis',
  scenTitle: 'What happens if you change the loan?',
  scenLead:
    'Put two options side by side — the same loan with a different tenure, rate or interest method. Every figure recalculates in your browser as you type.',
  scenChip: 'Recalculates as you type',
  scenTip:
    'Tip: keep the amount and rate the same in both columns and change only the tenure, to see exactly what a longer or shorter term costs.',

  decoderEyebrow: 'Lender marketing decoder',
  decoderTitle: 'Unmasking Flat Rates vs Reducing APR',
  decoderLead:
    'Some lenders advertise a simple monthly or flat rate that sounds cheap. What changes the real cost is whether interest is charged on the full original amount, or only on what is still owed.',
  pitchBadge: 'The advertised pitch',
  pitchTitle: '“Sir, our interest is only 1% per month!”',
  exampleLabel: 'Educational example — not a real offer',
  pitchBody:
    'One percent a month sounds like twelve percent a year. In a flat loan the interest keeps being charged on the original amount for the whole tenure — even in the last month, when most of the money has already been repaid.',
  pitchRowRate: 'Stated monthly flat rate',
  pitchRowYear: 'Sounds like, per year',
  pitchMechanismLabel: 'Mechanism',
  pitchMechanism:
    'In a flat loan you keep paying interest on money you have already returned to the lender.',
  realityBadge: 'Your numbers, calculated',
  realityTitle: 'What your loan actually adds up to',
  realityRowRate: 'Rate you entered',
  realityRowMethod: 'Method selected',
  realityRowInterest: 'Total interest',
  realityRowTotal: 'Total repayment',
  realityNote:
    'Reducing balance charges interest only on the amount still owed, so the interest part shrinks every month. Flat rate keeps charging the original amount. Change the method in Step 01 to see your own totals move.',
  compareHint:
    'For an exact side-by-side of both methods on identical numbers, use the comparison above with Option A = reducing balance and Option B = flat rate.',

  ledgerEyebrow: 'Repayment mechanics',
  ledgerTitle: 'Year-by-Year Amortization Ledger',
  ledgerLead:
    'Watch how early instalments are mostly interest, while later ones go mostly towards clearing the debt.',
  yearLabel: (year) => `Year ${year}`,
  monthsRange: (from, to) => `Months ${from}–${to}`,
  openingBalance: 'Opening balance',
  principalPaid: 'Principal paid',
  interestPaid: 'Interest paid',
  endingBalance: 'Ending balance',
  localNote: 'All figures computed locally, on your device',

  glossaryEyebrow: 'Civic financial dictionary',
  glossaryTitle: 'Loan Terms Explained in Plain Language',
  glossaryLead:
    'Understand the common loan terms before you sign anything. If a definition is still unclear, ask for it in writing.',
  glossary: loanGlossary,

  mandateTitle: 'Independent & privacy mandate',
  mandateBody:
    'GramFinance is an independent public-interest tool. We do not sell loans, refer you to lenders, earn commissions or collect your phone number. Every figure on this page is calculated in your browser from the numbers you enter — they are never sent to us. This is an educational estimate, not a loan offer, sanction or approval.',
  rbiLinkLabel: 'RBI guidelines (rbi.org.in)',
  printLabel: 'Print calculation note',
};

const pageCopyKn: LoanPageCopy = {
  metaLead: 'ಸಾರ್ವಜನಿಕ ಹಿತದ ಹಣಕಾಸು ಸಾಧನ',
  trustInBrowser: 'ಶೇಕಡಾ 100 ಬ್ರೌಸರ್‌ನಲ್ಲೇ ಲೆಕ್ಕಾಚಾರ',
  trustNoLogin: 'ಲಾಗಿನ್ ಅಥವಾ ಫೋನ್ ಸಂಖ್ಯೆ ಬೇಡ',
  trustNoCommissions: 'ಯಾವುದೇ ಕಮಿಷನ್ ಇಲ್ಲ, ಲೀಡ್ ಮಾರಾಟ ಇಲ್ಲ',

  breadcrumbLoans: 'ಸಾಲಗಳು',
  breadcrumbCurrent: 'ಸಾಲದ ವೆಚ್ಚ ಮತ್ತು EMI ವಿಶ್ಲೇಷಣೆ',

  heroEyebrow: 'ಸಾಲದ ವೆಚ್ಚ ಪಾರದರ್ಶಕತೆ',
  heroTitlePre: 'ಸಾಲದ',
  heroTitleEm: 'ನೈಜ ವೆಚ್ಚವನ್ನು',
  heroTitlePost: 'ಅರ್ಥಮಾಡಿಕೊಳ್ಳಿ',
  heroSubline: 'Understand what your loan will really cost.',
  heroLead:
    'ಸಾಲವು ತೋರಿಸಲಾಗುವ ಕಂತಿಗಿಂತ ಹೆಚ್ಚು. ಒಟ್ಟು ಬಡ್ಡಿ ಎಷ್ಟು, ಮುಂಗಡ ಶುಲ್ಕ ಎಷ್ಟು ಎಂದು ನೋಡಲು ಮೊತ್ತ, ಬಡ್ಡಿ ದರ ಮತ್ತು ಅವಧಿಯನ್ನು ಬದಲಾಯಿಸಿ. ಪ್ರತಿಯೊಂದು ಅಂಕಿಅಂಶವೂ ಇದೇ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಲೆಕ್ಕಹಾಕಲಾಗುತ್ತದೆ.',
  clientSideTitle: 'ಕ್ಲೈಂಟ್-ಸೈಡ್ ಎಂಜಿನ್',
  clientSideNote: 'ಫೋನ್ ಸಂಖ್ಯೆ ಅಥವಾ ಲಾಗಿನ್ ಬೇಡ',
  resetBaseline: 'ಮೂಲ ಮಾನದಂಡಕ್ಕೆ ಮರುಹೊಂದಿಸಿ',

  workspaceSectionTitle: 'ಸಾಲದ ಮಾಹಿತಿ ಮತ್ತು ಫಲಿತಾಂಶ',
  workspaceEyebrow: 'ಹಂತ 01 · ನಿಮ್ಮ ಮಾಹಿತಿ',
  workspaceTitle: 'ನಿಮ್ಮ ಸಾಲದ ಮಾಹಿತಿ',
  feesEyebrow: 'ಹಂತ 02 · ಶುಲ್ಕಗಳು',
  feesTitle: 'ಮುಂಗಡ ಕಡಿತ ಮತ್ತು ಸಂಸ್ಕರಣಾ ಶುಲ್ಕ',
  feesHint:
    'ಒಪ್ಪಿಗೆ ಶುಲ್ಕ, ಸ್ಟಾಂಪ್ ಶುಲ್ಕ, ವಿಮೆ ಅಥವಾ ದಾಖಲೆ ಶುಲ್ಕ — ನಿಮ್ಮ ಸಾಲದಲ್ಲಿ ನಿಜವಾಗಿ ಇರುವುದನ್ನು ಮಾತ್ರ ಸೇರಿಸಿ.',
  quickAdd: (amount) => `+ ${amount}`,
  minLabel: (amount) => `ಕನಿಷ್ಠ: ${amount}`,
  maxLabel: (amount) => `ಗರಿಷ್ಠ: ${amount}`,
  invalidTitle: 'ನಮೂದಿಸಿದ ಮೌಲ್ಯಗಳನ್ನು ಪರಿಶೀಲಿಸಿ',
  invalidBody:
    'EMI, ಒಟ್ಟು ಬಡ್ಡಿ ಮತ್ತು ಪೂರ್ಣ ಮರುಪಾವತಿ ಯೋಜನೆ ನೋಡಲು ಮೇಲೆ ಸರಿಯಾದ ಮೊತ್ತ, ದರ ಮತ್ತು ಅವಧಿಯನ್ನು ನಮೂದಿಸಿ.',
  signTitle: 'ದಾಖಲೆಗೆ ಸಹಿ ಮಾಡುವ ಮೊದಲು',
  signBody:
    'ಶುಲ್ಕವನ್ನು ಸಾಲದಿಂದಲೇ ಕಡಿತ ಮಾಡುತ್ತೇವೆ, ಈಗ ಏನೂ ಕಟ್ಟಬೇಕಿಲ್ಲ ಎಂದು ಏಜೆಂಟ್ ಹೇಳಿದರೆ — ನೆನಪಿಡಿ: ಕಡಿಮೆ ಹಣ ಕೈಗೆ ಸಿಕ್ಕಿದರೂ ಪೂರ್ಣ ಮೊತ್ತದ ಮೇಲೆ ಬಡ್ಡಿ ಕಟ್ಟಬೇಕಾಗುತ್ತದೆ.',
  signCheck: 'ಹಣ ಬರುವ ಮೊದಲು ಪ್ರತಿಯೊಂದು ಶುಲ್ಕದ ಪಟ್ಟಿಯನ್ನು ಬರೆದು ಕೇಳಿ.',
  viewAmortization: 'ವಿವರ ವೇಳಾಪಟ್ಟಿ ↓',

  emiEyebrow: 'ತಿಂಗಳ ಕಂತು (EMI)',
  emiPerMonth: 'ತಿಂಗಳು',
  emiDuration: (months, years) =>
    `${months} ತಿಂಗಳ ಕಾಲ ಪ್ರತಿ ತಿಂಗಳು ಪಾವತಿ (${years} ವರ್ಷ)`,
  legendPrincipal: 'ಮರುಪಾವತಿಸಿದ ಅಸಲು',
  legendInterest: 'ಪಾವತಿಸಿದ ಬಡ್ಡಿ',
  legendCharges: 'ಪಾವತಿಸಿದ ಶುಲ್ಕ',
  rowLoanAmount: 'ಸಾಲದ ಮೊತ್ತ',
  rowNetDisbursed: 'ನಿಮ್ಮ ಖಾತೆಗೆ ಜಮಾ',
  rowTotalInterest: 'ಒಟ್ಟು ಬಡ್ಡಿ',
  rowTotalCharges: 'ಒಟ್ಟು ಶುಲ್ಕ',
  rowTotalOutflow: 'ಒಟ್ಟು ಹೊರಗೆ ಹೋಗುವ ಮೊತ್ತ',
  ratioTitle: 'ನಿಜವಾದ ವೆಚ್ಚ ಅನುಪಾತ',
  ratioSentence: (perHundred, months) =>
    `ನೀವು ಪಡೆಯುವ ಪ್ರತಿ ₹100 ಗೆ, ${months} ತಿಂಗಳಲ್ಲಿ ಒಟ್ಟು ${perHundred} ಮರಳಿಸುತ್ತೀರಿ.`,
  plainLanguageTitle: 'ಸರಳ ವಿವರಣೆ',

  insightsEyebrow: 'ಸಾರ್ವಜನಿಕ ಒಳನೋಟ · ಅಧ್ಯಾಯ 01',
  insightsTitle: 'ಕಡಿಮೆ EMI ನಿಮ್ಮಿಂದ ಏನನ್ನು ಮರೆಮಾಡುತ್ತದೆ',
  insightsLead:
    'ಸಾಲ ಮಾರುವವರು ಸಣ್ಣ ತಿಂಗಳ ಮೊತ್ತವನ್ನು ತೋರಿಸುತ್ತಾರೆ. ದೀರ್ಘ ಅವಧಿಯಿಂದ ಪಡೆದ ಕಡಿಮೆ ಕಂತು, ಅಥವಾ ಕೈಗೆ ಸಿಗುವ ಮೊದಲೇ ಕಡಿತವಾದ ಮೊತ್ತ, ಒಟ್ಟಾರೆ ಹೆಚ್ಚು ದುಬಾರಿಯಾಗಬಹುದು.',
  tenureTrapTitle: 'ಅವಧಿಯ ಬಲೆ',
  tenureTrapBody: (interest, months, percent, principal) =>
    `ನಿಮ್ಮ ಅಂಕಿಅಂಶಗಳಲ್ಲಿ ${months} ತಿಂಗಳಲ್ಲಿ ${interest} ಬಡ್ಡಿ ಪಾವತಿ — ನೀವು ಪಡೆದ ${principal} ನ ಸುಮಾರು ${percent}%. ಸಣ್ಣ ಬಿಲ್ ಪಡೆಯಲು ಹೆಚ್ಚು ತಿಂಗಳ ಬಡ್ಡಿಯನ್ನು ಪಾವತಿಸುತ್ತಿದ್ದೀರಿ.`,
  deductionTitle: 'ಮುಂಗಡ ಕಡಿತಗಳು',
  deductionBodyDeducted: (received, borrowed) =>
    `ಸಾಲದ ಒಂದು ಭಾಗವನ್ನು ನಿಮ್ಮ ಕೈಗೆ ಬರುವ ಮೊದಲೇ ಇಟ್ಟುಕೊಳ್ಳಲಾಗುತ್ತದೆ: ನಿಮಗೆ ${received} ಸಿಗುತ್ತದೆ, ಆದರೆ ${borrowed} ಮೇಲೆ ಬಡ್ಡಿ ಇನ್ನೂ ಬರುತ್ತದೆ.`,
  deductionBodyCharges: (charges) =>
    `ನಿಮ್ಮ ಸಾಲದಲ್ಲಿ ${charges} ಶುಲ್ಕ ಇದೆ. ಇವು ಪ್ರತಿ ಕಂತಿಗೆ ಸೇರಿರುವುದರಿಂದ ನೈಜ ವೆಚ್ಚ EMI ತೋರಿಸುವುದಕ್ಕಿಂತ ಹೆಚ್ಚು.`,
  deductionBodyNoFees:
    'ಕೈಗೆ ಸಿಗುವ ಮೊತ್ತ ಎಷ್ಟು ಕಡಿಮೆಯಾಗುತ್ತದೆ ಎಂದು ನೋಡಲು ಹಂತ 02 ರಲ್ಲಿ ಶುಲ್ಕ ಸೇರಿಸಿ. ಆಗ ಪೂರ್ಣ ಮೊತ್ತದ ಮೇಲೆ ಬಡ್ಡಿ ಬರುತ್ತಲೇ ಇರುತ್ತದೆ.',
  deductionExampleLabel: 'ಶೈಕ್ಷಣಿಕ ಉದಾಹರಣೆ — ಇದು ನಿಮ್ಮ ಸಾಲವಲ್ಲ',
  deductionExample: (deducted, borrowed) =>
    `${borrowed} ಸಾಲದಲ್ಲಿ ${deducted} ಕಡಿತವಾಗಿ ಖಾತೆಗೆ ಬಂದರೂ, ಪೂರ್ಣ ${borrowed} ಮೇಲೆ ಬಡ್ಡಿ ಬರುತ್ತದೆ.`,
  frontLoadedTitle: 'ಮುಂಭಾಗದಲ್ಲೇ ಬಡ್ಡಿ',
  frontLoadedBody: (early, total, percent, months) =>
    `ಮೊದಲ ${months} ಕಂತುಗಳಲ್ಲಿಯೇ ${early} ಬಡ್ಡಿ ಪಾವತಿ — ಈ ಸಾಲ ವಸೂಲಾಗುವ ಒಟ್ಟು ${total} ಬಡ್ಡಿಯ ${percent}%.`,
  frontLoadedNoInterest:
    'ನೀವು ನಮೂದಿಸಿದ ಮೌಲ್ಯಗಳ ಪ್ರಕಾರ ಈ ಸಾಲಕ್ಕೆ ಯಾವುದೇ ಬಡ್ಡಿ ಇಲ್ಲ, ಆದ್ದರಿಂದ ಮುಂಭಾಗದಲ್ಲಿ ಸೇರಿಸುವ ಬಡ್ಡಿ ಏನೂ ಇಲ್ಲ.',
  ruleLabel: 'ಮನೆಯ ಸುವರ್ಣ ನಿಯಮ',
  ruleTenure: 'ನಿಮ್ಮ ಆದಾಯ ಸುರಕ್ಷಿತವಾಗಿ ಭರಿಸುವ ಅತಿ ಕಡಿಮೆ ಅವಧಿಯನ್ನು ಆಯ್ಕೆ ಮಾಡಿ.',
  checkLabel: 'ಕ್ರಿಯಾತ್ಮಕ ಪರಿಶೀಲನೆ',
  checkDeduction: 'ಖಾತೆಗೆ ಜಮಾ ಆದ ಮೊತ್ತವನ್ನು ಒಪ್ಪಿಗೆ ಪತ್ರದ ಮೊತ್ತದೊಂದಿಗೆ ಹೋಲಿಸಿ.',
  defenceLabel: 'ತಂತ್ರದ ರಕ್ಷಣೆ',
  defenceFrontLoaded: 'ಹೆಚ್ಚುವರಿ ಹಣ ಇದ್ದರೆ, ಬೇಗ ಅಸಲಿನ ಒಂದು ಭಾಗ ಮರುಪಾವತಿಸಿದರೆ ಹೆಚ್ಚು ಬಡ್ಡಿ ಉಳಿಯುತ್ತದೆ.',

  scenEyebrow: 'ನೈಜ ಸಮಯದ ಪರಿಸ್ಥಿತಿ ವಿಶ್ಲೇಷಣೆ',
  scenTitle: 'ಸಾಲ ಬದಲಾಯಿಸಿದರೆ ಏನಾಗುತ್ತದೆ?',
  scenLead:
    'ಎರಡು ಆಯ್ಕೆಗಳನ್ನು ಪಕ್ಕದಲ್ಲಿ ಇಟ್ಟುಕೊಳ್ಳಿ — ಅದೇ ಸಾಲ, ಆದರೆ ಬೇರೆ ಅವಧಿ, ದರ ಅಥವಾ ಬಡ್ಡಿ ವಿಧಾನ. ನೀವು ಟೈಪ್ ಮಾಡಿದಂತೆ ಪ್ರತಿಯೊಂದು ಅಂಕಿಅಂಶ ಇದೇ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಮತ್ತೆ ಲೆಕ್ಕಹಾಕಲ್ಪಡುತ್ತದೆ.',
  scenChip: 'ಟೈಪ್ ಮಾಡಿದಂತೆ ಮತ್ತೆ ಲೆಕ್ಕ',
  scenTip:
    'ಸಲಹೆ: ಎರಡೂ ಕಾಲಮ್‌ಗಳಲ್ಲಿ ಮೊತ್ತ ಮತ್ತು ದರ ಒಂದೇ ಇರಲಿ, ಅವಧಿ ಮಾತ್ರ ಬದಲಾಯಿಸಿ — ದೀರ್ಘ ಅಥವಾ ಕಡಿಮೆ ಅವಧಿ ಎಷ್ಟು ವೆಚ್ಚ ಎಂದು ನಿಖರವಾಗಿ ಗೊತ್ತಾಗುತ್ತದೆ.',

  decoderEyebrow: 'ಸಾಲ ಜಾಹೀರಾತು ಅರ್ಥೈಸುವಿಕೆ',
  decoderTitle: 'ಸ್ಥಿರ ದರ ಮತ್ತು ಕ್ಷೀಣಿಸುವ ದರದ ವಾಸ್ತವ',
  decoderLead:
    'ಕೆಲವರು ಸರಳವಾದ ಮಾಸಿಕ ಅಥವಾ ಸ್ಥಿರ ದರವನ್ನು ಜಾಹೀರಾತು ಮಾಡುತ್ತಾರೆ. ನಿಜವಾದ ವೆಚ್ಚವನ್ನು ನಿರ್ಧರಿಸುವುದು ಬಡ್ಡಿ ಪೂರ್ಣ ಮೂಲ ಮೊತ್ತದ ಮೇಲೆ ಬರುತ್ತದೆಯೇ ಅಥವಾ ಬಾಕಿ ಇರುವ ಮೊತ್ತದ ಮೇಲೆ ಮಾತ್ರವೇ ಎಂಬುದು.',
  pitchBadge: 'ಜಾಹೀರಾತಿನ ಮಾತು',
  pitchTitle: '“ಸಾರ್, ತಿಂಗಳಿಗೆ ಕೇವಲ 1% ಬಡ್ಡಿ ಮಾತ್ರ!”',
  exampleLabel: 'ಶೈಕ್ಷಣಿಕ ಉದಾಹರಣೆ — ಇದು ನಿಜವಾದ ಸಲಹೆಯಲ್ಲ',
  pitchBody:
    'ತಿಂಗಳಿಗೆ ಒಂದು ಶೇಕಡಾ ಎಂದರೆ ವರ್ಷಕ್ಕೆ ಹನ್ನೆರಡು ಶೇಕಡಾ ಎಂದು ಕೇಳಿಸುತ್ತದೆ. ಆದರೆ ಸ್ಥಿರ ದರದ ಸಾಲದಲ್ಲಿ, ಸಂಪೂರ್ಣ ಅವಧಿಯಲ್ಲಿ ಮೂಲ ಮೊತ್ತದ ಮೇಲೆಯೇ ಬಡ್ಡಿ ಬರುತ್ತಲೇ ಇರುತ್ತದೆ — ಕೊನೆಯ ತಿಂಗಳಿನಲ್ಲೂ ಸಹ, ಹೆಚ್ಚಿನ ಹಣ ಮರುಪಾವತಿಸಿದ ಮೇಲೂ.',
  pitchRowRate: 'ಘೋಷಿತ ಮಾಸಿಕ ಸ್ಥಿರ ದರ',
  pitchRowYear: 'ವಾರ್ಷಿಕವಾಗಿ ಕೇಳಿಸುವುದು',
  pitchMechanismLabel: 'ಕ್ರಿಯಾವಿಧಾನ',
  pitchMechanism:
    'ಸ್ಥಿರ ದರದ ಸಾಲದಲ್ಲಿ, ನೀವು ಈಗಾಗಲೇ ಮರುಪಾವತಿಸಿದ ಹಣದ ಮೇಲೂ ಬಡ್ಡಿ ಕಟ್ಟುತ್ತಲೇ ಇರುತ್ತೀರಿ.',
  realityBadge: 'ನಿಮ್ಮ ಅಂಕಿಅಂಶ, ಲೆಕ್ಕಹಾಕಲಾಗಿದೆ',
  realityTitle: 'ನಿಮ್ಮ ಸಾಲ ನಿಜವಾಗಿ ಎಷ್ಟಾಗುತ್ತದೆ',
  realityRowRate: 'ನೀವು ನಮೂದಿಸಿದ ದರ',
  realityRowMethod: 'ಆಯ್ಕೆ ಮಾಡಿದ ವಿಧಾನ',
  realityRowInterest: 'ಒಟ್ಟು ಬಡ್ಡಿ',
  realityRowTotal: 'ಒಟ್ಟು ಮರುಪಾವತಿ',
  realityNote:
    'ಕ್ಷೀಣಿಸುವ ಬ್ಯಾಲೆನ್ಸ್‌ನಲ್ಲಿ ಬಾಕಿ ಇರುವ ಮೊತ್ತದ ಮೇಲೆ ಮಾತ್ರ ಬಡ್ಡಿ ಬರುವುದರಿಂದ ಪ್ರತಿ ತಿಂಗಳೂ ಬಡ್ಡಿ ಭಾಗ ಕಡಿಮೆಯಾಗುತ್ತದೆ. ಸ್ಥಿರ ದರದಲ್ಲಿ ಮೂಲ ಮೊತ್ತದ ಮೇಲೆಯೇ ಬರುತ್ತದೆ. ನಿಮ್ಮ ಒಟ್ಟು ಮೊತ್ತ ಬದಲಾಗುವುದನ್ನು ನೋಡಲು ಹಂತ 01 ರಲ್ಲಿ ವಿಧಾನ ಬದಲಾಯಿಸಿ.',
  compareHint:
    'ಒಂದೇ ಅಂಕಿಅಂಶದ ಎರಡು ವಿಧಾನಗಳನ್ನು ನಿಖರವಾಗಿ ಹೋಲಿಸಲು, ಮೇಲಿನ ಹೋಲಿಕೆಯಲ್ಲಿ ಆಯ್ಕೆ A = ಕ್ಷೀಣಿಸುವ ಬ್ಯಾಲೆನ್ಸ್, ಆಯ್ಕೆ B = ಸ್ಥಿರ ದರ ಎಂದು ಇಟ್ಟುಕೊಳ್ಳಿ.',

  ledgerEyebrow: 'ಮರುಪಾವತಿ ಕ್ರಿಯಾವಿಧಾನ',
  ledgerTitle: 'ವರ್ಷವಾರಿ ಮರುಪಾವತಿ ದಾಖಲೆ',
  ledgerLead:
    'ಆರಂಭದ ಕಂತುಗಳು ಬಹುತೇಕ ಬಡ್ಡಿಯದ್ದಾಗಿದ್ದು, ನಂತರದ ಕಂತುಗಳು ಸಾಲ ತೀರಿಸಲು ಬಳಕೆಯಾಗುವುದನ್ನು ನೋಡಿ.',
  yearLabel: (year) => `${year}ನೇ ವರ್ಷ`,
  monthsRange: (from, to) => `ತಿಂಗಳು ${from}–${to}`,
  openingBalance: 'ಆರಂಭಿಕ ಬಾಕಿ',
  principalPaid: 'ಅಸಲು ಮರುಪಾವತಿ',
  interestPaid: 'ಬಡ್ಡಿ ಪಾವತಿ',
  endingBalance: 'ಕೊನೆಯ ಬಾಕಿ',
  localNote: 'ಎಲ್ಲಾ ಅಂಕಿಅಂಶಗಳು ನಿಮ್ಮ ಸಾಧನದಲ್ಲೇ ಲೆಕ್ಕಹಾಕಲಾಗಿದೆ',

  glossaryEyebrow: 'ಸರಳ ಹಣಕಾಸು ನಿಘಂಟು',
  glossaryTitle: 'ಸಾಲದ ಪರಿಭಾಷೆ ಸರಳ ಭಾಷೆಯಲ್ಲಿ',
  glossaryLead:
    'ಯಾವುದಕ್ಕೂ ಸಹಿ ಮಾಡುವ ಮೊದಲು ಸಾಮಾನ್ಯ ಸಾಲದ ಪರಿಭಾಷೆ ಅರ್ಥವಾಗಲಿ. ಇನ್ನೂ ಸ್ಪಷ್ಟವಾಗದಿದ್ದರೆ, ಅದನ್ನು ಬರೆದು ಕೇಳಿ.',
  glossary: loanGlossary,
  mandateTitle: 'ಸ್ವತಂತ್ರ ಮತ್ತು ಗೌಪ್ಯತಾ ಬದ್ಧತೆ',
  mandateBody:
    'GramFinance ಒಂದು ಸ್ವತಂತ್ರ ಸಾರ್ವಜನಿಕ ಹಿತದ ಸಾಧನ. ನಾವು ಸಾಲ ಮಾರುವುದಿಲ್ಲ, ಸಾಲ ನೀಡುವವರಿಗೆ ಕಳುಹಿಸುವುದಿಲ್ಲ, ಕಮಿಷನ್ ಪಡೆಯುವುದಿಲ್ಲ ಅಥವಾ ಫೋನ್ ಸಂಖ್ಯೆ ಸಂಗ್ರಹಿಸುವುದಿಲ್ಲ. ಈ ಪುಟದ ಪ್ರತಿಯೊಂದು ಅಂಕಿಅಂಶವೂ ನೀವು ನಮೂದಿಸಿದ ಮೌಲ್ಯಗಳಿಂದ ನಿಮ್ಮ ಬ್ರೌಸರ್‌ನಲ್ಲೇ ಲೆಕ್ಕಹಾಕಲ್ಪಡುತ್ತದೆ — ಅವು ನಮ್ಮ ಬಳಿಗೆ ಕಳುಹಿಸಲ್ಪಡುವುದಿಲ್ಲ. ಇದು ಶೈಕ್ಷಣಿಕ ಅಂದಾಜು; ಸಾಲದ ಪ್ರಸ್ತಾವ, ಮಂಜೂರು ಅಥವಾ ಒಪ್ಪಿಗೆ ಅಲ್ಲ.',
  rbiLinkLabel: 'ಆರ್‌ಬಿಐ ಮಾರ್ಗದರ್ಶನ (rbi.org.in)',
  printLabel: 'ಲೆಕ್ಕಾಚಾರ ಮುದ್ರಿಸಿ',
};

/** Bilingual copy for every section of the Loan & EMI page. */
export const pageCopy: Record<Language, LoanPageCopy> = {
  en: pageCopyEn,
  kn: pageCopyKn,
};
