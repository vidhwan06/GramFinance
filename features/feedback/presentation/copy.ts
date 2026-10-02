/**
 * Feature-local bilingual copy for the Stitch "Feedback Improvement Console".
 *
 * `features/language/translations/{en,kn}.ts` are shared chrome-only files —
 * no new `t.*` keys may be added there — so every string introduced by this
 * design lives here instead (English + real Kannada).
 *
 * Content rules for this file:
 * - No fabricated claims: no statistics, no response-time SLAs, no badges the
 *   app cannot back. The side panel says only what actually happens — feedback
 *   is stored with the signed-in account and read by the project team.
 * - Nothing here touches the payload or validation of `POST /api/feedback`
 *   (`module`, `rating`, `comment?` are unchanged in `FeedbackForm`).
 * - Existing `t.feedback.*` / `t.common.*` keys are still used for every
 *   test-asserted string; this dictionary only covers the new design copy.
 */

export interface FeedbackGuideItem {
  title: string;
  body: string;
}

export interface FeedbackCopy {
  /** Breadcrumb gloss shown in the *other* language (design shows `(ಪ್ರತಿಕ್ರಿಯೆ)`). */
  crumbGloss: string;
  langPill: string;

  // ── Hero ──────────────────────────────────────────────────────────────────
  eyebrow: string;
  headline: string;
  /** Static Kannada line beneath the headline, as in the design. */
  kannadaSubline: string;
  lead: string;
  heroNote: string;

  // ── Console form chrome ───────────────────────────────────────────────────
  consoleEyebrow: string;
  moduleGloss: string;
  stepOne: string;
  stepTwo: string;
  submitGloss: string;
  submitNote: string;

  // ── Success state ─────────────────────────────────────────────────────────
  successKicker: string;
  successBody: string;
  continueExploring: string;

  // ── Side panel: response expectations ─────────────────────────────────────
  sideEyebrow: string;
  sideTitle: string;
  sideIntro: string;
  sidePoints: string[];

  // ── Guidance card ─────────────────────────────────────────────────────────
  guideEyebrow: string;
  guideCount: string;
  guideTitle: string;
  guideIntro: string;
  guideItems: FeedbackGuideItem[];

  // ── Emergency / help strip ────────────────────────────────────────────────
  emergencyLabel: string;
  emergencyTitle: string;
  emergencyBody: string;
  /** Word before the helpline number (composed with HELPLINE_CYBERCRIME). */
  emergencyDial: string;
  emergencyHelpline: string;
  emergencyCsc: string;
  emergencySource: string;

  // ── Privacy strip ─────────────────────────────────────────────────────────
  privacyTitle: string;
  privacyBody: string;
}

const KANNADA_SUBLINE =
  'ನಿಮ್ಮ ಅನಿಸಿಕೆ ನಮಗೆ ತಿಳಿಸಿ — ಇದರಿಂದ ಪ್ರತಿಯೊಂದು ಕುಟುಂಬಕ್ಕೂ ಸರಳವಾಗುತ್ತದೆ.';

