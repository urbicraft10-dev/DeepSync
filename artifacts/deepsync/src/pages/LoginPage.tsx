import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const API_URL = import.meta.env.VITE_API_URL;
console.log("API_URL:", API_URL);

interface User {
  id: number; email: string; full_name: string;
  role: 'admin' | 'engineer' | 'viewer';
  company_name: string; language: string; max_projects: number;
}

const QUICK_LOGINS = [
  { email: 'admin@deepsync.dz',     password: 'admin123', label: 'Mohammed Amine Bensalem', role: 'admin'    },
  { email: 'ingenieur@chantier.dz', password: 'eng123',   label: 'Karim Boudiaf',           role: 'engineer' },
  { email: 'viewer@site.dz',        password: 'view123',  label: 'Sara Mansouri',            role: 'viewer'   },
];

const ROLE_COLORS: Record<string, string> = { admin: '#E74C3C', engineer: '#2E86DE', viewer: '#27AE60' };
const ROLE_LABELS: Record<string, string> = { admin: 'مدير / Admin', engineer: 'مهندس / Ingénieur', viewer: 'مشاهد / Viewer' };

interface Props { onLogin: (user: User) => void; }

export default function LoginPage({ onLogin }: Props) {
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const isRTL = i18n.language === 'ar';

  const handleLogin = async () => {
    setError(''); setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json() as {
        ok?: boolean; error?: string;
        user?: { id: number; fullName: string; email: string; role: string; companyName: string; language: string; maxProjects: number; };
      };
      if (data.ok && data.user) {
        const u = data.user;
        onLogin({
          id: u.id, email: u.email, full_name: u.fullName,
          role: u.role as User['role'], company_name: u.companyName,
          language: u.language, max_projects: u.maxProjects,
        });
      } else {
        setError(data.error || 'Email ou mot de passe incorrect');
      }
    } catch {
      setError('Impossible de se connecter au serveur');
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1F4E79 0%, #2E86DE 50%, #1ABC9C 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', direction: isRTL ? 'rtl' : 'ltr',
    }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '52px', marginBottom: '8px' }}>🏗️</div>
          <h1 style={{ color: '#fff', fontSize: '28px', fontWeight: '800', margin: 0 }}>DeepSync</h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', marginTop: '6px' }}>{t('auth.subtitle')}</p>
        </div>

        {/* Login card */}
        <div style={{ background: '#fff', borderRadius: '16px', padding: '32px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
          <h2 style={{ margin: '0 0 24px', fontSize: '20px', color: '#1F4E79', textAlign: 'center' }}>
            🔐 {t('auth.login')}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <input
              type="email" placeholder={t('auth.email')} value={email}
              onChange={e => setEmail(e.target.value)} style={inputStyle}
            />
            <input
              type="password" placeholder={t('auth.password')} value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={inputStyle}
            />
            {error && (
              <div style={{ background: '#FDECEA', color: '#E74C3C', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', textAlign: 'center' }}>
                ❌ {error}
              </div>
            )}
            <button onClick={handleLogin} disabled={loading}
              style={{ ...btnStyle, background: loading ? '#aaa' : '#1F4E79' }}>
              {loading ? '⏳ ...' : `🚀 ${t('auth.login_btn')}`}
            </button>
          </div>
        </div>

        {/* Demo accounts */}
        <div style={{ marginTop: '20px', background: 'rgba(255,255,255,0.12)', borderRadius: '12px', padding: '16px', backdropFilter: 'blur(8px)' }}>
          <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '12px', fontWeight: '700', marginBottom: '12px', textAlign: 'center' }}>
            🔑 {t('auth.demo_hint')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {QUICK_LOGINS.map(u => (
              <button key={u.email} onClick={() => { setEmail(u.email); setPassword(u.password); }}
                style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '8px', padding: '10px 14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff', fontSize: '13px', transition: 'background 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.25)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}>
                <span>
                  <strong>{u.label}</strong>
                  <span style={{ opacity: 0.75, marginLeft: '6px', fontSize: '11px' }}>{u.email}</span>
                </span>
                <span style={{ background: ROLE_COLORS[u.role] + 'cc', color: '#fff', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold' }}>
                  {ROLE_LABELS[u.role]}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '11px 14px', borderRadius: '8px', border: '1.5px solid #E5E7EB',
  fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box', background: '#FAFAFA',
};
const btnStyle: React.CSSProperties = {
  padding: '12px', borderRadius: '10px', border: 'none',
  color: '#fff', fontSize: '15px', fontWeight: '700', cursor: 'pointer', width: '100%',
};
