import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import fr from './locales/fr.json';
import en from './locales/en.json';

const STORAGE_KEY = 'smarttodoai-lang';

const detectBrowserLanguage = () => {
  try {
    const langs = navigator.languages && navigator.languages.length
      ? navigator.languages
      : [navigator.language];
    for (const lang of langs) {
      const lower = (lang || '').toLowerCase();
      if (lower.startsWith('fr')) return 'fr';
      if (lower.startsWith('en')) return 'en';
    }
  } catch (e) {
    // ignore detection errors
  }
  return 'fr';
};

const savedLang = localStorage.getItem(STORAGE_KEY);
const initialLang = savedLang || detectBrowserLanguage();

let userChanged = false;

i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    en: { translation: en },
  },
  lng: initialLang,
  fallbackLng: 'fr',
  interpolation: {
    escapeValue: false,
  },
});

i18n.on('languageChanged', (lng) => {
  if (userChanged) {
    localStorage.setItem(STORAGE_KEY, lng);
  }
});

export const setUserLanguage = (lng) => {
  userChanged = true;
  i18n.changeLanguage(lng);
};

export default i18n;
