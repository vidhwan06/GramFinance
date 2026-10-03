/**
 * Bilingual copy for the admin feedback dashboard.
 *
 * Feature-local, matching `features/auth/presentation/copy.ts` and
 * `features/feedback/presentation/copy.ts`: shared chrome goes in
 * `features/language/translations/{en,kn}.ts`, anything a feature introduces
 * goes here. The dashboard adds no shared-chrome strings, so nothing was added
 * to the translation files.
 *
 * ── The honesty rule ────────────────────────────────────────────────────────
 * This is an internal review tool. The copy must not overclaim:
 *   * nothing here implies the dashboard can act on feedback — it cannot delete,
 *     reply, or mark anything as handled, so it says "review", never "resolve";
 *   * the average rating is described as an average, not a score or a grade;
 *   * a module label is a place in the app, not a verdict on who wrote it.
 *
 * It also must not suggest this area is secret. The page tells an unauthorized
 * visitor plainly that they need access, rather than pretending the page does not
 * exist — a 404 would be a worse answer than an honest refusal, because it sends
 * an administrator looking for a broken link.
 */

export interface AdminFeedbackCopy {
  /** Page title. */
  pageTitle: string;
  /** One line under the title explaining what this page is. */
  pageLead: string;

  /** Summary card: how many submissions in total. */
  totalSubmissions: string;
  /** Summary card: mean rating. */
  averageRating: string;
  /** Shown instead of a number when there are no submissions yet. */
  noAverageYet: string;
  /** "out of 5" suffix on the average. */
  outOfFive: string;

  /** Heading above the 1–5 breakdown. */
  distributionTitle: string;
  /** Accessible label for a single distribution row. */
  distributionRowLabel: string;

  /** Feedback list heading. */
  listTitle: string;
  /** Column heading: rating. */
  columnRating: string;
  /** Column heading: the message. */
  columnMessage: string;
  /** Column heading: which part of the app. */
  columnModule: string;
  /** Column heading: when it arrived. */
  columnDate: string;

  /** Placeholder for a rating-only submission with no comment. */
  noComment: string;

  /** Empty state heading. */
  emptyTitle: string;
  /** Empty state body. */
  emptyBody: string;

  /** Loading state. */
  loading: string;
  /** Error state heading. */
  errorTitle: string;
  /** Retry control on the error state. */
  retry: string;

  /** Pagination: "Page X of Y". */
  pageOf: string;
  /** Previous page control. */
  previous: string;
  /** Next page control. */
  next: string;

  /** Shown to a signed-out visitor. */
  signedOutTitle: string;
  /** Shown to a signed-in visitor without the admin role. */
  notAdminTitle: string;
  /** Shared body for both refusals. */
  notAuthorisedBody: string;
  /** Escape route out of the refusal. */
  backToHome: string;

  /** Label for a rating value, e.g. "4 out of 5". */
  ratingLabel: string;
}

