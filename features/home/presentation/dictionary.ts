/**
 * Homepage copy for the final Stitch composition — bilingual, feature-local.
 *
 * The English block is the primary editorial voice of the design; `sub` lines
 * intentionally carry the *opposite* language so the mixed-script signature of
 * the Stitch pages (English headline + Kannada subline, and vice versa) holds
 * in both language modes.
 *
 * Product-claim rule: nothing here states a figure or credential the product
 * cannot back with live data. Counts, dates and scheme names are rendered
 * dynamically in the page; static copy stays general and true.
 */
export const homeCopy = {
  en: {
    hero: {
      eyebrow: 'Public Interest Financial Utility • No Brokerage • Verified Sources',
      title: 'Make better money decisions.',
      sub: 'ಹಣಕಾಸಿನ ಸರಿಯಾದ ನಿರ್ಧಾರಗಳನ್ನು ಸ್ಪಷ್ಟವಾಗಿ ಅರ್ಥಮಾಡಿಕೊಳ್ಳಿ.',
      lead:
        'GramFinance helps Indian families understand government welfare entitlements, real borrowing costs, and digital scam threats — explained simply, without commissions, ads, or algorithmic confusion.',
      ctaPrimary: 'Explore schemes',
      ctaSecondary: 'Check a suspicious message',
      meta1: 'Verified against official sources',
      meta2: 'Loan maths runs in your browser',
    },
    record: {
      label: 'Public Verification Engine',
      version: 'v2026',
      step1Title: 'Verified Scheme Records',
      step1DescLive: (n: number) =>
        `${n} scheme${n === 1 ? '' : 's'} listed with official source links and last-verified dates.`,
      step1DescLoading:
        'Loading verified scheme records from the official catalogue.',
      step2Title: 'Private by Design',
      step2Desc:
        'Calculations run on your device. We keep no profile of you.',
      step3Title: 'Free — No Commissions',
      step3Desc:
        'Every scheme, check and calculator here is free. Nothing is sold to you.',
      step3Chip: 'Zero Fees',
      ledgerLeft: 'Rule-based • Official sources',
      ledgerRight: 'ZERO BROKERAGE',
    },
    dest: {
      eyebrow: 'Independent Civic Gateways',
      heading: 'What do you need help with?',
      headingSub: 'ನಿಮಗೆ ಬೇಕಾದ ಸೇವೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ.',
      intro:
        'Four independent gateways. Direct answers, checked calculations, and no commercial referrals.',
    },
    tile1: {
      eyebrow: 'Union & State Support Schemes',
      title: 'Find Government Support',
      desc:
        'Central and state welfare schemes turned into plain checklists — who qualifies, which documents are needed, and what the official source actually says.',
      chipLabel: 'For',
      meta: 'Updated from official scheme records',
      cta: 'Explore all schemes',
      empty: 'Verified schemes appear here once the catalogue loads.',
    },
    tile2: {
      eyebrow: 'Digital Fraud Inspector',
      title: 'Stay Safe & Inspect Scams',
      desc:
        'Check suspicious SMS, WhatsApp messages and loan offers before you tap a link or share an OTP.',
      insetLabel: 'Common warning sign',
      insetText:
        'Urgent payment demands, requests for an OTP, or a “fee” to release a government benefit.',
      meta: 'Cybercrime helpline 1930',
      cta: 'Inspect a message',
    },
    tile3: {
      eyebrow: 'Plain Borrowing Economics',
      title: 'Understand what borrowing actually costs',
      desc:
        'A low EMI can hide a long tenure and heavy total interest. See the full cost before you sign.',
      exLabel: 'Example',
      leftLabel: 'Pitched rate',
      leftValue: '1% flat / month',
      rightLabel: 'Real reducing cost',
      rightValue: '≈ 21.5% / year',
      meta: 'Total cost shown before you commit',
      cta: 'Calculate loan cost',
    },
    tile4: {
      eyebrow: 'Bilingual Assistance • Official Sources',
      title: 'Ask GramFinance',
      desc:
        'Ask any household financial question in everyday Kannada or English — answered simply, from official sources.',
      pills: [
        '“How is my EMI calculated?”',
        '“Is this message a scam?”',
        '“Which schemes apply to farmers?”',
      ],
      meta: 'Your conversations are never used for training',
      cta: 'Start conversation',
    },
    transparency: {
      eyebrow: 'Decision Transparency',
      heading: 'We don’t just give you an answer. We explain the reasoning.',
      lead:
        'Every estimate shows the conditions behind it, so you walk into the Grama One centre or the bank fully prepared — with no middlemen.',
      cardEyebrow: 'Published Scheme Record',
      cardAmountLabel: 'Last verified',
      activePill: 'Active scheme',
      checkWho: 'Who it is for',
      checkWhere: 'Where it applies',
      checkWhen: 'When it was verified',
      noGroups: 'No target groups listed',
      allStates: 'All states and union territories',
      loading: 'Loading scheme records…',
      empty:
        'Scheme records appear here once the official catalogue loads.',
      infoLabel: 'Before you apply',
      infoText:
        'Check your eligibility online first, then carry your documents and the official conditions with you.',
      cardCta: 'View full scheme details',
      photoAlt:
        'A shop owner in Karnataka smiling at his counter beside a UPI payment stand',
      photoOverlay: 'Guidance in Kannada & English',
      m1l: 'Eligibility checks are rule-based',
      m2l: 'Commission taken',
      m3l: 'Trackers or ad logs',
    },
    trust: {
      pill: 'Public Trust Framework',
      heading: 'Clear information. Transparent reasoning. Zero commercial interest.',
      lead:
        'GramFinance is not a lender, a lead generator or a lending-app affiliate. Nothing you see here is paid for.',
      p1t: 'Verified at Source',
      p1d:
        'Scheme details, deadlines and official links come from government sources and carry a last-verified date.',
      p1m: 'Official sources, dated and re-checked',
      p2t: 'Explainable by Default',
      p2d:
        'No black-box scores. An eligibility check shows which condition matched, which failed and which information is missing.',
      p2m: 'Rule-based results you can read',
      p3t: 'Privacy by Design',
      p3d:
        'Loan calculations run in your browser. We do not build a profile of you, and we never sell data.',
      p3m: 'No profiling, no data sales',
      endorse:
        'Made for village digital centres, self-help groups and everyday households.',
      license: 'PUBLIC INTEREST • 2026',
    },
    closing: {
      eyebrow: 'Direct Entry',
      heading: 'Ready to start?',
      headingSub: 'ನಿಮಗೆ ಬೇಕಾದ ಸೇವೆಯನ್ನು ಪ್ರಾರಂಭಿಸಿ.',
      lead:
        'Pick a gateway below to begin. Everything here is free, rule-based and open — with no sponsorship.',
      noAccount: 'No account signup or phone verification required.',
      rows: [
        {
          t: 'Search schemes for your household',
          d: 'Filter by occupation, landholding and family profile',
          href: '/schemes',
        },
        {
          t: 'Inspect a suspicious message now',
          d: 'Spot the warning signs before you share an OTP or approve a UPI request',
          href: '/check',
        },
        {
          t: 'Calculate what a loan really costs',
          d: 'Total interest, fees, tenure and prepayment effects',
          href: '/loan',
        },
        {
          t: 'Ask a question in Kannada or English',
          d: 'Simple explanations grounded in official sources',
          href: '/assistant',
        },
      ],
      footnote:
        'A free, non-commercial utility. No tracking pixels. No marketing analytics.',
      chip: 'OPEN • FREE • NON-COMMERCIAL',
    },
  },
  kn: {
    hero: {
      eyebrow: 'ಸಾರ್ವಜನಿಕ ಹಿತಾಸಕ್ತಿ ಹಣಕಾಸು ಸೇವೆ • ಬ್ರೋಕರೇಜ್ ಇಲ್ಲ • ಪರಿಶೀಲಿತ ಮೂಲಗಳು',
      title: 'ಹಣದ ಬಗ್ಗೆ ಸರಿಯಾದ ನಿರ್ಧಾರ ತೆಗೆದುಕೊಳ್ಳಿ.',
      sub: 'Make better money decisions.',
      lead:
        'ಗ್ರಾಮ್‌ಫೈನಾನ್ಸ್ ಭಾರತೀಯ ಕುಟುಂಬಗಳಿಗೆ ಸರ್ಕಾರಿ ನೆರವು ಯೋಜನೆಗಳು, ನಿಜವಾದ ಸಾಲದ ವೆಚ್ಚ ಮತ್ತು ಡಿಜಿಟಲ್ ವಂಚನೆಗಳನ್ನು ಅರ್ಥಮಾಡಿಕೊಳ್ಳಲು ಸಹಾಯ ಮಾಡುತ್ತದೆ — ಕಮಿಷನ್, ಜಾಹೀರಾತು ಅಥವಾ ಗೊಂದಲವಿಲ್ಲದೆ, ಸರಳ ಭಾಷೆಯಲ್ಲಿ ವಿವರಿಸಲಾಗಿದೆ.',
      ctaPrimary: 'ಯೋಜನೆಗಳನ್ನು ನೋಡಿ',
      ctaSecondary: 'ಅನುಮಾನಾಸ್ಪದ ಸಂದೇಶ ಪರೀಕ್ಷಿಸಿ',
      meta1: 'ಅಧಿಕೃತ ಮೂಲಗಳಿಂದ ಪರಿಶೀಲಿತ',
      meta2: 'ಸಾಲದ ಲೆಕ್ಕಾಚಾರ ನಿಮ್ಮ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ನಡೆಯುತ್ತದೆ',
    },
    record: {
      label: 'ಸಾರ್ವಜನಿಕ ಪರಿಶೀಲನಾ ಎಂಜಿನ್',
      version: 'v2026',
      step1Title: 'ಪರಿಶೀಲಿತ ಯೋಜನಾ ದಾಖಲೆಗಳು',
      step1DescLive: (n: number) =>
        `${n} ಯೋಜನೆಗಳು ಅಧಿಕೃತ ಮೂಲ ಕೊಂಡಿ ಮತ್ತು ಕೊನೆಯ ಪರಿಶೀಲನಾ ದಿನಾಂಕದೊಂದಿಗೆ ಪಟ್ಟಿಯಲ್ಲಿವೆ.`,
      step1DescLoading:
        'ಅಧಿಕೃತ ಕೋಶದಿಂದ ಪರಿಶೀಲಿತ ಯೋಜನಾ ದಾಖಲೆಗಳನ್ನು ಲೋಡ್ ಮಾಡಲಾಗುತ್ತಿದೆ.',
      step2Title: 'ಗೌಪ್ಯತೆಯೇ ಮೊದಲು',
      step2Desc:
        'ಲೆಕ್ಕಾಚಾರ ನಿಮ್ಮ ಸಾಧನದಲ್ಲಿ ನಡೆಯುತ್ತದೆ. ನಿಮ್ಮ ಬಗ್ಗೆ ನಾವು ಯಾವುದೇ ದಾಖಲೆ ಇಟ್ಟುಕೊಳ್ಳುವುದಿಲ್ಲ.',
      step3Title: 'ಉಚಿತ — ಕಮಿಷನ್ ಇಲ್ಲ',
      step3Desc:
        'ಇಲ್ಲಿನ ಪ್ರತಿಯೋಜನೆ, ಪರಿಶೀಲನೆ ಮತ್ತು ಲೆಕ್ಕಾಚಾರ ಉಚಿತ. ನಿಮಗೆ ಏನನ್ನೂ ಮಾರಲಾಗುವುದಿಲ್ಲ.',
      step3Chip: 'ಶೂನ್ಯ ಶುಲ್ಕ',
      ledgerLeft: 'ನಿಯಮ ಆಧಾರಿತ • ಅಧಿಕೃತ ಮೂಲಗಳು',
      ledgerRight: 'ZERO BROKERAGE',
    },
    dest: {
      eyebrow: 'ಸ್ವತಂತ್ರ ಸಾರ್ವಜನಿಕ ಮಾರ್ಗಗಳು',
      heading: 'ನಿಮಗೆ ಯಾವ ಸಹಾಯ ಬೇಕು?',
      headingSub: 'Choose the service you need.',
      intro:
        'ನಾಲ್ಕು ಸ್ವತಂತ್ರ ಮಾರ್ಗಗಳು. ನೇರ ಉತ್ತರಗಳು, ಪರಿಶೀಲಿತ ಲೆಕ್ಕಾಚಾರ ಮತ್ತು ಯಾವುದೇ ವಾಣಿಜ್ಯ ಶಿಫಾರಸುಗಳಿಲ್ಲ.',
    },
    tile1: {
      eyebrow: 'ಕೇಂದ್ರ ಮತ್ತು ರಾಜ್ಯ ನೆರವು ಯೋಜನೆಗಳು',
      title: 'ಸರ್ಕಾರಿ ನೆರವು ಹುಡುಕಿ',
      desc:
        'ಕೇಂದ್ರ ಮತ್ತು ರಾಜ್ಯ ಕಲ್ಯಾಣ ಯೋಜನೆಗಳನ್ನು ಸರಳ ಪಟ್ಟಿಯಾಗಿ — ಯಾರು ಅರ್ಹರು, ಯಾವ ದಸ್ತಾವೇಜುಗಳು ಬೇಕು, ಅಧಿಕೃತ ಮೂಲ ಏನು ಹೇಳುತ್ತದೆ ಎಂಬುದನ್ನು ವಿವರಿಸಲಾಗಿದೆ.',
      chipLabel: 'ವರ್ಗ',
      meta: 'ಅಧಿಕೃತ ಯೋಜನಾ ದಾಖಲೆಗಳಿಂದ ನವೀಕರಿತ',
      cta: 'ಎಲ್ಲಾ ಯೋಜನೆಗಳನ್ನು ನೋಡಿ',
      empty: 'ಪರಿಶೀಲಿತ ಯೋಜನೆಗಳು ಕೋಶ ಲೋಡ್ ಆದ ನಂತರ ಇಲ್ಲಿ ಕಾಣಿಸುತ್ತವೆ.',
    },
    tile2: {
      eyebrow: 'ಡಿಜಿಟಲ್ ವಂಚನೆ ತಪಾಸಣೆ',
      title: 'ವಂಚನೆ ಪರಿಶೀಲಿಸಿ, ಸುರಕ್ಷಿತವಾಗಿರಿ',
      desc:
        'ಒಟಿಪಿ ಹಂಚುವ ಮೊದಲು ಅಥವಾ ಕೊಂಡಿ ತೆರೆಯುವ ಮೊದಲು ಅನುಮಾನಾಸ್ಪದ SMS, ವಾಟ್ಸ್‌ಆಪ್ ಸಂದೇಶ ಮತ್ತು ಸಾಲದ ಆಫರ್‌ಗಳನ್ನು ಪರಿಶೀಲಿಸಿ.',
      insetLabel: 'ಸಾಮಾನ್ಯ ಎಚ್ಚರಿಕೆಯ ಸಂಕೇತ',
      insetText:
        'ತಕ್ಷಣ ಪಾವತಿ ಒತ್ತಾಯ, ಒಟಿಪಿ ಕೋರಿಕೆ, ಅಥವಾ ಸರ್ಕಾರಿ ನೆರವು ಬಿಡುಗಡೆಗೆ “ಶುಲ್ಕ” ಎಂಬ ಬೇಡಿಕೆ.',
      meta: 'ಸೈಬರ್ ಅಪರಾಧ ಸಹಾಯವಾಣಿ 1930',
      cta: 'ಸಂದೇಶ ಪರಿಶೀಲಿಸಿ',
    },
    tile3: {
      eyebrow: 'ಸರಳ ಸಾಲದ ಲೆಕ್ಕ',
      title: 'ಸಾಲ ತೆಗೆದುಕೊಂಡರೆ ನಿಜವಾಗಿ ಎಷ್ಟು ವೆಚ್ಚ ಎಂದು ಅರ್ಥಮಾಡಿ',
      desc:
        'ಕಡಿಮೆ ಇಎಂಐ ದೀರ್ಘ ಅವಧಿ ಮತ್ತು ಹೆಚ್ಚು ಒಟ್ಟು ಬಡ್ಡಿಯನ್ನು ಮರೆಮಾಡಬಹುದು. ಸಹಿ ಹಾಕುವ ಮೊದಲು ಸಂಪೂರ್ಣ ವೆಚ್ಚ ನೋಡಿ.',
      exLabel: 'ಉದಾಹರಣೆ',
      leftLabel: 'ಜಾಹೀರಾತು ದರ',
      leftValue: 'ತಿಂಗಳಿಗೆ 1% ಫ್ಲ್ಯಾಟ್',
      rightLabel: 'ನಿಜವಾದ ಕಡಿತ ಬಡ್ಡಿ ದರ',
      rightValue: '≈ 21.5% / ವರ್ಷ',
      meta: 'ನೀವು ಒಪ್ಪುವ ಮೊದಲು ಒಟ್ಟು ವೆಚ್ಚ ತೋರಿಸಲಾಗುತ್ತದೆ',
      cta: 'ಸಾಲದ ವೆಚ್ಚ ಲೆಕ್ಕ ಹಾಕಿ',
    },
    tile4: {
      eyebrow: 'ಎರಡು ಭಾಷೆಯ ಸಹಾಯ • ಅಧಿಕೃತ ಮೂಲಗಳು',
      title: 'ಗ್ರಾಮ್‌ಫೈನಾನ್ಸ್‌ಗೆ ಕೇಳಿ',
      desc:
        'ಪ್ರತಿದಿನದ ಕನ್ನಡ ಅಥವಾ ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ ಯಾವುದೇ ಹಣಕಾಸು ಪ್ರಶ್ನೆ ಕೇಳಿ — ಅಧಿಕೃತ ಮೂಲಗಳಿಂದ, ಸರಳವಾಗಿ ಉತ್ತರಿಸಲಾಗುತ್ತದೆ.',
      pills: [
        '“ನನ್ನ ಇಎಂಐ ಹೇಗೆ ಲೆಕ್ಕ ಹಾಕಲಾಗುತ್ತದೆ?”',
        '“ಈ ಸಂದೇಶ ವಂಚನೆಯೇ?”',
        '“ರೈತರಿಗೆ ಯಾವ ಯೋಜನೆಗಳಿವೆ?”',
      ],
      meta: 'ನಿಮ್ಮ ಸಂಭಾಷಣೆಗಳನ್ನು ತರಬೇತಿಗೆ ಬಳಸಲಾಗುವುದಿಲ್ಲ',
      cta: 'ಸಂಭಾಷಣೆ ಪ್ರಾರಂಭಿಸಿ',
    },
    transparency: {
      eyebrow: 'ತೀರ್ಮಾನದ ಪಾರದರ್ಶಕತೆ',
      heading: 'ನಾವು ಕೇವಲ ಉತ್ತರ ನೀಡುವುದಿಲ್ಲ. ಅದರ ಹಿಂದಿನ ಕಾರಣವನ್ನು ವಿವರಿಸುತ್ತೇವೆ.',
      lead:
        'ಪ್ರತಿ ಅಂದಾಜಿನ ಹಿಂದಿನ ಷರತ್ತುಗಳು ಕಾಣಿಸುತ್ತವೆ — ಆದ್ದರಿಂದ ನೀವು ಗ್ರಾಮ ಒನ್ ಕೇಂದ್ರಕ್ಕೆ ಅಥವಾ ಬ್ಯಾಂಕ್‌ಗೆ ಸಿದ್ಧವಾಗಿ, ಯಾವುದೇ ಮಧ್ಯವರ್ತಿಗಳಿಲ್ಲದೆ ಹೋಗಬಹುದು.',
      cardEyebrow: 'ಪ್ರಕಟಿತ ಯೋಜನಾ ದಾಖಲೆ',
      cardAmountLabel: 'ಕೊನೆಯ ಪರಿಶೀಲನೆ',
      activePill: 'ಸಕ್ರಿಯ ಯೋಜನೆ',
      checkWho: 'ಯಾರಿಗಾಗಿ',
      checkWhere: 'ಎಲ್ಲಿ ಅನ್ವಯ',
      checkWhen: 'ಯಾವಾಗ ಪರಿಶೀಲಿಸಲಾಗಿದೆ',
      noGroups: 'ಯಾವುದೇ ಗುರಿ ವರ್ಗಗಳಿಲ್ಲ',
      allStates: 'ಎಲ್ಲಾ ರಾಜ್ಯಗಳು ಮತ್ತು ಕೇಂದ್ರಾಡಳಿತ ಪ್ರದೇಶಗಳು',
      loading: 'ಯೋಜನಾ ದಾಖಲೆಗಳು ಲೋಡ್ ಆಗುತ್ತಿವೆ…',
      empty: 'ಅಧಿಕೃತ ಕೋಶ ಲೋಡ್ ಆದ ನಂತರ ಇಲ್ಲಿ ಯೋಜನಾ ದಾಖಲೆಗಳು ಕಾಣಿಸುತ್ತವೆ.',
      infoLabel: 'ಅರ್ಜಿ ಸಲ್ಲಿಸುವ ಮೊದಲು',
      infoText:
        'ಮೊದಲು ಆನ್‌ಲೈನ್‌ನಲ್ಲಿ ಅರ್ಹತೆ ಪರಿಶೀಲಿಸಿ, ನಂತರ ನಿಮ್ಮ ದಸ್ತಾವೇಜುಗಳು ಮತ್ತು ಅಧಿಕೃತ ಷರತ್ತುಗಳೊಂದಿಗೆ ಹೋಗಿ.',
      cardCta: 'ಸಂಪೂರ್ಣ ಯೋಜನಾ ವಿವರ ನೋಡಿ',
      photoAlt:
        'ಕರ್ನಾಟಕದ ಅಂಗಡಿ ಮಾಲೀಕರು ತಮ್ಮ ಕೌಂಟರ್‌ನಲ್ಲಿ UPI ಪಾವತಿ ಸ್ಟ್ಯಾಂಡ್‌ನೊಂದಿಗೆ ನಗುತ್ತಿರುವುದು',
      photoOverlay: 'ಕನ್ನಡ ಮತ್ತು ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ ಮಾರ್ಗದರ್ಶನ',
      m1l: 'ಅರ್ಹತಾ ಪರಿಶೀಲನೆ ನಿಯಮ ಆಧಾರಿತ',
      m2l: 'ಯಾವುದೇ ಕಮಿಷನ್ ಇಲ್ಲ',
      m3l: 'ಟ್ರ್ಯಾಕರ್ ಅಥವಾ ಜಾಹೀರಾತು ದಾಖಲೆ',
    },
    trust: {
      pill: 'ಸಾರ್ವಜನಿಕ ವಿಶ್ವಾಸ ಮಾನದಂಡ',
      heading: 'ಸ್ಪಷ್ಟ ಮಾಹಿತಿ. ಪಾರದರ್ಶಕ ಆಲೋಚನೆ. ಶೂನ್ಯ ವಾಣಿಜ್ಯ ಹಿತಾಸಕ್ತಿ.',
      lead:
        'ಗ್ರಾಮ್‌ಫೈನಾನ್ಸ್ ಸಾಲ ನೀಡುವ ಸಂಸ್ಥೆಯಲ್ಲ, ಲೀಡ್ ಜನರೇಟರ್ ಅಲ್ಲ ಅಥವಾ ಸಾಲ ಆ್ಯಪ್ ಅಫಿಲಿಯೇಟ್ ಅಲ್ಲ. ಇಲ್ಲಿ ನೀವು ನೋಡುವ ಯಾವುದಕ್ಕೂ ಪಾವತಿ ಮಾಡಿಲ್ಲ.',
      p1t: 'ಮೂಲದಲ್ಲಿ ಪರಿಶೀಲಿತ',
      p1d:
        'ಯೋಜನಾ ವಿವರ, ಗಡುವು ಮತ್ತು ಅಧಿಕೃತ ಕೊಂಡಿಗಳು ಸರ್ಕಾರಿ ಮೂಲಗಳಿಂದ ಬರುತ್ತವೆ ಮತ್ತು ಕೊನೆಯ ಪರಿಶೀಲನಾ ದಿನಾಂಕ ಹೊಂದಿವೆ.',
      p1m: 'ಅಧಿಕೃತ ಮೂಲಗಳು, ದಿನಾಂಕ ಸಹ ಮರುಪರಿಶೀಲನೆ',
      p2t: 'ವಿವರಿಸಬಹುದಾದ ಫಲಿತಾಂಶ',
      p2d:
        'ಯಾವುದೇ ಬ್ಲ್ಯಾಕ್‌ಬಾಕ್ ಅಂಕಗಳಿಲ್ಲ. ಅರ್ಹತಾ ಪರಿಶೀಲನೆಯು ಯಾವ ಷರತ್ತು ಸರಿಯಾಗಿದೆ, ಯಾವುದು ವಿಫಲ, ಯಾವ ಮಾಹಿತಿ ಕೊರತೆ ಎಂದು ತೋರಿಸುತ್ತದೆ.',
      p2m: 'ಓದಬಹುದಾದ ನಿಯಮ ಆಧಾರಿತ ಫಲಿತಾಂಶ',
      p3t: 'ವಿನ್ಯಾಸದಲ್ಲಿ ಗೌಪ್ಯತೆ',
      p3d:
        'ಸಾಲದ ಲೆಕ್ಕಾಚಾರ ನಿಮ್ಮ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ನಡೆಯುತ್ತದೆ. ನಿಮ್ಮ ಬಗ್ಗೆ ಪ್ರೊಫೈಲ್ ಮಾಡುವುದಿಲ್ಲ, ದತ್ತಾಂಶ ಮಾರುವುದಿಲ್ಲ.',
      p3m: 'ಪ್ರೊಫೈಲಿಂಗ್ ಇಲ್ಲ, ದತ್ತಾಂಶ ಮಾರಾಟ ಇಲ್ಲ',
      endorse:
        'ಗ್ರಾಮೀಣ ಡಿಜಿಟಲ್ ಕೇಂದ್ರಗಳು, ಸ್ವಸಹಾಯ ಗುಂಪುಗಳು ಮತ್ತು ಸಾಮಾನ್ಯ ಕುಟುಂಬಗಳಿಗಾಗಿ ರೂಪಿಸಲಾಗಿದೆ.',
      license: 'PUBLIC INTEREST • 2026',
    },
    closing: {
      eyebrow: 'ನೇರ ಪ್ರವೇಶ',
      heading: 'ಪ್ರಾರಂಭಿಸಲು ಸಿದ್ಧರೇ?',
      headingSub: 'Start the service you need.',
      lead:
        'ಪ್ರಾರಂಭಿಸಲು ಕೆಳಗಿನ ಯಾವುದಾದರೂ ಮಾರ್ಗ ಆಯ್ಕೆಮಾಡಿ. ಇಲ್ಲಿ ಎಲ್ಲವೂ ಉಚಿತ, ನಿಯಮ ಆಧಾರಿತ ಮತ್ತು ಪಾರದರ್ಶಕ — ಯಾವುದೇ ಪ್ರಾಯೋಜಕತ್ವ ಇಲ್ಲ.',
      noAccount: 'ಖಾತೆ ನೋಂದಣಿ ಅಥವಾ ಫೋನ್ ಪರಿಶೀಲನೆ ಅಗತ್ಯವಿಲ್ಲ.',
      rows: [
        {
          t: 'ನಿಮ್ಮ ಕುಟುಂಬಕ್ಕೆ ಯೋಜನೆಗಳನ್ನು ಹುಡುಕಿ',
          d: 'ವೃತ್ತಿ, ಭೂಮಿ ಮತ್ತು ಕುಟುಂಬ ಆಧಾರದ ಮೇಲೆ ಹುಡುಕಿ',
          href: '/schemes',
        },
        {
          t: 'ಅನುಮಾನಾಸ್ಪದ ಸಂದೇಶವನ್ನು ಈಗಲೇ ಪರಿಶೀಲಿಸಿ',
          d: 'ಒಟಿಪಿ ಹಂಚುವ ಮೊದಲು ಅಥವಾ UPI ವಿನಂತಿ ಒಪ್ಪುವ ಮೊದಲು ಎಚ್ಚರಿಕೆ ಸಂಕೇತಗಳನ್ನು ಗುರುತಿಸಿ',
          href: '/check',
        },
        {
          t: 'ಸಾಲ ನಿಜವಾಗಿ ಎಷ್ಟು ವೆಚ್ಚ ಎಂದು ಲೆಕ್ಕ ಹಾಕಿ',
          d: 'ಒಟ್ಟು ಬಡ್ಡಿ, ಶುಲ್ಕ, ಅವಧಿ ಮತ್ತು ಮುಂಚಿತ ಅಡ್ಡಿಯ ಪರಿಣಾಮ',
          href: '/loan',
        },
        {
          t: 'ಕನ್ನಡ ಅಥವಾ ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ ಪ್ರಶ್ನೆ ಕೇಳಿ',
          d: 'ಅಧಿಕೃತ ಮೂಲಗಳಿಗೆ ಆಧಾರಿತ ಸರಳ ವಿವರಣೆ',
          href: '/assistant',
        },
      ],
      footnote:
        'ಉಚಿತ, ವಾಣಿಜ್ಯೇತರ ಸೇವೆ. ಯಾವುದೇ ಟ್ರ್ಯಾಕಿಂಗ್ ಪಿಕ್ಸೆಲ್ ಇಲ್ಲ. ಮಾರ್ಕೆಟಿಂಗ್ ವಿಶ್ಲೇಷಣೆ ಇಲ್ಲ.',
      chip: 'OPEN • FREE • NON-COMMERCIAL',
    },
  },
} as const;
