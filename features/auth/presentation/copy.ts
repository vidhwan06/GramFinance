/**
 * Bilingual copy for the lightweight anonymous session feature.
 *
 * Feature-local, matching the convention used by `features/feedback` and
 * `features/schemes`: shared chrome lives in
 * `features/language/translations/{en,kn}.ts`, and everything introduced by a
 * feature lives here. Only the header/menu labels go into the shared files,
 * because the header and mobile menu read `t.nav.*`.
 *
 * ── The honesty rule for this file ──────────────────────────────────────────
 * GramFinance creates a lightweight anonymous session. It is NOT an account.
 * Nothing here may imply otherwise. Specifically, no copy may promise:
 *   * that feedback is tied to a person the user can return to;
 *   * that there is anything to sign in to, or a profile to keep;
 *   * that data follows the user across devices (it does not);
 *   * that the session is an identity in any civic or banking sense.
 *
 * The wording instead says exactly what happens: a temporary session is created
 * so the app can attach this one piece of feedback to something, and clearing
 * the browser ends it. There are no fabricated benefits — no "your data is
 * safe", no "we never share your information" — because the app has no privacy
 * posture of its own to back such a claim. What is true is the RLS design and
 * the absence of any personal data, and that is what the copy says.
 */

export interface AuthCopy {
  /** Header / mobile menu control while signed out. */
  signIn: string;

  /** Loading state on the sign-in control. */
  signingIn: string;

  /** Header / mobile menu control while signed in. */
  signOut: string;

  /** Loading state on the sign-out control. */
  signingOut: string;

  /** Sign-in page: main heading. */
  pageTitle: string;

  /** Sign-in page: the one-line explanation above the Continue button. */
  pageLead: string;

  /** Sign-in page: heading of the "what this is / is not" panel. */
  pageAboutTitle: string;

  /** Sign-in page: the "what this is" bullet. */
  pageAboutIs: string;

  /** Sign-in page: the "what this is not" bullet. */
  pageAboutIsNot: string;

  /** Sign-in page: privacy note under the button. */
  pagePrivacy: string;

  /** Sign-in page: shown when the session could not be created. */
  pageError: string;

  /** Sign-in page: leave without signing in. */
  pageBack: string;

  /** Notice on /feedback before the user has submitted anything. */
  feedbackNoticeTitle: string;

  /** Notice body — explains the session in one sentence. */
  feedbackNoticeBody: string;

  /** The unauthorized state after a 401: the sign-in control's label. */
  retryAfterSignIn: string;
}

