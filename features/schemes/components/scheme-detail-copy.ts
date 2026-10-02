/**
 * Feature-local copy for the scheme detail page (Stitch design).
 *
 * Deliberately kept beside the components instead of in
 * `features/language/translations/*` — those two files are shared chrome and
 * must not be touched while parallel work is in flight.
 *
 * Every string here is presentation copy about how GramFinance behaves. None of
 * it states a scheme fact: amounts, dates, benefits, instalments and answers are
 * all read from the `scheme` record, never written here. The English and
 * Kannada objects must stay key-for-key identical; TypeScript checks the `kn`
 * side against the `en` side at every use site.
 */

/** Formats an ISO date string (YYYY-MM-DD) for human-readable display. */
export function formatSchemeDate(isoDate: string, language: 'en' | 'kn'): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat(language === 'kn' ? 'kn-IN' : 'en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/**
 * The opening of a longer description, used as the hero's value narrative.
 * Truncation only — the wording itself is never rewritten. Keeps the first
 * sentence(s) up to `maxChars`, preferring a real sentence boundary so
 * abbreviation periods ("Rs.", "Dr.") never cut the text mid-phrase.
 */
export function firstSentence(text: string, maxChars = 220): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) return trimmed;

  const slice = trimmed.slice(0, maxChars);
  const lastStop = Math.max(
    slice.lastIndexOf('. '),
    slice.lastIndexOf('! '),
    slice.lastIndexOf('? ')
  );
  if (lastStop > 60) return slice.slice(0, lastStop + 1).trim();

  const lastWord = slice.lastIndexOf(' ');
  return slice.slice(0, lastWord > 0 ? lastWord : maxChars).trim();
}

const en = {
  // ── Breadcrumb ──
  verifiedPillLabel: 'Information verified',

  // ── Hero ──
  category: 'Government support scheme',
  heroCtaSecondary: 'How this check works',
  heroMetaEstimate: 'Preliminary estimate — not an approval',
  heroMetaRecord: 'Conditions come from the published scheme details',
  graphicBadge: 'Verified information',

  // ── At-a-glance strip ──
  metaTargetGroup: 'Target group',
  metaCoverage: 'Coverage',
  metaPortal: 'Government portal',
  metaTargetGroupEmpty: 'Not specified',

  // ── About + self-assessment ──
  aboutEyebrow: 'About the scheme',
  aboutTitle: 'About this scheme',
  aboutNote: 'This page shows only what the scheme record holds; nothing is added here.',
  selfCheckEyebrow: 'Self-assessment tool',
  selfCheckTitle: 'Could this scheme apply to your household?',
  selfCheckBody:
    'Answer only the questions this scheme asks for. GramFinance compares your answers with the conditions stored for this scheme and explains the result in plain language.',
  selfCheckBullet1: 'Plain-language explanation of each condition',
  selfCheckBullet2: 'Shows the documents this scheme asks you to arrange',
  selfCheckBullet3: 'Compares your answers — it never approves anything',
  selfCheckButtonHint: 'Preliminary estimate · Not an approval',

  // ── Eligibility criteria + documents ──
  criteriaEyebrow: 'Eligibility criteria',
  criteriaTitle: 'Who is it for?',
  criteriaNote: 'Only the conditions stored on this scheme record are shown here.',
  groupLabel: (group: number) => `Condition group ${group}`,
  documentsEyebrow: 'Required documentation',
  documentsTitle: "What you'll need",
  documentsNote: 'Keep these documents ready before you check.',

  // ── How the check works ──
  journeyEyebrow: 'Step-by-step guide',
  journeyTitle: 'How this check works',
  journeyDesc: 'From reading the conditions to seeing your estimate, here is what happens.',
  steps: [
    {
      title: 'Read the conditions',
      body: 'The conditions stored for this scheme are shown here exactly as they are published.',
      footer: 'From the scheme details',
    },
    {
      title: 'Answer only what is asked',
      body: 'The form asks only for the information this scheme needs. Nothing extra is requested.',
      footer: 'Questions come from the scheme',
    },
    {
      title: 'The server checks your answers',
      body:
        'Your answers are sent to the GramFinance check and the result is worked out on the server — the page never decides on its own.',
      footer: 'No result is decided in your browser',
    },
    {
      title: 'Get a plain-language estimate',
      body:
        'You see which conditions are satisfied, which need information, and what is still needed.',
      footer: 'A preliminary estimate, not an approval',
    },
  ],

  // ── Eligibility and verification note ──
  noteEyebrow: 'A note from GramFinance',
  noteIntro: 'What this check can decide, and what only the relevant authorities can decide.',

  // ── Official source strip ──
  sourceEyebrow: 'Official authority source',
  sourcePortalLabel: 'Official portal',
  sourceCta: 'Visit official government portal',

  // ── Questions about the check ──
  questionsEyebrow: 'Common questions',
  questionsTitle: 'Questions about this check',
  questionsDesc: 'Plain answers about how this eligibility check behaves.',
  faq: [
    {
      q: 'Is this an approval?',
      a: 'No. This check gives a preliminary eligibility estimate based only on what you enter. Final eligibility is subject to verification by the relevant authorities and the applicable scheme process.',
    },
    {
      q: 'What if I do not know an answer?',
      a: 'That condition is shown as needing information instead of a guess. A condition is never marked satisfied without an answer, and you can add the missing answer later and check again.',
    },
    {
      q: 'What do "satisfied" and "needs information" mean?',
      a: 'Satisfied means your answer meets that condition. Needs information means we could not check it because the answer is missing — it is never treated as a failure.',
    },
  ],

  // ── Closing invitation ──
  ctaEyebrow: 'Start here · Simple step',
  ctaTitle: 'Think this scheme might apply to you?',
  ctaBody:
    'Compare your answers with the conditions stored for this scheme before you apply anywhere.',

  // ── Eligibility form section ──
  checkEyebrow: 'Step 2',
  checkDesc: 'Tell us a little about yourself — this is only a preliminary estimate.',
};

