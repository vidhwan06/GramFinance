export const en = {
  appName: 'GramFinance',
  appTagline: 'Understand. Verify. Decide Safely.',
  nav: {
    home: 'Home',
    learn: 'Learn',
    loan: 'Loan Calculator',
    check: 'Check Message',
    schemes: 'Support Schemes',
    assistant: 'AI Assistant',
    feedback: 'Feedback',
  },
  common: {
    loading: 'Loading...',
    error: 'An error occurred',
    retry: 'Try Again',
    back: 'Back',
    submit: 'Submit',
    selectLanguage: 'Select Language',
    english: 'English',
    kannada: 'ಕನ್ನಡ',
    offline: 'You are currently offline. Some live features may be limited.',
    helplineNotice: 'National Cybercrime Helpline: 1930',
  },
  loan: {
    comparison: {
      openBtn: 'Compare Side-by-Side with Another Loan Option',
      cardTitle: 'Side-by-Side Loan Comparison',
      copyBtn: 'Copy A → B',
      optionA: 'Option A',
      optionB: 'Option B',
      baseline: 'Baseline',
      alternative: 'Alternative',
      principal: 'Principal (₹)',
      rate: 'Annual Rate (%)',
      tenure: 'Tenure (Months)',
      method: 'Interest Method',
      reducingBalance: 'Reducing Balance',
      flatRate: 'Flat Rate',
      metricCol: 'Comparison Metric',
      diffCol: 'Difference (B - A)',
      emiRow: 'Initial Monthly EMI',
      interestRow: 'Total Interest Payable',
      outflowRow: 'Total Cash Outflow',
    },
  },
  home: {
    welcomeTitle: 'GramFinance',
    welcomeSubtitle: 'A Digital Financial Safety & Literacy Platform for Rural Households',
    cards: {
      check: {
        title: 'Check Before You Pay',
        desc: 'Scan suspicious messages or payment requests before acting.',
      },
      loan: {
        title: 'Understand a Loan',
        desc: 'Calculate total interest and real EMI costs upfront.',
      },
      schemes: {
        title: 'Find Financial Support',
        desc: 'Discover relevant official government assistance schemes.',
      },
      learn: {
        title: 'Financial Learning',
        desc: 'Master banking, saving, insurance, and fraud awareness.',
      },
      assistant: {
        title: 'Ask Financial Assistant',
        desc: 'Get plain-language answers to financial questions.',
      },
    },
  },
};

export type TranslationKeys = typeof en;
