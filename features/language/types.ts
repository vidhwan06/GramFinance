import { Language } from '@/types/common';
import { TranslationKeys } from './translations/en';

export interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationKeys;
}