export const authCopy: Record<'en' | 'kn', AuthCopy> = {
  en: {
    signIn: 'Continue',
    signingIn: 'Starting...',
    signOut: 'Sign out',
    signingOut: 'Signing out...',

    pageTitle: 'Continue without an account',
    pageLead:
      'To send feedback, GramFinance creates a short-lived session on this device. One tap — no email, no password, no phone number.',
    pageAboutTitle: 'What this does and does not do',
    pageAboutIs:
      'Creates a temporary session so your feedback can be attached to something on our side, and stored under rules only that session can read.',
    pageAboutIsNot:
      'It is not an account. There is no profile, no password, and no way to sign back in on another device.',
    pagePrivacy:
      'We do not ask for your name, phone number or email. Clearing your browser data ends the session.',
    pageError:
      'We could not start a session just now. Everything else on GramFinance still works without one — please try again in a moment.',
    pageBack: 'Back to home',

    feedbackNoticeTitle: 'Sign in to submit feedback',
    feedbackNoticeBody:
      'A one-tap session is needed to send feedback. You do not need an email address or a password.',
    retryAfterSignIn: 'Continue and send',
  },

  kn: {
    signIn: 'ಮುಂದುವರಿಸಿ',
    signingIn: 'ಪ್ರಾರಂಭವಾಗುತ್ತಿದೆ...',
    signOut: 'ಸೈನ್ ಔಟ್ ಮಾಡಿ',
    signingOut: 'ಸೈನ್ ಔಟ್ ಆಗುತ್ತಿದೆ...',

    pageTitle: 'ಖಾತೆ ರಹಿತವಾಗಿ ಮುಂದುವರಿಸಿ',
    pageLead:
      'ಅಭಿಪ್ರಾಯ ಕಳುಹಿಸಲು, GramFinance ಈ ಸಾಧನದಲ್ಲೇ ಒಂದು ತಾತ್ಕಾಲಿಕ ಸೆಷನ್ ರಚಿಸುತ್ತದೆ. ಒಂದು ಒತ್ತಿಗೆ — ಇಮೇಲ್ ಇಲ್ಲ, ಪಾಸ್‌ವರ್ಡ್ ಇಲ್ಲ, ದೂರವಾಣಿ ಸಂಖ್ಯೆ ಇಲ್ಲ.',
    pageAboutTitle: 'ಇದು ಏನು ಮಾಡುತ್ತದೆ ಮತ್ತು ಏನು ಮಾಡುವುದಿಲ್ಲ',
    pageAboutIs:
      'ನಿಮ್ಮ ಅಭಿಪ್ರಾಯವನ್ನು ನಮ್ಮ ಬದಿಯಲ್ಲಿ ಏನಿಗೆ ಜೋಡಿಸಲು ಒಂದು ತಾತ್ಕಾಲಿಕ ಸೆಷನ್ ರಚಿಸುತ್ತದೆ, ಮತ್ತು ಅದನ್ನು ಓದಬಲ್ಲದ ನಿಯಮಗಳಿಂದ ಸಂಗ್ರಹಿಸುತ್ತದೆ.',
    pageAboutIsNot:
      'ಇದು ಖಾತೆ ಅಲ್ಲ. ಪ್ರೊಫೈಲ್ ಇಲ್ಲ, ಪಾಸ್‌ವರ್ಡ್ ಇಲ್ಲ, ಮತ್ತು ಬೇರೆ ಸಾಧನದಲ್ಲಿ ಮತ್ತೆ ಸೈನ್-ಇನ್ ಮಾಡಲು ಮಾರ್ಗವಿಲ್ಲ.',
    pagePrivacy:
      'ನಿಮ್ಮ ಹೆಸರು, ದೂರವಾಣಿ ಸಂಖ್ಯೆ ಅಥವಾ ಇಮೇಲ್ ನಾವು ಕೇಳುವುದಿಲ್ಲ. ನಿಮ್ಮ ಬ್ರೌಸರ್ ಡೇಟಾ ಅಳಿಸಿದರೆ ಸೆಷನ್ ಮುಗಿಯುತ್ತದೆ.',
    pageError:
      'ಈಗ ಸೆಷನ್ ಪ್ರಾರಂಭಿಸಲಾಗಲಿಲ್ಲ. ಸೆಷನ್ ಇಲ್ಲದೆಯೂ GramFinance ನಿನ್ನ ಉಳಿದ ಎಲ್ಲವೂ ಕೆಲಸ ಮಾಡುತ್ತದೆ — ದಯವಿಟ್ಟು ಸ್ವಲ್ಪ ನಂತರ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
    pageBack: 'ಮುಖಪುಟಕ್ಕೆ',

    feedbackNoticeTitle: 'ಅಭಿಪ್ರಾಯ ಸಲ್ಲಿಸಲು ಸೈನ್-ಇನ್ ಮಾಡಿ',
    feedbackNoticeBody:
      'ಅಭಿಪ್ರಾಯ ಕಳುಹಿಸಲು ಒಂದು ಒತ್ತಿಗೆಯ ಸೆಷನ್ ಬೇಕು. ಇಮೇಲ್ ಅಥವಾ ಪಾಸ್‌ವರ್ಡ್ ಅಗತ್ಯವಿಲ್ಲ.',
    retryAfterSignIn: 'ಮುಂದುವರಿಸಿ ಕಳುಹಿಸಿ',
  },
};