export const adminFeedbackCopy: Record<'en' | 'kn', AdminFeedbackCopy> = {
  en: {
    pageTitle: 'Feedback',
    pageLead:
      'What people sent through the feedback form, newest first. For review only — nothing here can be edited or removed.',

    totalSubmissions: 'Total submissions',
    averageRating: 'Average rating',
    noAverageYet: 'No ratings yet',
    outOfFive: 'out of 5',

    distributionTitle: 'How the ratings are spread',
    distributionRowLabel: '{count} of {total} gave {rating} stars',

    listTitle: 'Submissions',
    columnRating: 'Rating',
    columnMessage: 'Message',
    columnModule: 'Part of the app',
    columnDate: 'Received',

    noComment: 'No message — rating only.',

    emptyTitle: 'No feedback yet',
    emptyBody:
      'Nothing has been submitted through the feedback form. Anything sent will appear here.',

    loading: 'Loading feedback...',
    errorTitle: 'Could not load feedback',
    retry: 'Try again',

    pageOf: 'Page {page} of {total}',
    previous: 'Previous',
    next: 'Next',

    signedOutTitle: 'Sign in required',
    notAdminTitle: 'You do not have access',
    notAuthorisedBody:
      'This page is for administrators. Ask someone who manages the project if you need to see submitted feedback.',
    backToHome: 'Back to home',

    ratingLabel: '{rating} out of 5',
  },

  kn: {
    pageTitle: 'ಅಭಿಪ್ರಾಯಗಳು',
    pageLead:
      'ಅಭಿಪ್ರಾಯ ಫಾರ್ಮ್ ಮೂಲಕ ಬರುವ ಎಲ್ಲವೂ, ಹೊಸದಿನವು ಮೊದಲು. ಪರಿಶೀಲನೆಗೆ ಮಾತ್ರ — ಇಲ್ಲಿ ಏನನ್ನೂ ಬದಲಾಯಿಸಲು ಅಥವಾ ತೆಗೆದುಹಾಕಲು ಸಾಧ್ಯವಿಲ್ಲ.',

    totalSubmissions: 'ಒಟ್ಟು ಸಲಗಿಕೆಗಳು',
    averageRating: 'ಸರಾಸರಿ ರೇಟಿಂಗ್',
    noAverageYet: 'ಇನ್ನೂ ರೇಟಿಂಗ್ ಇಲ್ಲ',
    outOfFive: '5 ರಲ್ಲಿ',

    distributionTitle: 'ರೇಟಿಂಗ್‌ಗಳ ವಿಭಜನೆ',
    distributionRowLabel: '{total} ರಲ್ಲಿ {count} ಜನರು {rating} ನಕ್ಷತ್ರ ನೀಡಿದ್ದಾರೆ',

    listTitle: 'ಸಲಗಿಕೆಗಳು',
    columnRating: 'ರೇಟಿಂಗ್',
    columnMessage: 'ಸಂದೇಶ',
    columnModule: 'ಅಪ್ಲಿಕೇಶನ್‌ನ ಭಾಗ',
    columnDate: 'ಸಿಕ್ತದಿನೆ',

    noComment: 'ಸಂದೇಶವಿಲ್ಲ — ಕೇವಲ ರೇಟಿಂಗ್.',

    emptyTitle: 'ಇನ್ನೂ ಅಭಿಪ್ರಾಯವಿಲ್ಲ',
    emptyBody:
      'ಅಭಿಪ್ರಾಯ ಫಾರ್ಮ್ ಮೂಲಕ ಇನ್ನೂ ಏನೂ ಸಲಲಿಸಲಾಗಿಲ್ಲ. ಏನಾದರೂ ಬಂದಾಗ ಅದು ಇಲ್ಲಿ ಕಾಣುತ್ತದೆ.',

    loading: 'ಅಭಿಪ್ರಾಯಗಳನ್ನು ಲೋಡ್ ಮಾಡಲಾಗುತ್ತಿದೆ...',
    errorTitle: 'ಅಭಿಪ್ರಾಯಗಳನ್ನು ಲೋಡ್ ಮಾಡಲಾಗಲಿಲ್ಲ',
    retry: 'ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ',

    pageOf: 'ಪುಟ {page} / {total}',
    previous: 'ಹಿಂದಿನದು',
    next: 'ಮುಂದಿನದು',

    signedOutTitle: 'ಸೈನ್-ಇನ್ ಅಗತ್ಯ',
    notAdminTitle: 'ನಿಮ್ಮಗೆ ಪ್ರವೇಶ ಇಲ್ಲ',
    notAuthorisedBody:
      'ಈ ಪುಟ ನಿರ್ವಹಕರಿಗೆ. ಸಲಲಿಸಿದ ಅಭಿಪ್ರಾಯಗಳನ್ನು ನೋಡಬೇಕಾದರೆ ಯೋಜನೆ ನಿರ್ವಹಿಸುವವರಿಗೆ ಕೋರಿ.',
    backToHome: 'ಮುಖಪುಟಕ್ಕೆ',

    ratingLabel: '5 ರಲ್ಲಿ {rating}',
  },
};