import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// استيراد ملفات الترجمة
import ar from './locales/ar.json';
import fr from './locales/fr.json';
import en from './locales/en.json';

const resources = {
  ar: { translation: ar },
  fr: { translation: fr },
  en: { translation: en }
};

i18n
  .use(LanguageDetector)  // كشف اللغة من المتصفح
  .use(initReactI18next)  // ربط مع React
  .init({
    resources,
    fallbackLng: 'ar',    // اللغة الافتراضية: العربية
    supportedLngs: ['ar', 'fr', 'en'],
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'deepsync_lang',
    },
    react: {
      useSuspense: false
    }
  });

// تغيير اتجاه الصفحة (RTL/LTR) حسب اللغة
i18n.on('languageChanged', (lng) => {
  const isRTL = lng === 'ar';
  document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  document.documentElement.lang = lng;
});

export default i18n;