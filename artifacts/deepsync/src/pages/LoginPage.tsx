import { useState } from 'react';
import { useTranslation } from 'react-i18next';

// 1. تحديث الحسابات الافتراضية الصارمة الخاصة بمنصة RAYGEO
const QUICK_LOGINS = [
  { email: 'khalirayane126@gmail.com', password: '111111', label: 'Rayane (Super Admin)', role: 'super_admin' },
  { email: 'rayray@sec',             password: '0000',   label: 'Client Default',         role: 'client'      },
];

// ألوان النيون التفاعلية للمنصة
const ROLE_COLORS: Record<string, string> = { 
  super_admin: '#00E676', // أخضر زمردي متوهج للمنطقة الآمنة وصاحب المنصة
  client: '#FFD600'       // أصفر فوسفوري مشع للمقاولين
};

const ROLE_LABELS: Record<string, string> = { 
  super_admin: 'المدير المطلق / Super Admin', 
  client: 'العميل المقاول / Client' 
};

interface Props {
  onLogin: (user: any) => void;
}

export default function LoginPage({ onLogin }: Props) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // دالة تسجيل الدخول والربط مع السيرفر الخلفي
 const handleLogin = async () => {
    // ... الكود السابق
    try {
      // ضع الرابط الكامل للخادم هنا بدلاً من /api/...
      const response = await fetch('https://workspaceapi-server-production-4fc8.up.railway.app/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (response.ok && data.ok) {
        onLogin(data.user);
      } else {
        setError(data.error || "Email ou mot de passe incorrect");
      }
    } catch (err) {
      setError("Erreur de connexion au serveur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      // الخلفية الزرقاء الليلية العميقة والغامقة جداً التي تعكس عمق التربة
      backgroundColor: '#0B111E', 
      backgroundImage: 'radial-gradient(circle at center, #111a2e 0%, #0B111E 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', flexDirection: 'column',
      fontFamily: 'sans-serif'
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        
        {/* الهوية البصرية الفاخرة لـ RAYGEO */}
        <div style={{ textAlign: 'center', marginBottom: '35px' }}>
          <h1 style={{ 
            color: '#00E676', 
            fontSize: '56px', 
            fontWeight: '900', 
            margin: 0, 
            textShadow: '0 0 25px rgba(0, 230, 118, 0.6)',
            letterSpacing: '3px'
          }}>
            RAYGEO
          </h1>
          <p style={{ color: '#8fa0bc', fontSize: '14px', marginTop: '5px', letterSpacing: '1px' }}>
            Cyber-Geotechnical Monitoring Platform
          </p>
        </div>

        {/* صندوق إدخال البيانات */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '20px', 
          background: 'rgba(11, 17, 30, 0.8)', 
          padding: '30px', 
          borderRadius: '16px', 
          border: '1px solid rgba(0, 230, 118, 0.25)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
        }}>
          {error && (
            <div style={{ color: '#FF1744', fontSize: '13px', textAlign: 'center', fontWeight: 'bold' }}>
              ⚠️ {error}
            </div>
          )}

          <input 
            type="email" 
            placeholder="Email Address" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            style={inputStyle} 
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            style={inputStyle} 
          />
          
          <button onClick={handleLogin} disabled={loading} style={btnStyle}>
            {loading ? 'LOADING...' : 'CONNEXION / دخول'}
          </button>
        </div>

        {/* أزرار الدخول السريع المحدثة بحساباتك الرسمية */}
        <div style={{ marginTop: '25px', opacity: 0.9 }}>
          <div style={{ color: '#8fa0bc', fontSize: '12px', marginBottom: '12px', textAlign: 'center' }}>
            🔑 تفعيل الدخول السريع الآمن لـ RAYGEO
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {QUICK_LOGINS.map(u => (
              <button 
                key={u.email} 
                onClick={() => { setEmail(u.email); setPassword(u.password); }}
                style={{ 
                  background: 'rgba(255,255,255,0.03)', 
                  border: '1px solid rgba(255,255,255,0.08)', 
                  borderRadius: '8px', 
                  padding: '12px', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  color: '#fff', 
                  fontSize: '12px',
                  transition: '0.3s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
              >
                <span style={{ fontWeight: '500' }}>{u.label}</span>
                <span style={{ 
                  color: ROLE_COLORS[u.role], 
                  fontWeight: 'bold',
                  textShadow: `0 0 8px ${ROLE_COLORS[u.role]}44`
                }}>
                  {ROLE_LABELS[u.role]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* حقوق النشر */}
        <p style={{ color: '#8fa0bc', fontSize: '11px', marginTop: '40px', textAlign: 'center', opacity: 0.7 }}>
          © 2026 RAYGEO - All Rights Reserved
        </p>
      </div>
    </div>
  );
}

// الأنماط الجمالية للموقع (Styles)
const inputStyle: React.CSSProperties = {
  padding: '14px', 
  borderRadius: '8px', 
  border: '1px solid rgba(0, 230, 118, 0.3)', 
  background: '#070c16', 
  color: '#fff', 
  width: '100%', 
  boxSizing: 'border-box',
  outline: 'none',
  fontSize: '14px'
};

const btnStyle: React.CSSProperties = {
  padding: '14px', 
  borderRadius: '8px', 
  border: 'none', 
  color: '#fff', 
  fontSize: '15px', 
  fontWeight: 'bold', 
  cursor: 'pointer', 
  background: 'linear-gradient(90deg, #00B0FF, #00E676)', 
  boxShadow: '0 4px 15px rgba(0, 230, 118, 0.3)',
  transition: '0.3s'
};