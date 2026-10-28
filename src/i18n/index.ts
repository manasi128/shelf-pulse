import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import hi from './locales/hi.json';
import mr from './locales/mr.json';
import ta from './locales/ta.json';
import bn from './locales/bn.json';

export const LANGUAGES = [
  { code: 'en', native: 'English' },
  { code: 'hi', native: 'हिन्दी' },
  { code: 'mr', native: 'मराठी' },
  { code: 'ta', native: 'தமிழ்' },
  { code: 'bn', native: 'বাংলা' },
] as const;

export type LangCode = (typeof LANGUAGES)[number]['code'];

const STORAGE_KEY = 'shelfpulse.lang';

function savedLanguage(): LangCode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v && LANGUAGES.some((l) => l.code === v)) return v as LangCode;
  } catch {
    // Storage blocked (private mode, previews): fall back to English.
  }
  return 'en';
}

export function setLanguage(code: LangCode) {
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // Non-critical: the choice just won't persist.
  }
  void i18n.changeLanguage(code);
}

i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
});

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hi: { translation: hi },
    mr: { translation: mr },
    ta: { translation: ta },
    bn: { translation: bn },
  },
  lng: savedLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
});

document.documentElement.lang = i18n.language;

export default i18n;
