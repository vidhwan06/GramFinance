/**
 * Feature-local bilingual copy for the "Ask GramFinance" assistant page.
 *
 * Lives here (not in features/language/translations/**) so the chrome-only
 * translation files stay untouched. The page reads shared assistant strings
 * from `t.assistant.*` and pulls only NEW copy from this dictionary.
 *
 * All strings must stay factual and non-promotional: the assistant is
 * informational and not an authority, and no capability may be claimed that
 * the app does not actually have.
 */
export const assistantCopy = {
  en: {
    eyebrow: 'Public Interest Advisory Console',
    tagline: 'Clear answers for everyday money decisions.',
    doctrineTitle: 'How this assistant works',
    doctrineBody:
      'It explains financial concepts in simple language and points you to the right tool in this app.',
    doctrinePoints: [
      'Information only — it is not an authority.',
      'It never asks for your OTP, PIN or password.',
      'Confirm important claims with the official department.',
    ],
    youLabel: 'You',
    assistantName: 'GramFinance Guide',
    assistantBadge: 'Informational answer',
    advisoryPill: 'Advisory only',
    emptyHint: 'Type your question below to get started.',
    deferralLabel: 'Related tool in this app',
    sendLabel: 'Ask Guide',
    clearLabel: 'Clear',
    keyboardHint: 'Press Enter to send',
    footnote: 'Answers are for learning — confirm with official sources.',
    helplineLabel: 'Cybercrime helpline',
  },
  kn: {
    eyebrow: 'ಸಾರ್ವಜನಿಕ ಹಿತ ಸಲಹಾ ಕನ್ಸೋಲ್',
    tagline: 'ದೈನಂದಿನ ಹಣಕಾಸು ನಿರ್ಧಾರಗಳಿಗೆ ಸ್ಪಷ್ಟ ಉತ್ತರಗಳು.',
    doctrineTitle: 'ಈ ಸಹಾಯಕ ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ',
    doctrineBody:
      'ಇದು ಹಣಕಾಸು ಪರಿಕಲ್ಪನೆಗಳನ್ನು ಸರಳ ಭಾಷೆಯಲ್ಲಿ ವಿವರಿಸುತ್ತದೆ ಮತ್ತು ಈ ಆ್ಯಪ್‌ನಲ್ಲಿ ಸರಿಯಾದ ಪರಿಕರಕ್ಕೆ ಮಾರ್ಗದರ್ಶನ ನೀಡುತ್ತದೆ.',
    doctrinePoints: [
      'ಕೇವಲ ಮಾಹಿತಿಗಾಗಿ — ಇದು ಅಧಿಕಾರವಲ್ಲ.',
      'ಒಟಿಪಿ, ಪಿನ್ ಅಥವಾ ಪಾಸ್‌ವರ್ಡ್ ಕೇಳುವುದಿಲ್ಲ.',
      'ಮುಖ್ಯ ಮಾಹಿತಿಯನ್ನು ಅಧಿಕೃತ ಇಲಾಖೆಯಲ್ಲಿ ದೃಢೀಕರಿಸಿ.',
    ],
    youLabel: 'ನೀವು',
    assistantName: 'ಗ್ರಾಮ್‌ಫೈನಾನ್ಸ್ ಮಾರ್ಗದರ್ಶಿ',
    assistantBadge: 'ಮಾಹಿತಿ ಉತ್ತರ',
    advisoryPill: 'ಕೇವಲ ಸಲಹೆ',
    emptyHint: 'ಪ್ರಾರಂಭಿಸಲು ಕೆಳಗೆ ನಿಮ್ಮ ಪ್ರಶ್ನೆ ಬರೆಯಿರಿ.',
    deferralLabel: 'ಸಂಬಂಧಿತ ಪರಿಕರ',
    sendLabel: 'ಮಾರ್ಗದರ್ಶಿಗೆ ಕೇಳಿ',
    clearLabel: 'ಅಳಿಸಿ',
    keyboardHint: 'ಕಳುಹಿಸಲು Enter ಒತ್ತಿ',
    footnote: 'ಉತ್ತರಗಳು ಕಲಿಯಲು ಮಾತ್ರ — ಅಧಿಕೃತ ಮೂಲಗಳಲ್ಲಿ ದೃಢೀಕರಿಸಿ.',
    helplineLabel: 'ಸೈಬರ್ ಅಪರಾಧ ಸಹಾಯವಾಣಿ',
  },
};
