import React from 'react';
import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const languages = [
    { code: 'ar', label: '🇸🇦 العربية', dir: 'rtl' },
    { code: 'fr', label: '🇫🇷 Français', dir: 'ltr' },
    { code: 'en', label: '🇬🇧 English', dir: 'ltr' },
  ];

  const changeLanguage = (langCode) => {
    i18n.changeLanguage(langCode);
    localStorage.setItem('deepsync_lang', langCode);
    // تغيير اتجاه الصفحة
    const lang = languages.find(l => l.code === langCode);
    if (lang) {
      document.documentElement.dir = lang.dir;
      document.documentElement.lang = langCode;
    }
  };

  const currentLang = i18n.language || 'ar';
  const currentLangObj = languages.find(l => l.code === currentLang) || languages[0];

  return (
    <div style={{
      position: 'relative',
      display: 'inline-block',
    }}>
      <button
        onClick={() => {
          const current = document.getElementById('lang-dropdown');
          current.style.display = current.style.display === 'block' ? 'none' : 'block';
        }}
        style={{
          padding: '8px 16px',
          borderRadius: '8px',
          border: '1px solid #D1D5DB',
          background: 'white',
          cursor: 'pointer',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        {currentLangObj.label}
        <span style={{ fontSize: '12px' }}>▼</span>
      </button>

      <div
        id="lang-dropdown"
        style={{
          display: 'none',
          position: 'absolute',
          top: '100%',
          left: 0,
          marginTop: '4px',
          background: 'white',
          border: '1px solid #D1D5DB',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          minWidth: '160px',
          zIndex: 1000,
        }}
      >
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => {
              changeLanguage(lang.code);
              document.getElementById('lang-dropdown').style.display = 'none';
            }}
            style={{
              display: 'block',
              width: '100%',
              padding: '10px 16px',
              border: 'none',
              background: currentLang === lang.code ? '#E5E7EB' : 'transparent',
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: '14px',
              borderRadius: '4px',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#F3F4F6';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = currentLang === lang.code ? '#E5E7EB' : 'transparent';
            }}
          >
            {lang.label}
          </button>
        ))}
      </div>
    </div>
  );
}