export const copy: Record<'en' | 'kn', FeedbackCopy> = {
  en: {
    crumbGloss: 'ಪ್ರತಿಕ್ರಿಯೆ',
    langPill: 'ಕನ್ನಡ ಸಹ ಲಭ್ಯವಿದೆ',

    eyebrow: 'Feedback · ನಿಮ್ಮ ಅನಿಸಿಕೆ ತಿಳಿಸಿ',
    headline: 'Help us improve GramFinance.',
    kannadaSubline: KANNADA_SUBLINE,
    lead:
      'Tell us what worked, what was confusing, or what we could do better. Your feedback helps make financial information, government welfare rules, and fair credit access simpler for every Indian household.',
    heroNote:
      'Your feedback goes to the project team. We never ask for contact details, so there are no sales calls and no marketing follow-ups.',

    consoleEyebrow: 'Feedback console',
    moduleGloss: '(ಪ್ರತಿಕ್ರಿಯೆಯ ಪ್ರಕಾರ)',
    stepOne: 'Step 1 of 2',
    stepTwo: 'Step 2 of 2',
    submitGloss: '(ಪ್ರತಿಕ್ರಿಯೆ ಕಳುಹಿಸಿ)',
    submitNote: 'Takes less than a minute · No personal details needed',

    successKicker: 'ಧನ್ಯವಾದಗಳು',
    successBody:
      'Your feedback is saved with your account and read by the project team. It helps us decide what to clarify, fix or build next.',
    continueExploring: 'Continue exploring GramFinance',

    sideEyebrow: 'Response expectations',
    sideTitle: 'What happens with your feedback?',
    sideIntro:
      'Feedback is stored with your sign-in and read by the GramFinance project team. Here is what you can expect:',
    sidePoints: [
      'Read by the project team — every submission is reviewed, and similar reports are grouped together.',
      'Used to plan improvements — we cannot promise a date, but every report stays on the list.',
      'No personal reply — this is a small community project, so changes are announced through the app itself.',
    ],

    guideEyebrow: 'Guidance',
    guideCount: '5 areas',
    guideTitle: 'What can you tell us?',
    guideIntro:
      'Concrete details help us reproduce a problem and fix it. Tell us where you were and what you expected to happen.',
    guideItems: [
      {
        title: 'Something was confusing',
        body: 'Where you got stuck, wording that was hard to follow, or Kannada that felt unnatural.',
      },
      {
        title: 'Incorrect or outdated information',
        body: 'A figure, rule or explanation that looks wrong or has gone out of date.',
      },
      {
        title: 'A feature or tool idea',
        body: 'Something you wish GramFinance could do for your village or family.',
      },
      {
        title: 'Something that worked well',
        body: 'What gave you clarity, saved you a fee, or helped you question a bad deal.',
      },
      {
        title: 'Other observations',
        body: 'Accessibility barriers, slow loading, or unclear letters and fonts.',
      },
    ],

    emergencyLabel: 'Emergency safeguard',
    emergencyTitle: 'Need urgent help with a financial scam or debit?',
    emergencyBody:
      'This feedback console is not monitored as an emergency response desk. If money is leaving your account right now, act first through official channels:',
    emergencyDial: 'Dial',
    emergencyHelpline: '(Cyber Helpline)',
    emergencyCsc: 'Or visit local Grama One / CSC',
    emergencySource:
      'Direct official resource: National Cyber Crime Reporting Portal (cybercrime.gov.in)',

    privacyTitle: 'Share the problem, not personal details',
    privacyBody:
      'Do not include your Aadhaar number, bank or passbook details, OTPs, phone number or address. Describe what happened without personal information.',
  },

  kn: {
    crumbGloss: 'Feedback',
    langPill: 'English ಸಹ ಲಭ್ಯವಿದೆ',

    eyebrow: 'ಪ್ರತಿಕ್ರಿಯೆ · ನಿಮ್ಮ ಅನಿಸಿಕೆ ತಿಳಿಸಿ',
    headline: 'ಗ್ರಾಮ್ ಫೈನಾನ್ಸ್ ಅನ್ನು ಉತ್ತಮಗೊಳಿಸಲು ಸಹಾಯಿಸಿ.',
    kannadaSubline: KANNADA_SUBLINE,
    lead:
      'ಏನು ಸರಿಯಾಗಿದೆ, ಏನು ಅರ್ಥವಾಗಲಿಲ್ಲ, ಅಥವಾ ನಾವು ಏನು ಬೇರೆ ರೀತಿ ಮಾಡಬಹುದು ಎಂದು ತಿಳಿಸಿ. ನಿಮ್ಮ ಪ್ರತಿಕ್ರಿಯೆ ಆರ್ಥಿಕ ಮಾಹಿತಿ, ಸರ್ಕಾರಿ ಸವಲತ್ತಿನ ನಿಯಮಗಳು ಮತ್ತು ನ್ಯಾಯಯುತ ಸಾಲದ ಪ್ರವೇಶವನ್ನು ಪ್ರತಿಯೊಂದು ಭಾರತೀಯ ಕುಟುಂಬಕ್ಕೂ ಸರಳವಾಗಿಸಲು ಸಹಾಯ ಮಾಡುತ್ತದೆ.',
    heroNote:
      'ನಿಮ್ಮ ಪ್ರತಿಕ್ರಿಯೆ ಯೋಜನಾ ತಂಡಕ್ಕೆ ತಲುಪುತ್ತದೆ. ನಾವು ಸಂಪರ್ಕ ವಿವರಗಳನ್ನು ಕೇಳುವುದಿಲ್ಲ — ಆದ್ದರಿಂದ ಮಾರಾಟ ಕರೆಗಳೂ ಇಲ್ಲ, ಜಾಹೀರಾತು ಅನುಸರಣೆಯೂ ಇಲ್ಲ.',

    consoleEyebrow: 'ಪ್ರತಿಕ್ರಿಯೆ ಕನ್ಸೋಲ್',
    moduleGloss: '(Feedback topic)',
    stepOne: 'ಹಂತ 1 / 2',
    stepTwo: 'ಹಂತ 2 / 2',
    submitGloss: '(Send feedback)',
    submitNote: 'ಒಂದು ನಿಮಿಷದಲ್ಲಿ ಮುಗಿಯುತ್ತದೆ · ವೈಯಕ್ತಿಕ ವಿವರಗಳು ಬೇಕಿಲ್ಲ',

    successKicker: 'Thank you',
    successBody:
      'ನಿಮ್ಮ ಪ್ರತಿಕ್ರಿಯೆ ನಿಮ್ಮ ಖಾತೆಯೊಂದಿಗೆ ಸಂರಕ್ಷಿಸಲ್ಪಟ್ಟಿದೆ ಮತ್ತು ಯೋಜನಾ ತಂಡ ಓದುತ್ತದೆ. ಮುಂದೆ ಏನು ಸ್ಪಷ್ಟಪಡಿಸಬೇಕು, ಸರಿಪಡಿಸಬೇಕು ಅಥವಾ ರಚಿಸಬೇಕು ಎಂದು ತೀರ್ಮಾನಿಸಲು ಇದು ಸಹಾಯ ಮಾಡುತ್ತದೆ.',
    continueExploring: 'ಗ್ರಾಮ್ ಫೈನಾನ್ಸ್‌ನಲ್ಲಿ ಮುಂದುವರಿಸಿ',

    sideEyebrow: 'ಪ್ರತಿಕ್ರಿಯೆಯ ನಿರೀಕ್ಷೆಗಳು',
    sideTitle: 'ನಿಮ್ಮ ಪ್ರತಿಕ್ರಿಯೆಗೆ ಏನಾಗುತ್ತದೆ?',
    sideIntro:
      'ಪ್ರತಿಕ್ರಿಯೆ ನಿಮ್ಮ ಸೈನ್-ಇನ್‌ನೊಂದಿಗೆ ಸಂರಕ್ಷಿಸಲ್ಪಟ್ಟಿದೆ ಮತ್ತು ಗ್ರಾಮ್ ಫೈನಾನ್ಸ್ ಯೋಜನಾ ತಂಡ ಓದುತ್ತದೆ. ನೀವು ನಿರೀಕ್ಷಿಸಬಹುದಾದದ್ದು ಇಲ್ಲಿದೆ:',
    sidePoints: [
      'ಯೋಜನಾ ತಂಡ ಓದುತ್ತದೆ — ಪ್ರತಿಯೊಂದು ಪ್ರತಿಕ್ರಿಯೆಯನ್ನೂ ಪರಿಶೀಲಿಸಲಾಗುತ್ತದೆ, ಒಂದೇ ರೀತಿಯ ವರದಿಗಳನ್ನು ಒಟ್ಟುಗೂಡಿಸಲಾಗುತ್ತದೆ.',
      'ಸುಧಾರಣೆಗಳಿಗೆ ಬಳಸಲಾಗುತ್ತದೆ — ಬದಲಾವಣೆ ಯಾವಾಗ ಬರುತ್ತದೆ ಎಂದು ಭರವಸೆ ನೀಡಲಾಗದು, ಆದರೆ ಪ್ರತಿ ವರದಿಯೂ ಪಟ್ಟಿಯಲ್ಲಿ ಉಳಿಯುತ್ತದೆ.',
      'ವೈಯಕ್ತಿಕ ಉತ್ತರ ಇರುವುದಿಲ್ಲ — ಇದು ಚಿಕ್ಕ ಸಮುದಾಯ ಯೋಜನೆ; ಆದ್ದರಿಂದ ಬದಲಾವಣೆಗಳನ್ನು ಅಪ್ಲಿಕೇಶನ್‌ನಲ್ಲಿಯೇ ತಿಳಿಸಲಾಗುತ್ತದೆ.',
    ],

    guideEyebrow: 'ಮಾರ್ಗದರ್ಶನ',
    guideCount: '5 ವಿಷಯಗಳು',
    guideTitle: 'ನೀವು ಏನು ತಿಳಿಸಬಹುದು?',
    guideIntro:
      'ನಿಖರ ವಿವರಗಳು ಸಮಸ್ಯೆಯನ್ನು ಮರುಕಳಿಸಿ ಸರಿಪಡಿಸಲು ಸಹಾಯ ಮಾಡುತ್ತವೆ. ನೀವು ಎಲ್ಲಿದ್ದಿರಿ ಮತ್ತು ಏನು ನಿರೀಕ್ಷಿಸಿದ್ದಿರಿ ಎಂದು ತಿಳಿಸಿ.',
    guideItems: [
      {
        title: 'ಏನೋ ಅರ್ಥವಾಗಲಿಲ್ಲ',
        body: 'ಎಲ್ಲಿ ಸಿಕ್ಕಿಹಾಕಿಕೊಂಡಿರಿ, ಅರ್ಥಮಾಡಿಕೊಳ್ಳಲು ಕಷ್ಟವಾದ ಪದಗಳು, ಅಥವಾ ಸಹಜವಲ್ಲದ ಕನ್ನಡ.',
      },
      {
        title: 'ತಪ್ಪು ಅಥವಾ ಹಳೆಯ ಮಾಹಿತಿ',
        body: 'ತಪ್ಪಾಗಿರಬಹುದು ಅಥವಾ ಹಳೆಯದಾಗಿರಬಹುದಾದ ಸಂಖ್ಯೆ, ನಿಯಮ ಅಥವಾ ವಿವರಣೆ.',
      },
      {
        title: 'ಹೊಸ ಸೌಲಭ್ಯ ಅಥವಾ ಸಲಹೆ',
        body: 'ನಿಮ್ಮ ಊರಿಗೆ ಅಥವಾ ಕುಟುಂಬಕ್ಕೆ ಗ್ರಾಮ್ ಫೈನಾನ್ಸ್ ಏನು ಮಾಡಬಹುದು ಎಂದು ನಿಮಗೆ ಅನಿಸುತ್ತದೆ.',
      },
      {
        title: 'ಒಳ್ಳೆಯದಾದದ್ದು',
        body: 'ಯಾವುದು ಸ್ಪಷ್ಟತೆ ನೀಡಿತು, ಶುಲ್ಕ ಉಳಿಸಿತು, ಅಥವಾ ಕೆಟ್ಟ ಒಪ್ಪಂದವನ್ನು ಪ್ರಶ್ನಿಸಲು ಸಹಾಯ ಮಾಡಿತು.',
      },
      {
        title: 'ಇತರೆ ಗಮನ',
        body: 'ಪ್ರವೇಶದ ತೊಂದರೆ, ನಿಧಾನವಾಗಿ ಲೋಡ್ ಆಗುವುದು, ಅಥವಾ ಅಕ್ಷರಗಳ ಅಸ್ಪಷ್ಟತೆ.',
      },
    ],

    emergencyLabel: 'ತುರ್ತು ರಕ್ಷಣೆ',
    emergencyTitle: 'ಹಣಕಾಸು ವಂಚನೆ ಅಥವಾ ಡೆಬಿಟ್ ಬಗ್ಗೆ ತುರ್ತು ಸಹಾಯ ಬೇಕೇ?',
    emergencyBody:
      'ಈ ಪ್ರತಿಕ್ರಿಯೆ ಕನ್ಸೋಲ್ ತುರ್ತು ಸಹಾಯ ಕೇಂದ್ರವಲ್ಲ. ಈಗ ನಿಮ್ಮ ಖಾತೆಯಿಂದ ಹಣ ಹೋಗುತ್ತಿದ್ದರೆ, ಮೊದಲು ಅಧಿಕೃತ ಮಾರ್ಗದಲ್ಲಿ ಕ್ರಮ ತೆಗೆದುಕೊಳ್ಳಿ:',
    emergencyDial: 'ಕರೆ ಮಾಡಿ',
    emergencyHelpline: '(ಸೈಬರ್ ಸಹಾಯವಾಣಿ)',
    emergencyCsc: 'ಅಥವಾ ಹತ್ತಿರದ ಗ್ರಾಮ ಒನ್ / CSC ಭೇಟಿ ಮಾಡಿ',
    emergencySource:
      'ಅಧಿಕೃತ ಮೂಲ: ರಾಷ್ಟ್ರೀಯ ಸೈಬರ್ ಅಪರಾಧ ವರದಿ ಪೋರ್ಟಲ್ (cybercrime.gov.in)',

    privacyTitle: 'ಸಮಸ್ಯೆಯನ್ನು ತಿಳಿಸಿ, ವೈಯಕ್ತಿಕ ವಿವರವನ್ನಲ್ಲ',
    privacyBody:
      'ಆಧಾರ್ ಸಂಖ್ಯೆ, ಬ್ಯಾಂಕ್ ಅಥವಾ ಪಾಸ್‌ಬುಕ್ ವಿವರ, OTP, ಫೋನ್ ಸಂಖ್ಯೆ ಅಥವಾ ವಿಳಾಸವನ್ನು ಬರೆಯಬೇಡಿ. ವೈಯಕ್ತಿಕ ಮಾಹಿತಿ ಇಲ್ಲದೆ ಏನಾಯಿತೆಂದು ವಿವರಿಸಿ.',
  },
};