export type SchemeDetailCopy = typeof en;

export const schemeDetailCopy: { en: SchemeDetailCopy; kn: SchemeDetailCopy } = {
  en,
  kn: {
    // ── Breadcrumb ──
    verifiedPillLabel: 'ಮಾಹಿತಿಯನ್ನು ಪರಿಶೀಲಿಸಲಾಗಿದೆ',

    // ── Hero ──
    category: 'ಸರ್ಕಾರಿ ನೆರವು ಯೋಜನೆ',
    heroCtaSecondary: 'ಈ ಪರಿಶೀಲನೆ ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ',
    heroMetaEstimate: 'ಪ್ರಾಥಮಿಕ ಅಂದಾಜು — ಅನುಮೋದನೆ ಅಲ್ಲ',
    heroMetaRecord: 'ಷರತ್ತುಗಳು ಪ್ರಕಟಿಸಿದ ಯೋಜನಾ ಮಾಹಿತಿಯಿಂದ ಬಂದಿವೆ',
    graphicBadge: 'ಪರಿಶೀಲಿಸಿದ ಮಾಹಿತಿ',

    // ── At-a-glance strip ──
    metaTargetGroup: 'ಗುರಿ ಗುಂಪು',
    metaCoverage: 'ವ್ಯಾಪ್ತಿ',
    metaPortal: 'ಸರ್ಕಾರಿ ಪೋರ್ಟಲ್',
    metaTargetGroupEmpty: 'ನಿರ್ದಿಷ್ಟಪಡಿಸಿಲ್ಲ',

    // ── About + self-assessment ──
    aboutEyebrow: 'ಯೋಜನೆ ಬಗ್ಗೆ',
    aboutTitle: 'ಈ ಯೋಜನೆ ಬಗ್ಗೆ',
    aboutNote: 'ಈ ಪುಟ ಯೋಜನಾ ದಾಖಲೆಯಲ್ಲಿರುವ ಮಾಹಿತಿಯನ್ನು ಮಾತ್ರ ತೋರಿಸುತ್ತದೆ; ಇಲ್ಲಿ ಏನನ್ನೂ ಸೇರಿಸಲಾಗಿಲ್ಲ.',
    selfCheckEyebrow: 'ಸ್ವ-ಮೌಲ್ಯಮಾಪನ ಸಾಧನ',
    selfCheckTitle: 'ಈ ಯೋಜನೆ ನಿಮ್ಮ ಕುಟುಂಬಕ್ಕೆ ಅನ್ವಯವಾಗಬಹುದೇ?',
    selfCheckBody:
      'ಈ ಯೋಜನೆ ಕೇಳುವ ಪ್ರಶ್ನೆಗಳಿಗೆ ಮಾತ್ರ ಉತ್ತರಿಸಿ. ಗ್ರಾಮ್ ಫೈನಾನ್ಸ್ ನಿಮ್ಮ ಉತ್ತರಗಳನ್ನು ಈ ಯೋಜನೆಯ ಷರತ್ತುಗಳೊಂದಿಗೆ ಹೋಲಿಸಿ, ಫಲಿತಾಂಶವನ್ನು ಸರಳ ಭಾಷೆಯಲ್ಲಿ ವಿವರಿಸುತ್ತದೆ.',
    selfCheckBullet1: 'ಪ್ರತಿ ಷರತ್ತಿನ ಸರಳ ಭಾಷೆಯ ವಿವರಣೆ',
    selfCheckBullet2: 'ಈ ಯೋಜನೆಗೆ ಬೇಕಾದ ದಾಖಲೆಗಳ ಪಟ್ಟಿ',
    selfCheckBullet3: 'ನಿಮ್ಮ ಉತ್ತರಗಳನ್ನು ಹೋಲಿಸುತ್ತದೆ — ಯಾವುದನ್ನೂ ಅನುಮೋದಿಸುವುದಿಲ್ಲ',
    selfCheckButtonHint: 'ಪ್ರಾಥಮಿಕ ಅಂದಾಜು · ಅನುಮೋದನೆ ಅಲ್ಲ',

    // ── Eligibility criteria + documents ──
    criteriaEyebrow: 'ಅರ್ಹತೆ ಮಾನದಂಡ',
    criteriaTitle: 'ಇದು ಯಾರಿಗೆ ಅನ್ವಯ?',
    criteriaNote: 'ಇಲ್ಲಿ ಯೋಜನಾ ದಾಖಲೆಯಲ್ಲಿರುವ ಷರತ್ತುಗಳನ್ನು ಮಾತ್ರ ತೋರಿಸಲಾಗಿದೆ.',
    groupLabel: (group: number) => `ಷರತ್ತುಗಳ ಗುಂಪು ${group}`,
    documentsEyebrow: 'ಅಗತ್ಯ ದಾಖಲೆಗಳು',
    documentsTitle: 'ನಿಮಗೆ ಏನು ಬೇಕು?',
    documentsNote: 'ಅರ್ಹತೆ ಪರಿಶೀಲಿಸುವ ಮೊದಲು ಈ ದಾಖಲೆಗಳನ್ನು ಸಿದ್ಧವಾಗಿಟ್ಟುಕೊಳ್ಳಿ.',

    // ── How the check works ──
    journeyEyebrow: 'ಹಂತ-ಹಂತದ ಮಾರ್ಗದರ್ಶಿ',
    journeyTitle: 'ಈ ಪರಿಶೀಲನೆ ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ',
    journeyDesc: 'ಷರತ್ತುಗಳನ್ನು ಓದುವುದರಿಂದ ಅಂದಾಜು ಕಾಣುವವರೆಗೆ ಇಲ್ಲಿ ನಡೆಯುವ ಹಂತಗಳು ಇವು.',
    steps: [
      {
        title: 'ಷರತ್ತುಗಳನ್ನು ಓದಿ',
        body: 'ಈ ಯೋಜನೆಗೆ ದಾಖಲಿಸಿರುವ ಷರತ್ತುಗಳನ್ನು ಹೇಳಿದಂತೆಯೇ ಇಲ್ಲಿ ತೋರಿಸಲಾಗುತ್ತದೆ.',
        footer: 'ಯೋಜನಾ ಮಾಹಿತಿಯಿಂದ',
      },
      {
        title: 'ಕೇಳಿದ್ದಕ್ಕೆ ಮಾತ್ರ ಉತ್ತರಿಸಿ',
        body: 'ಈ ಯೋಜನೆಗೆ ಬೇಕಾದ ಮಾಹಿತಿಯನ್ನು ಮಾತ್ರ ಫಾರ್ಮ್ ಕೇಳುತ್ತದೆ. ಹೆಚ್ಚುವರಿ ಏನನ್ನೂ ಕೇಳಲಾಗುವುದಿಲ್ಲ.',
        footer: 'ಪ್ರಶ್ನೆಗಳು ಯೋಜನೆಯಿಂದ',
      },
      {
        title: 'ಸರ್ವರ್ ಉತ್ತರಗಳನ್ನು ಪರಿಶೀಲಿಸುತ್ತದೆ',
        body:
          'ನಿಮ್ಮ ಉತ್ತರಗಳನ್ನು ಗ್ರಾಮ್ ಫೈನಾನ್ಸ್ ಪರಿಶೀಲನೆಗೆ ಕಳುಹಿಸಲಾಗುತ್ತದೆ ಮತ್ತು ಫಲಿತಾಂಶ ಸರ್ವರ್‌ನಲ್ಲಿ ಲೆಕ್ಕಹಾಕಲಾಗುತ್ತದೆ — ಪುಟವು ತಾನಾಗಿಯೇ ತೀರ್ಮಾನ ಮಾಡುವುದಿಲ್ಲ.',
        footer: 'ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಫಲಿತಾಂಶವಿಲ್ಲ',
      },
      {
        title: 'ಸರಳ ಭಾಷೆಯ ಅಂದಾಜು ಪಡೆಯಿರಿ',
        body:
          'ಯಾವ ಷರತ್ತುಗಳು ಪೂರೈದಿವೆ, ಯಾವುದಕ್ಕೆ ಮಾಹಿತಿ ಬೇಕು ಮತ್ತು ಇನ್ನೇನು ಬೇಕು ಎಂಬುದನ್ನು ನೀವು ನೋಡುತ್ತೀರಿ.',
        footer: 'ಪ್ರಾಥಮಿಕ ಅಂದಾಜು, ಅನುಮೋದನೆ ಅಲ್ಲ',
      },
    ],

    // ── Eligibility and verification note ──
    noteEyebrow: 'ಗ್ರಾಮ್ ಫೈನಾನ್ಸ್‌ನಿಂದ ಒಂದು ಟಿಪ್ಪಣಿ',
    noteIntro: 'ಈ ಪರಿಶೀಲನೆ ಏನನ್ನು ನಿರ್ಧರಿಸಬಹುದು ಮತ್ತು ಅಂತಿಮವಾಗಿ ಯಾರು ನಿರ್ಧರಿಸುತ್ತಾರೆ ಎಂಬುದು ಇಲ್ಲಿದೆ.',

    // ── Official source strip ──
    sourceEyebrow: 'ಅಧಿಕಾರಿಕ ಮೂಲ',
    sourcePortalLabel: 'ಅಧಿಕಾರಿಕ ಪೋರ್ಟಲ್',
    sourceCta: 'ಅಧಿಕಾರಿಕ ಸರ್ಕಾರಿ ಪೋರ್ಟಲ್ ನೋಡಿ',

    // ── Questions about the check ──
    questionsEyebrow: 'ಸಾಮಾನ್ಯ ಪ್ರಶ್ನೆಗಳು',
    questionsTitle: 'ಈ ಪರಿಶೀಲನೆಯ ಬಗ್ಗೆ ಪ್ರಶ್ನೆಗಳು',
    questionsDesc: 'ಈ ಅರ್ಹತೆ ಪರಿಶೀಲನೆ ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ ಎಂಬುದರ ಬಗ್ಗೆ ಸರಳ ಉತ್ತರಗಳು.',
    faq: [
      {
        q: 'ಇದು ಅನುಮೋದನೆಯೇ?',
        a: 'ಇಲ್ಲ. ನೀವು ನಮೂದಿಸಿದ ಮಾಹಿತಿಯ ಆಧಾರದ ಮೇಲೆ ಇದು ಪ್ರಾಥಮಿಕ ಅರ್ಹತೆ ಅಂದಾಜನ್ನು ಮಾತ್ರ ನೀಡುತ್ತದೆ. ಅಂತಿಮ ಅರ್ಹತೆಯು ಸಂಬಂಧಪಟ್ಟ ಅಧಿಕಾರಿಗಳು ಮತ್ತು ಅನ್ವಯಿಕ ಯೋಜನಾ ಪ್ರಕ್ರಿಯೆಯ ಪರಿಶೀಲನೆಗೆ ಒಳಪಟ್ಟಿದೆ.',
      },
      {
        q: 'ನನಗೆ ಉತ್ತರ ಗೊತ್ತಿಲ್ಲದಿದ್ದರೆ ಏನಾಗುತ್ತದೆ?',
        a: 'ಆ ಷರತ್ತನ್ನು ಊಹಿಸದೆ, ಮಾಹಿತಿ ಬೇಕು ಎಂದು ತೋರಿಸಲಾಗುತ್ತದೆ. ಉತ್ತರವಿಲ್ಲದ ಷರತ್ತನ್ನು ಎಂದೂ ಪೂರೈದಿದೆ ಎಂದು ಪರಿಗಣಿಸಲಾಗುವುದಿಲ್ಲ; ನೀವು ನಂತರ ಉತ್ತರವನ್ನು ಸೇರಿಸಿ ಮತ್ತೆ ಪರಿಶೀಲಿಸಬಹುದು.',
      },
      {
        q: '"ಪೂರೈದ" ಮತ್ತು "ಮಾಹಿತಿ ಬೇಕು" ಎಂದರೆ ಏನು?',
        a: 'ಪೂರೈದ ಎಂದರೆ ನಿಮ್ಮ ಉತ್ತರ ಆ ಷರತ್ತನ್ನು ಪೂರೈಸುತ್ತದೆ. ಮಾಹಿತಿ ಬೇಕು ಎಂದರೆ ಉತ್ತರ ಇಲ್ಲದ ಕಾರಣ ಅದನ್ನು ಪರಿಶೀಲಿಸಲು ಆಗಿಲ್ಲ — ಅದನ್ನು ಎಂದೂ ಸೋಲು ಎಂದು ಪರಿಗಣಿಸಲಾಗುವುದಿಲ್ಲ.',
      },
    ],

    // ── Closing invitation ──
    ctaEyebrow: 'ಪ್ರಾರಂಭಿಸಿ · ಸರಳ ಹಂತ',
    ctaTitle: 'ಈ ಯೋಜನೆ ನಿಮ್ಮ ಮೇಲೆ ಅನ್ವಯವಾಗಬಹುದು ಎಂದು ಅನಿಸುತ್ತದೆಯೇ?',
    ctaBody: 'ಅರ್ಜಿ ಸಲ್ಲಿಸುವ ಮೊದಲು, ನಿಮ್ಮ ಉತ್ತರಗಳನ್ನು ಈ ಯೋಜನೆಯ ಷರತ್ತುಗಳೊಂದಿಗೆ ಹೋಲಿಸಿ ನೋಡಿ.',

    // ── Eligibility form section ──
    checkEyebrow: 'ಹಂತ 2',
    checkDesc: 'ನಿಮ್ಮ ಬಗ್ಗೆ ಕೆಲವು ಮಾಹಿತಿ ನೀಡಿ — ಇದು ಪ್ರಾಥಮಿಕ ಅಂದಾಜು ಮಾತ್ರ.',
  },
};

/** Active-language copy for the scheme detail page. */
export function schemeDetailText(language: 'en' | 'kn'): SchemeDetailCopy {
  return language === 'kn' ? schemeDetailCopy.kn : schemeDetailCopy.en;
}
