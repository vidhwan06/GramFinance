/**
 * Bilingual page copy for the Stay Safe / "Scam Inspector" experience.
 *
 * The chrome strings (`t.fraud.*`) stay in `features/language/translations/`.
 * This dictionary only holds the Stitch page composition copy: hero,
 * inspector console chrome, education strip and the how-it-works /
 * limitations / action-guidance sections.
 *
 * `kn` is typed as `Copy`, so a key added to `en` without a Kannada
 * counterpart fails `tsc`.
 */

const en = {
  // ── Meta bar / breadcrumb ───────────────────────────────────────────────
  breadcrumbHome: 'Home',
  breadcrumbCurrent: 'Stay Safe · Scam & Message Inspector',
  fraudCheckPill: 'Online fraud check',

  // ── Hero ────────────────────────────────────────────────────────────────
  eyebrow: 'Civic Protection Utility',
  headline: "Something doesn't feel right?",
  lead:
    'Paste an SMS, WhatsApp forward, or payment reminder here. GramFinance reviews the message against fixed checking rules and official public scheme records to point out manipulative urgency, unofficial fees, or private OTP requests.',

  // ── Trust card + chips ──────────────────────────────────────────────────
  trustTitle: 'Checked against official scheme records',
  trustBody:
    'Your message is compared with fixed detection rules and the public scheme catalogue. It is used only for this check and is not stored.',
  trustChip1: 'Fixed rules, explainable results',
  trustChip2: 'Compared with official scheme data',
  trustChip3: 'Helpline 1930 always in reach',

  // ── Inspector console ───────────────────────────────────────────────────
  consoleTitle: 'Message Text Inspector',
  tryExample: 'Try example:',
  clearText: 'Clear text',
  inputHint: 'Paste the SMS, WhatsApp forward, email excerpt, or payment instructions…',
  examples: [
    {
      label: '1. Scheme fee & OTP',
      text:
        'Dear Beneficiary, your PM-KISAN instalment is on hold pending re-KYC. Send your 6-digit Aadhaar OTP to +91-98000-XXXXX and pay a clearance charge of ₹499 within 2 hours, or your DBT account will be blocked.',
    },
    {
      label: '2. Power cut threat',
      text:
        'URGENT NOTICE: Your electricity connection will be disconnected tonight because your last bill was not updated. Download the update app from http://bill-update.example or call the officer on 9845000000 now.',
    },
    {
      label: '3. Prize / cashback SMS',
      text:
        'CONGRATULATIONS! Your number has been awarded a prize of ₹5,00,000. To release the amount, open the link and pay a handling fee of ₹1,200 immediately.',
    },
    {
      label: '4. Routine bank notice',
      text:
        'Dear Customer, your account ending 4102 has been credited. Check the updated balance in your bank app. For queries, call the toll-free number printed on your card or passbook.',
    },
  ],

  // ── Risk verdict banner (FraudRiskSummary) ──────────────────────────────
  verdictHigh: 'This message looks suspicious',
  verdictMedium: 'This message needs a closer check',
  verdictLow: 'No obvious scam patterns found',

  // ── Message summary card (FraudExplanation) ─────────────────────────────
  summaryEyebrow: 'Inspector summary',

  // ── Signal list (FraudSignalList) ───────────────────────────────────────
  signalsEyebrow: 'Warning indicators',
  signalsTitle: 'What we found',
  indicatorOne: 'indicator',
  indicators: 'indicators',
  whyThisMatters: 'Why this matters',
  severityHigh: 'High',
  severityMedium: 'Medium',
  severityLow: 'Low',

  // ── Scheme block (SchemeFindings) ───────────────────────────────────────
  schemeEyebrow: 'Matched scheme record',

  // ── Recommendations (FraudRecommendations) ──────────────────────────────
  recEyebrow: 'Action guide',
  recSub: 'Do these steps in order.',
  testAnother: 'Test another message',
  assistanceEyebrow: 'Need a human opinion?',
  assistanceBody:
    'If someone keeps calling and demanding transfers, show the message to your village administrative officer, a post office savings agent, or your bank branch before you send anything.',

  // ── Honest-limitations perspective card ─────────────────────────────────
  perspectiveEyebrow: 'Independent public safety standard',
  perspectiveTitle:
    'Why doesn’t GramFinance simply say “This message is 100% safe”?',
  perspectiveBody:
    'Because scammers keep changing their words to slip past checkers. A green tick from any app can make you lower your guard. GramFinance shows what it found and what it could not verify — if anyone asks for money or codes, check the official portal or ask in person.',
  doctrineLabel: 'GramFinance doctrine',
  doctrineValue: 'No false assurance',
  doctrineSub: 'Verified knowledge over blind trust',

  // ── Education strip ─────────────────────────────────────────────────────
  eduEyebrow: 'Decoder',
  eduEyebrowKn: 'ವಂಚನೆ ವಿಧಾನಗಳು',
  eduTitle: 'Five common patterns in rural financial scams',
  eduSub:
    'Recognise these structural tricks before opening unfamiliar links or sending money.',
  realityLabel: 'The reality',
  eduCards: [
    {
      tag: 'Malware threat',
      title: 'Unofficial app-install files',
      example:
        '"Your electricity bill is unpaid. Download this update file from the link to avoid disconnection tonight."',
      reality:
        'Power companies do not send install files over chat. Such files can silently read your messages and OTPs.',
    },
    {
      tag: 'Phantom prize',
      title: 'Lottery and cashback you never entered',
      example:
        '"Congratulations! You have won a prize. Pay a small fee now to release the amount."',
      reality:
        'You cannot win a draw you never entered. Asking for a fee before giving money is the scam itself.',
    },
    {
      tag: 'Impersonation',
      title: '10-digit “customer care” numbers',
      example:
        '"Bank customer care — call this number to unblock your card immediately."',
      reality:
        'Banks publish toll-free numbers and send alerts from short codes. They do not use personal mobile numbers.',
    },
    {
      tag: 'Panic driver',
      title: 'SIM and account blocking threats',
      example:
        '"Your SIM will be blocked within 24 hours. Verify KYC now by sharing your OTP."',
      reality:
        'Real notices give you time and a written way to respond. A deadline built to scare you is a warning sign.',
    },
    {
      tag: 'Scheme fixers',
      title: 'Agents who promise to release an installment',
      example:
        '"Your scheme approval is ready. Send a processing charge to my number to release the payment."',
      reality:
        'Scheme payments are released directly to your linked account. No agent or officer can speed them up for a cash or UPI payment.',
    },
  ],

  // ── How it works ────────────────────────────────────────────────────────
  howEyebrow: 'How it works',
  howTitle: 'How the Scam Inspector checks a message',
  howSteps: [
    {
      title: 'Paste the full message',
      body: 'Copy the whole SMS or chat, including the sender header such as VM-XXXX or JD-XXXX.',
    },
    {
      title: 'Fixed rules read the wording',
      body: 'Rules for OTP requests, urgent payment pressure, unofficial fees, personal UPI IDs, suspicious links and government claims are applied one by one. Nothing is guessed.',
    },
    {
      title: 'Claims are matched with scheme records',
      body: 'If a known scheme is mentioned, its claim is marked supported, contradicted, or not verified against the scheme information currently available.',
    },
  ],

  // ── Limitations ─────────────────────────────────────────────────────────
  limitsEyebrow: 'Limitations',
  limitsTitle: 'What this tool cannot do',
  limits: [
    'It cannot prove a message is genuine. “No warning indicators” only means this checker found none of the patterns it knows.',
    'It cannot freeze an account, recall a payment, or read your other messages.',
    'Scammers keep changing their wording, so a new trick may not be recognised yet.',
    'It gives risk indicators, not a bank, legal, or government decision.',
  ],

  // ── Action guidance + emergency channels ────────────────────────────────
  actionEyebrow: 'What to do',
  actionTitle: 'If you think you are being targeted',
  actionSteps: [
    'Do not reply, do not click links, and do not share OTP, PIN or passwords.',
    'Do not send money to unlock or activate a benefit.',
    'Verify in person at the official portal, bank branch, or Gram Panchayat office.',
    'If money has already moved, call the cybercrime helpline 1930 as soon as possible.',
  ],
  helplineTileLabel: 'National Cybercrime Helpline',
  helplineTileValue: 'Dial 1930',
  helplineTileNote: 'For online financial fraud',
  reportTileLabel: 'Report on the official portal',
  reportTileValue: 'cybercrime.gov.in',
  reportTileNote: 'Government of India',

  // ── Empty / low-risk result ─────────────────────────────────────────────
  cleanHeadline: 'No obvious scam patterns detected',
  cleanBody:
    'We checked the message against the rules for coercive urgency, unofficial fees, private UPI requests and OTP collection. None of them matched.',
};

