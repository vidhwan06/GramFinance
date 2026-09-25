export const APP_NAME = 'GramFinance';
export const APP_TAGLINE = 'Understand. Verify. Decide Safely.';
export const HELPLINE_CYBERCRIME = '1930';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'kn', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ' },
] as const;

export const DEFAULT_LANGUAGE = 'en';

export const NAV_LINKS = [
  { href: '/home', labelKey: 'nav.home', icon: 'Home' },
  { href: '/learn', labelKey: 'nav.learn', icon: 'BookOpen' },
  { href: '/loan', labelKey: 'nav.loan', icon: 'Calculator' },
  { href: '/check', labelKey: 'nav.check', icon: 'ShieldAlert' },
  { href: '/schemes', labelKey: 'nav.schemes', icon: 'Landmark' },
  { href: '/assistant', labelKey: 'nav.assistant', icon: 'MessageSquare' },
] as const;
