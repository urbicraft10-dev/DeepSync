import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const LANGUAGES = [
  { code: 'ar', label: 'العربية', flag: '🇩🇿', dir: 'rtl' },
  { code: 'fr', label: 'Français', flag: '🇫🇷', dir: 'ltr' },
  { code: 'en', label: 'English', flag: '🇬🇧', dir: 'ltr' },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = LANGUAGES.find(l => l.code === i18n.language) ?? LANGUAGES[1];

  const change = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem('deepsync_lang', code);
    setOpen(false);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          padding: '7px 14px', borderRadius: '8px',
          border: '1.5px solid rgba(255,255,255,0.35)',
          background: 'rgba(255,255,255,0.15)',
          color: '#fff', cursor: 'pointer', fontSize: '13px',
          display: 'flex', alignItems: 'center', gap: '6px',
          backdropFilter: 'blur(4px)',
        }}
      >
        <span>{current.flag}</span>
        <span>{current.label}</span>
        <span style={{ fontSize: '10px', opacity: 0.8 }}>▼</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)',
          right: 0, background: '#fff',
          border: '1px solid #E5E7EB', borderRadius: '10px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          minWidth: '160px', zIndex: 1000, overflow: 'hidden',
        }}>
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => change(lang.code)}
              style={{
                display: 'flex', width: '100%', alignItems: 'center', gap: '10px',
                padding: '10px 16px', border: 'none',
                background: current.code === lang.code ? '#EBF5FB' : 'transparent',
                color: current.code === lang.code ? '#1F4E79' : '#333',
                cursor: 'pointer', fontSize: '14px', fontWeight: current.code === lang.code ? '700' : '400',
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: '18px' }}>{lang.flag}</span>
              <span>{lang.label}</span>
              {current.code === lang.code && <span style={{ marginLeft: 'auto', color: '#1F4E79' }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