export type Copy = typeof en;

const kn: Copy = {
  // ── Meta bar / breadcrumb ───────────────────────────────────────────────
  breadcrumbHome: 'ಮನೆಪುಟ',
  breadcrumbCurrent: 'ಸುರಕ್ಷಿತವಾಗಿರಿ · ವಂಚನೆ ಮತ್ತು ಸಂದೇಶ ಪರಿಶೀಲಕ',
  fraudCheckPill: 'ಆನ್‌ಲೈನ್ ವಂಚನೆ ತಪಾಸಣೆ',

  // ── Hero ────────────────────────────────────────────────────────────────
  eyebrow: 'ನಾಗರಿಕ ಸುರಕ್ಷತೆ ಉಪಯುಕ್ತಿ',
  headline: 'ಅನುಮಾನಾಸ್ಪದ ಸಂದೇಶ ಬಂದಿದೆಯೇ?',
  lead:
    'ಇಲ್ಲಿ ಒಂದು SMS, WhatsApp ಫಾರ್ವರ್ಡ್ ಅಥವಾ ಪಾವತಿ ಜ್ಞಾಪನೆಯನ್ನು ಅಂಟಿಸಿ. ಗ್ರಾಮ್‌ಫೈನಾನ್ಸ್ ಸಂದೇಶವನ್ನು ಸ್ಥಿರ ಪರಿಶೀಲನಾ ನಿಯಮಗಳು ಮತ್ತು ಅಧಿಕೃತ ಸಾರ್ವಜನಿಕ ಯೋಜನೆ ದಾಖಲೆಗಳೊಂದಿಗೆ ಹೋಲಿಸಿ, ಒತ್ತಾಯದ ಆತುರ, ಅನಧಿಕೃತ ಶುಲ್ಕ ಅಥವಾ ಖಾಸಗಿ OTP ವಿನಂತಿಗಳನ್ನು ಗುರುತಿಸಿ ತೋರಿಸುತ್ತದೆ.',

  // ── Trust card + chips ──────────────────────────────────────────────────
  trustTitle: 'ಅಧಿಕೃತ ಯೋಜನೆ ದಾಖಲೆಗಳೊಂದಿಗೆ ಪರಿಶೀಲನೆ',
  trustBody:
    'ನಿಮ್ಮ ಸಂದೇಶವನ್ನು ಸ್ಥಿರ ಪತ್ತೆ ನಿಯಮಗಳು ಮತ್ತು ಸಾರ್ವಜನಿಕ ಯೋಜನೆ ಪಟ್ಟಿಯೊಂದಿಗೆ ಹೋಲಿಸಲಾಗುತ್ತದೆ. ಅದು ಈ ಪರಿಶೀಲನೆಗೆ ಮಾತ್ರ ಬಳಕೆಯಾಗುತ್ತದೆ, ಸಂಗ್ರಹಿಸಲಾಗುವುದಿಲ್ಲ.',
  trustChip1: 'ಸ್ಥಿರ ನಿಯಮಗಳು, ವಿವರಿಸಬಹುದಾದ ಫಲಿತಾಂಶ',
  trustChip2: 'ಅಧಿಕೃತ ಯೋಜನೆ ಮಾಹಿತಿಯೊಂದಿಗೆ ಹೋಲಿಕೆ',
  trustChip3: 'ಸಹಾಯವಾಣಿ 1930 ಯಾವಾಗಲೂ ಸಿಗುತ್ತದೆ',

  // ── Inspector console ───────────────────────────────────────────────────
  consoleTitle: 'ಸಂದೇಶ ಪಠ್ಯ ಪರಿಶೀಲಕ',
  tryExample: 'ಉದಾಹರಣೆ ಪ್ರಯತ್ನಿಸಿ:',
  clearText: 'ಪಠ್ಯ ತೆರವುಗೊಳಿಸಿ',
  inputHint:
    'SMS, WhatsApp ಫಾರ್ವರ್ಡ್, ಇಮೇಲ್ ಅಥವಾ ಪಾವತಿ ಸೂಚನೆಗಳನ್ನು ಇಲ್ಲಿ ಅಂಟಿಸಿ…',
  examples: [
    {
      label: '1. ಯೋಜನಾ ಶುಲ್ಕ ಮತ್ತು OTP',
      text:
        'ಪ್ರಿಯ ಫಲಾನುಭವಿ, ನಿಮ್ಮ PM-KISAN ಕಂತು KYC ಪೂರ್ಣವಾಗದಕಾರಣ ತಡೆಹಿಡಿಯಲಾಗಿದೆ. 2 ಗಂಟೆಯೊಳಗೆ ನಿಮ್ಮ 6 ಅಂಕಿಯ Aadhaar OTP ಅನ್ನು +91-98000-XXXXX ಗೆ ಕಳುಹಿಸಿ ಮತ್ತು ₹499 ಪರಿಶೀಲನಾ ಶುಲ್ಕ ಪಾವತಿಸಿ, ಇಲ್ಲದಿದ್ದರೆ ನಿಮ್ಮ DBT ಖಾತೆ ನಿರ್ಬಂಧಿಸಲ್ಪಡುತ್ತದೆ.',
    },
    {
      label: '2. ವಿದ್ಯುತ್ ಕಡಿತ ಬೆದರಿಕೆ',
      text:
        'ತುರ್ತು ಸೂಚನೆ: ಕಳೆದ ಬಿಲ್ ನವೀಕರಣವಾಗದ ಕಾರಣ ನಿಮ್ಮ ವಿದ್ಯುತ್ ಸಂಪರ್ಕವು ಇಂದು ರಾತ್ರಿ ಕಡಿತಗೊಳ್ಳುತ್ತದೆ. ನವೀಕರಣ ಆಪ್ ಅನ್ನು http://bill-update.example ನಿಂದ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ ಅಥವಾ ಈಗಲೇ ಅಧಿಕಾರಿಗೆ 9845000000 ಗೆ ಕರೆ ಮಾಡಿ.',
    },
    {
      label: '3. ಬಹುಮಾನ / ಕ್ಯಾಶ್‌ಬ್ಯಾಕ್ SMS',
      text:
        'ಅಭಿನಂದನೆಗಳು! ನಿಮ್ಮ ಸಂಖ್ಯೆಗೆ ₹5,00,000 ಬಹುಮಾನ ದೊರೆತಿದೆ. ಹಣ ಪಡೆಯಲು ಲಿಂಕ್ ತೆರೆದು ಈಗಲೇ ₹1,200 ನಿರ್ವಹಣಾ ಶುಲ್ಕ ಪಾವತಿಸಿ.',
    },
    {
      label: '4. ಸಾಮಾನ್ಯ ಬ್ಯಾಂಕ್ ಸೂಚನೆ',
      text:
        'ಪ್ರಿಯ ಗ್ರಾಹಕ, ನಿಮ್ಮ 4102 ಕೊನೆಯ ಖಾತೆಗೆ ಜಮೆಯಾಗಿದೆ. ನವೀಕರಣಗೊಂಡ ಬಾಕಿಯನ್ನು ನಿಮ್ಮ ಬ್ಯಾಂಕ್ ಆಪ್‌ನಲ್ಲಿ ನೋಡಿ. ಪ್ರಶ್ನೆಗಳಿಗೆ ನಿಮ್ಮ ಕಾರ್ಡ್ ಅಥವಾ ಪಾಸ್‌ಬುಕ್‌ನಲ್ಲಿ ಮುದ್ರಿಸಿರುವ ಟೋಲ್‌ಫ್ರೀ ಸಂಖ್ಯೆಗೆ ಕರೆ ಮಾಡಿ.',
    },
  ],

  // ── Risk verdict banner (FraudRiskSummary) ──────────────────────────────
  verdictHigh: 'ಈ ಸಂದೇಶವು ಅನುಮಾನಾಸ್ಪದವಾಗಿದೆ',
  verdictMedium: 'ಈ ಸಂದೇಶವನ್ನು ಇನ್ನಷ್ಟು ಪರಿಶೀಲಿಸಬೇಕು',
  verdictLow: 'ಯಾವುದೇ ಸಾಮಾನ್ಯ ವಂಚನೆ ಮಾದರಿಗಳು ಕಂಡುಬಂದಿಲ್ಲ',

  // ── Message summary card (FraudExplanation) ─────────────────────────────
  summaryEyebrow: 'ಪರಿಶೀಲಕ ಸಾರಾಂಶ',

  // ── Signal list (FraudSignalList) ───────────────────────────────────────
  signalsEyebrow: 'ಎಚ್ಚರಿಕೆ ಸೂಚಕಗಳು',
  signalsTitle: 'ಏನು ಕಂಡುಬಂದಿದೆ',
  indicatorOne: 'ಸೂಚಕ',
  indicators: 'ಸೂಚಕಗಳು',
  whyThisMatters: 'ಇದು ಏಕೆ ಮುಖ್ಯ',
  severityHigh: 'ಹೆಚ್ಚು',
  severityMedium: 'ಮಧ್ಯಮ',
  severityLow: 'ಕಡಿಮೆ',

  // ── Scheme block (SchemeFindings) ───────────────────────────────────────
  schemeEyebrow: 'ಗುರುತಿಸಲಾದ ಯೋಜನೆ ದಾಖಲೆ',

  // ── Recommendations (FraudRecommendations) ──────────────────────────────
  recEyebrow: 'ಕ್ರಿಯಾ ಮಾರ್ಗದರ್ಶಿ',
  recSub: 'ಈ ಹಂತಗಳನ್ನು ಸರತಿಯಲ್ಲಿ ಮಾಡಿ.',
  testAnother: 'ಮತ್ತೊಂದು ಸಂದೇಶ ಪರಿಶೀಲಿಸಿ',
  assistanceEyebrow: 'ಮಾನವರ ಅಭಿಪ್ರಾಯ ಬೇಕೇ?',
  assistanceBody:
    'ಯಾರಾದರೂ ಪದೇ ಪದೇ ಕರೆ ಮಾಡಿ ಹಣ ವರ್ಗಾಯಿಸಲು ಒತ್ತಾಯಿಸಿದರೆ, ಏನನ್ನೂ ಕಳುಹಿಸುವ ಮೊದಲು ಆ ಸಂದೇಶವನ್ನು ನಿಮ್ಮ ಗ್ರಾಮ ಕಚೇರಿ ಅಧಿಕಾರಿ, ಅಂಚೆ ಕಚೇರಿ ಉಳಿತಾಯ ಏಜೆಂಟ್ ಅಥವಾ ಬ್ಯಾಂಕ್ ಶಾಖೆಗೆ ತೋರಿಸಿ.',

  // ── Honest-limitations perspective card ─────────────────────────────────
  perspectiveEyebrow: 'ಸ್ವತಂತ್ರ ಸಾರ್ವಜನಿಕ ಸುರಕ್ಷತಾ ಮಾನದಂಡ',
  perspectiveTitle:
    '“ಈ ಸಂದೇಶ 100% ಸುರಕ್ಷಿತ” ಎಂದು ಗ್ರಾಮ್‌ಫೈನಾನ್ಸ್ ಏಕೆ ಹೇಳುವುದಿಲ್ಲ?',
  perspectiveBody:
    'ವಂಚಕರು ಪರಿಶೀಲಕಗಳನ್ನು ದಾಟಲು ತಮ್ಮ ಪದಗಳನ್ನು ಬದಲಾಯಿಸುತ್ತಲೇ ಇರುತ್ತಾರೆ. ಯಾವುದೇ ಆಪ್‌ನ ಹಸಿರು ಗುರುತು ನಿಮ್ಮ ಎಚ್ಚರಿಕೆ ಕಡಿಮೆ ಮಾಡಬಹುದು. ಗ್ರಾಮ್‌ಫೈನಾನ್ಸ್ ಏನು ಕಂಡುಹಿಡಿದಿದೆ ಮತ್ತು ಏನು ಪರಿಶೀಲಿಸಲಾಗದು ಎಂದು ತೋರಿಸುತ್ತದೆ — ಯಾರಾದರೂ ಹಣ ಅಥವಾ ಕೋಡ್ ಕೇಳಿದರೆ, ಅಧಿಕೃತ ಪೋರ್ಟಲ್‌ನಲ್ಲಿ ಪರಿಶೀಲಿಸಿ ಅಥವಾ ನೇರವಾಗಿ ವಿಚಾರಿಸಿ.',
  doctrineLabel: 'ಗ್ರಾಮ್‌ಫೈನಾನ್ಸ್ ತತ್ವ',
  doctrineValue: 'ಸುಳ್ಳು ಭರವಸೆ ಇಲ್ಲ',
  doctrineSub: 'ಕುರುಡು ನಂಬಿಕೆಗಿಂತ ಪರಿಶೀಲಿತ ಜ್ಞಾನ',

  // ── Education strip ─────────────────────────────────────────────────────
  eduEyebrow: 'ವಿವರಣೆ',
  eduEyebrowKn: 'Scam methods',
  eduTitle: 'ಗ್ರಾಮೀಣ ಹಣಕಾಸು ವಂಚನೆಯ ಐದು ಸಾಮಾನ್ಯ ಮಾದರಿಗಳು',
  eduSub:
    'ಅಪರಿಚಿತ ಲಿಂಕ್‌ಗಳನ್ನು ತೆರೆಯುವ ಮೊದಲು ಅಥವಾ ಹಣ ಕಳುಹಿಸುವ ಮೊದಲು ಈ ರಚನಾತ್ಮಕ ತಂತ್ರಗಳನ್ನು ಗುರುತಿಸಿ.',
  realityLabel: 'ವಾಸ್ತವ',
  eduCards: [
    {
      tag: 'ಮಾಲ್‌ವೇರ್ ಬೆದರಿಕೆ',
      title: 'ಅನಧಿಕೃತ ಆಪ್ ಇನ್‌ಸ್ಟಾಲ್ ಫೈಲ್‌ಗಳು',
      example:
        '"ನಿಮ್ಮ ವಿದ್ಯುತ್ ಬಿಲ್ ಪಾವತಿಯಾಗಿಲ್ಲ. ಇಂದು ರಾತ್ರಿ ಕಡಿತ ತಪ್ಪಿಸಲು ಲಿಂಕ್‌ನಿಂದ ಈ ನವೀಕರಣ ಫೈಲ್ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ."',
      reality:
        'ವಿದ್ಯುತ್ ಕಂಪನಿಗಳು ಚಾಟ್‌ನಲ್ಲಿ ಇನ್‌ಸ್ಟಾಲ್ ಫೈಲ್‌ಗಳನ್ನು ಕಳುಹಿಸುವುದಿಲ್ಲ. ಅಂತಹ ಫೈಲ್‌ಗಳು ನಿಮ್ಮ ಸಂದೇಶ ಮತ್ತು OTP ಗಳನ್ನು ಗೌಪ್ಯವಾಗಿ ಓದಬಹುದು.',
    },
    {
      tag: 'ಸುಳ್ಳು ಬಹುಮಾನ',
      title: 'ನೀವು ಭಾಗವಹಿಸದ ಲಾಟರಿ ಮತ್ತು ಕ್ಯಾಶ್‌ಬ್ಯಾಕ್',
      example:
        '"ಅಭಿನಂದನೆಗಳು! ನೀವು ಬಹುಮಾನ ಗೆದ್ದಿದ್ದೀರಿ. ಹಣ ಬಿಡುಗಡೆಗೆ ಈಗಲೇ ಸಣ್ಣ ಶುಲ್ಕ ಪಾವತಿಸಿ."',
      reality:
        'ನೀವು ಭಾಗವಹಿಸದ ಸ್ಪರ್ಧೆಯಲ್ಲಿ ಗೆಲ್ಲಲಾಗದು. ಹಣ ಕೊಡುವ ಮೊದಲು ಶುಲ್ಕ ಕೇಳುವುದೇ ವಂಚನೆ.',
    },
    {
      tag: 'ವ್ಯಕ್ತಿ ನಟನೆ',
      title: '10 ಅಂಕಿಯ “ಗ್ರಾಹಕ ಸೇವೆ” ಸಂಖ್ಯೆಗಳು',
      example:
        '"ಬ್ಯಾಂಕ್ ಗ್ರಾಹಕ ಸೇವೆ — ಕಾರ್ಡ್ ತಕ್ಷಣ ಅನ್‌ಬ್ಲಾಕ್ ಮಾಡಲು ಈ ಸಂಖ್ಯೆಗೆ ಕರೆ ಮಾಡಿ."',
      reality:
        'ಬ್ಯಾಂಕ್‌ಗಳು ಟೋಲ್‌ಫ್ರೀ ಸಂಖ್ಯೆಗಳನ್ನು ಪ್ರಕಟಿಸುತ್ತವೆ ಮತ್ತು ಶಾರ್ಟ್ ಕೋಡ್‌ಗಳಿಂದ ಸೂಚನೆ ಕಳುಹಿಸುತ್ತವೆ. ಅವು ಖಾಸಗಿ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಗಳನ್ನು ಬಳಸುವುದಿಲ್ಲ.',
    },
    {
      tag: 'ಆತುರ ಒತ್ತಡ',
      title: 'SIM ಮತ್ತು ಖಾತೆ ನಿರ್ಬಂಧದ ಬೆದರಿಕೆ',
      example:
        '"ನಿಮ್ಮ SIM 24 ಗಂಟೆಯೊಳಗೆ ನಿರ್ಬಂಧಿಸಲ್ಪಡುತ್ತದೆ. OTP ಹಂಚಿಕೊಂಡು ಈಗಲೇ KYC ಪರಿಶೀಲಿಸಿ."',
      reality:
        'ನಿಜವಾದ ಸೂಚನೆಗಳು ಸಮಯ ಮತ್ತು ಬರೆದ ಪ್ರತಿಕ್ರಿಯೆ ಅವಕಾಶ ನೀಡುತ್ತವೆ. ಭಯ ಮೂಡಿಸಲು ಮಾಡಿದ ಗಡುವು ಎಚ್ಚರಿಕೆಯ ಸೂಚನೆ.',
    },
    {
      tag: 'ಯೋಜನಾ ಏಜೆಂಟರು',
      title: 'ಕಂತು ಬಿಡುಗಡೆ ಮಾಡುವುದಾಗಿ ಭರವಸೆ ನೀಡುವ ಏಜೆಂಟರು',
      example:
        '"ನಿಮ್ಮ ಯೋಜನೆ ಅನುಮೋದನೆ ಸಿದ್ಧವಿದೆ. ಪಾವತಿ ಬಿಡುಗಡೆಗೆ ನನ್ನ ಸಂಖ್ಯೆಗೆ ಪ್ರಕ್ರಿಯಾ ಶುಲ್ಕ ಕಳುಹಿಸಿ."',
      reality:
        'ಯೋಜನಾ ಪಾವತಿಗಳು ನೇರವಾಗಿ ನಿಮ್ಮ ಲಿಂಕ್ ಆದ ಖಾತೆಗೆ ಬಿಡುಗಡೆಯಾಗುತ್ತವೆ. ಯಾವುದೇ ಏಜೆಂಟ್ ಅಥವಾ ಅಧಿಕಾರಿ ಹಣ ಅಥವಾ UPI ಪಾವತಿಗೆ ಅದನ್ನು ಬೇಗ ಮಾಡಲಾರರು.',
    },
  ],

  // ── How it works ────────────────────────────────────────────────────────
  howEyebrow: 'ಇದು ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ',
  howTitle: 'ವಂಚನೆ ಪರಿಶೀಲಕವು ಸಂದೇಶವನ್ನು ಹೇಗೆ ಪರಿಶೀಲಿಸುತ್ತದೆ',
  howSteps: [
    {
      title: 'ಪೂರ್ಣ ಸಂದೇಶ ಅಂಟಿಸಿ',
      body: 'VM-XXXX ಅಥವಾ JD-XXXX ನಂತಹ ಕಳುಹಿಸುವವರ ಹೆಡರ್ ಸಹಿತ ಇಡೀ SMS ಅಥವಾ ಚಾಟ್ ಕಾಪಿ ಮಾಡಿ.',
    },
    {
      title: 'ಸ್ಥಿರ ನಿಯಮಗಳು ಪದಗಳನ್ನು ಓದುತ್ತವೆ',
      body: 'OTP ವಿನಂತಿ, ತುರ್ತು ಪಾವತಿ ಒತ್ತಾಯ, ಅನಧಿಕೃತ ಶುಲ್ಕ, ವೈಯಕ್ತಿಕ UPI ID, ಸಂದಿಗ್ಧ ಲಿಂಕ್ ಮತ್ತು ಸರ್ಕಾರಿ ಹೇಳಿಕೆಗಳ ನಿಯಮಗಳನ್ನು ಒಂದರನಂತರ ಒಂದು ಅನ್ವಯಿಸಲಾಗುತ್ತದೆ. ಯಾವುದನ್ನೂ ಊಹಿಸಲಾಗುವುದಿಲ್ಲ.',
    },
    {
      title: 'ಹೇಳಿಕೆಗಳನ್ನು ಯೋಜನೆ ದಾಖಲೆಗಳೊಂದಿಗೆ ಹೋಲಿಸಲಾಗುತ್ತದೆ',
      body: 'ಪರಿಚಿತ ಯೋಜನೆ ಉಲ್ಲೇಖಿಸಿದರೆ, ಅದರ ಹೇಳಿಕೆಯನ್ನು ಪ್ರಸ್ತುತ ಲಭ್ಯವಿರುವ ಯೋಜನೆ ಮಾಹಿತಿಯೊಂದಿಗೆ ಹೋಲಿಸಿ ಬೆಂಬಲಿತ, ವಿರೋಧಿಸಲಾಗಿದೆ ಅಥವಾ ಪರಿಶೀಲಿಸಲಾಗಿಲ್ಲ ಎಂದು ಗುರುತಿಸಲಾಗುತ್ತದೆ.',
    },
  ],

  // ── Limitations ─────────────────────────────────────────────────────────
  limitsEyebrow: 'ಮಿತಿಗಳು',
  limitsTitle: 'ಈ ಉಪಕರಣ ಏನು ಮಾಡಲಾರದು',
  limits: [
    'ಇದು ಸಂದೇಶ ನಿಜವಾದದ್ದು ಎಂದು ಸಾಬೀತುಪಡಿಸಲಾರದು. “ಎಚ್ಚರಿಕೆ ಸೂಚಕಗಳಿಲ್ಲ” ಎಂದರೆ ಈ ಪರಿಶೀಲಕವು ತಿಳಿದಿರುವ ಯಾವುದೇ ಮಾದರಿಗಳು ಕಂಡುಬಂದಿಲ್ಲ ಎಂದು ಮಾತ್ರ.',
    'ಇದು ಖಾತೆ ನಿರ್ಬಂಧಿಸಲು, ಪಾವತಿ ಹಿಂಪಡೆಯಲು ಅಥವಾ ನಿಮ್ಮ ಇತರ ಸಂದೇಶಗಳನ್ನು ಓದಲು ಸಾಧ್ಯವಿಲ್ಲ.',
    'ವಂಚಕರು ತಮ್ಮ ಪದಗಳನ್ನು ಬದಲಾಯಿಸುತ್ತಲೇ ಇರುತ್ತಾರೆ, ಆದ್ದರಿಂದ ಹೊಸ ತಂತ್ರ ಇನ್ನೂ ಗುರುತಾಗದಿರಬಹುದು.',
    'ಇದು ಅಪಾಯ ಸೂಚಕಗಳನ್ನು ನೀಡುತ್ತದೆ, ಬ್ಯಾಂಕ್, ಕಾನೂನು ಅಥವಾ ಸರ್ಕಾರಿ ನಿರ್ಧಾರವಲ್ಲ.',
  ],

  // ── Action guidance + emergency channels ────────────────────────────────
  actionEyebrow: 'ಏನು ಮಾಡಬೇಕು',
  actionTitle: 'ನೀವು ಗುರಿಯಾಗಿರಬಹುದು ಎಂದು ಭಾವಿಸಿದರೆ',
  actionSteps: [
    'ಉತ್ತರಿಸಬೇಡಿ, ಲಿಂಕ್ ಕ್ಲಿಕ್ ಮಾಡಬೇಡಿ ಮತ್ತು OTP, PIN ಅಥವಾ ಪಾಸ್‌ವರ್ಡ್ ಹಂಚಿಕೊಳ್ಳಬೇಡಿ.',
    'ಪ್ರಯೋಜನ ಅನ್‌ಲಾಕ್ ಅಥವಾ ಸಕ್ರಿಯಗೊಳಿಸಲು ಹಣ ಕಳುಹಿಸಬೇಡಿ.',
    'ಅಧಿಕೃತ ಪೋರ್ಟಲ್, ಬ್ಯಾಂಕ್ ಶಾಖೆ ಅಥವಾ ಗ್ರಾಮ ಪಂಚಾಯತ್ ಕಚೇರಿಯಲ್ಲಿ ನೇರವಾಗಿ ಪರಿಶೀಲಿಸಿ.',
    'ಹಣ ಈಗಾಗಲೇ ಹೋಗಿದ್ದರೆ, ಸೈಬರ್ ಅಪರಾಧ ಸಹಾಯವಾಣಿ 1930 ಗೆ ಬೇಗ ಕರೆ ಮಾಡಿ.',
  ],
  helplineTileLabel: 'ರಾಷ್ಟ್ರೀಯ ಸೈಬರ್ ಅಪರಾಧ ಸಹಾಯವಾಣಿ',
  helplineTileValue: '1930 ಗೆ ಕರೆ ಮಾಡಿ',
  helplineTileNote: 'ಆನ್‌ಲೈನ್ ಹಣಕಾಸು ವಂಚನೆಗಾಗಿ',
  reportTileLabel: 'ಅಧಿಕೃತ ಪೋರ್ಟಲ್‌ನಲ್ಲಿ ವರದಿ ಮಾಡಿ',
  reportTileValue: 'cybercrime.gov.in',
  reportTileNote: 'ಭಾರತ ಸರ್ಕಾರ',

  // ── Empty / low-risk result ─────────────────────────────────────────────
  cleanHeadline: 'ಯಾವುದೇ ಸಾಮಾನ್ಯ ವಂಚನೆ ಮಾದರಿಗಳು ಕಂಡುಬಂದಿಲ್ಲ',
  cleanBody:
    'ಸಂದೇಶವನ್ನು ಒತ್ತಾಯದ ಆತುರ, ಅನಧಿಕೃತ ಶುಲ್ಕ, ಖಾಸಗಿ UPI ವಿನಂತಿ ಮತ್ತು OTP ಸಂಗ್ರಹದ ನಿಯಮಗಳೊಂದಿಗೆ ಪರಿಶೀಲಿಸಲಾಗಿದೆ. ಯಾವುದೂ ಹೊಂದಿಕೆಯಾಗಿಲ್ಲ.',
};

export const copy = { en, kn };
