import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";

interface AppUser {
  id: number; fullName: string; email: string; role: string;
  companyName: string; language: string; maxProjects: number;
  isActive: boolean; projectId: string | null;
  createdAt: string | null; lastLoginAt: string | null;
}

interface CurrentUser { id: number; email: string; role: string; }
interface Props { currentUser: CurrentUser; }

const ROLE_COLORS: Record<string, string> = { admin: "#E74C3C", engineer: "#2E86DE", viewer: "#27AE60" };
const ROLE_LABELS: Record<string, string> = { admin: "Admin", engineer: "Ingénieur", viewer: "Viewer" };
const LANG_FLAGS: Record<string, string> = { ar: "🇩🇿", fr: "🇫🇷", en: "🇬🇧" };

const EMPTY_FORM = { fullName: "", email: "", password: "", role: "viewer", companyName: "", language: "fr", maxProjects: 5, projectId: "PROJ_001" };

export default function UsersPanel({ currentUser }: Props) {
  const { t } = useTranslation();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<AppUser | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const headers = { "Content-Type": "application/json", "x-user-role": currentUser.role };

  const loadUsers = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/users", { headers });
      const data = await res.json() as { ok?: boolean; users?: AppUser[]; error?: string };
      if (data.ok) setUsers(data.users || []);
      else setError(data.error || "Erreur");
    } catch { setError("Impossible de charger les utilisateurs"); }
    setLoading(false);
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const openCreate = () => { setEditUser(null); setForm(EMPTY_FORM); setSaveMsg(""); setShowForm(true); };
  const openEdit = (u: AppUser) => {
    setEditUser(u);
    setForm({ fullName: u.fullName, email: u.email, password: "", role: u.role, companyName: u.companyName, language: u.language, maxProjects: u.maxProjects, projectId: u.projectId || "PROJ_001" });
    setSaveMsg(""); setShowForm(true);
  };

  const saveUser = async () => {
    if (!form.fullName || !form.email || (!editUser && !form.password)) {
      setSaveMsg("❌ الاسم والبريد وكلمة المرور مطلوبة"); return;
    }
    setSaving(true); setSaveMsg("");
    try {
      const url = editUser ? `/api/users/${editUser.id}` : "/api/users";
      const method = editUser ? "PUT" : "POST";
      const body = editUser
        ? { fullName: form.fullName, email: form.email, role: form.role, companyName: form.companyName, language: form.language, maxProjects: form.maxProjects, projectId: form.projectId, ...(form.password ? { password: form.password } : {}) }
        : form;
      const res = await fetch(url, { method, headers, body: JSON.stringify(body) });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (data.ok) {
        setSaveMsg("✅ تم الحفظ بنجاح");
        await loadUsers();
        setTimeout(() => { setShowForm(false); setSaveMsg(""); }, 1200);
      } else { setSaveMsg(`❌ ${data.error}`); }
    } catch { setSaveMsg("❌ خطأ في الاتصال"); }
    setSaving(false);
  };

  const deleteUser = async (id: number) => {
    if (!window.confirm("حذف هذا المستخدم نهائياً؟")) return;
    setDeleteId(id);
    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE", headers });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (data.ok) await loadUsers();
    } catch {}
    setDeleteId(null);
  };

  const toggleActive = async (u: AppUser) => {
    await fetch(`/api/users/${u.id}`, { method: "PUT", headers, body: JSON.stringify({ isActive: !u.isActive }) });
    await loadUsers();
  };

  const copyCredentials = (u: AppUser) => {
    const text = `🔐 DeepSync — Accès Plateforme\nEmail: ${u.email}\nRôle: ${ROLE_LABELS[u.role]}\nLien: ${window.location.origin}`;
    navigator.clipboard.writeText(text).then(() => { setCopied(u.email); setTimeout(() => setCopied(null), 2500); });
  };

  const f = (label: string, key: keyof typeof form, type = "text", extra?: React.InputHTMLAttributes<HTMLInputElement>) => (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <label style={{ fontSize: "12px", color: "#888", fontWeight: "600" }}>{label}</label>
      <input type={type} value={String(form[key])}
        onChange={e => setForm(p => ({ ...p, [key]: type === "number" ? Number(e.target.value) : e.target.value }))}
        style={{ padding: "8px 12px", borderRadius: "8px", border: "1.5px solid #E5E7EB", fontSize: "14px", background: "#FAFAFA", outline: "none" }}
        {...extra}
      />
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <div style={{ fontSize: "13px", color: "#888" }}>لوحة المدير — {currentUser.email}</div>
          <div style={{ fontSize: "20px", fontWeight: "700", color: "#E74C3C" }}>👥 إدارة المستخدمين</div>
        </div>
        <button onClick={openCreate}
          style={{ background: "#27AE60", color: "#fff", border: "none", padding: "11px 22px", borderRadius: "10px", cursor: "pointer", fontSize: "14px", fontWeight: "bold", display: "flex", alignItems: "center", gap: "8px" }}>
          ➕ إضافة مستخدم جديد
        </button>
      </div>

      {/* Stats bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "20px" }}>
        {[
          { label: "المجموع", value: users.length, color: "#1F4E79", icon: "👥" },
          { label: "المديرون", value: users.filter(u => u.role === "admin").length, color: "#E74C3C", icon: "🔑" },
          { label: "المهندسون", value: users.filter(u => u.role === "engineer").length, color: "#2E86DE", icon: "⚙️" },
          { label: "نشطون", value: users.filter(u => u.isActive).length, color: "#27AE60", icon: "✅" },
        ].map(s => (
          <div key={s.label} style={{ background: "#fff", padding: "14px", borderRadius: "10px", boxShadow: "0 2px 6px rgba(0,0,0,0.06)", textAlign: "center" }}>
            <div style={{ fontSize: "22px" }}>{s.icon}</div>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: s.color }}>{s.value}</div>
            <div style={{ fontSize: "12px", color: "#888" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Form modal */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ background: "#fff", borderRadius: "16px", padding: "28px", width: "100%", maxWidth: "500px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ margin: 0, color: "#1F4E79", fontSize: "18px" }}>{editUser ? "✏️ تعديل المستخدم" : "➕ مستخدم جديد"}</h3>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#888" }}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {f("الاسم الكامل", "fullName")}
              {f("البريد الإلكتروني", "email", "email")}
              {f(editUser ? "كلمة مرور جديدة (اتركها فارغة للإبقاء)" : "كلمة المرور *", "password", "password", editUser ? {} : { required: true })}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "12px", color: "#888", fontWeight: "600" }}>الدور</label>
                <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                  style={{ padding: "8px 12px", borderRadius: "8px", border: "1.5px solid #E5E7EB", fontSize: "14px", background: "#FAFAFA" }}>
                  <option value="admin">🔑 Admin — مدير (صلاحيات كاملة)</option>
                  <option value="engineer">⚙️ Ingénieur — مهندس (قراءة + إعدادات)</option>
                  <option value="viewer">👁️ Viewer — مشاهد (قراءة فقط)</option>
                </select>
              </div>
              {f("اسم الشركة", "companyName")}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "12px", color: "#888", fontWeight: "600" }}>اللغة الافتراضية</label>
                <select value={form.language} onChange={e => setForm(p => ({ ...p, language: e.target.value }))}
                  style={{ padding: "8px 12px", borderRadius: "8px", border: "1.5px solid #E5E7EB", fontSize: "14px", background: "#FAFAFA" }}>
                  <option value="ar">🇩🇿 العربية</option>
                  <option value="fr">🇫🇷 Français</option>
                  <option value="en">🇬🇧 English</option>
                </select>
              </div>
              {f("رقم المشروع", "projectId")}
              {f("عدد المشاريع المسموحة", "maxProjects", "number")}
            </div>
            {saveMsg && (
              <div style={{ marginTop: "14px", padding: "10px 14px", borderRadius: "8px", background: saveMsg.startsWith("✅") ? "#E8F5E9" : "#FDECEA", color: saveMsg.startsWith("✅") ? "#27AE60" : "#E74C3C", fontWeight: "600", fontSize: "13px" }}>
                {saveMsg}
              </div>
            )}
            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <button onClick={saveUser} disabled={saving}
                style={{ background: saving ? "#CBD5E1" : "#1F4E79", color: "#fff", border: "none", padding: "11px 0", borderRadius: "10px", cursor: saving ? "not-allowed" : "pointer", fontSize: "14px", fontWeight: "bold", flex: 1 }}>
                {saving ? "⏳ جارٍ الحفظ..." : "💾 حفظ"}
              </button>
              <button onClick={() => setShowForm(false)}
                style={{ background: "#F5F7FA", color: "#555", border: "1.5px solid #E5E7EB", padding: "11px 20px", borderRadius: "10px", cursor: "pointer", fontSize: "14px" }}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Users list */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#888" }}>⏳ جارٍ التحميل...</div>
      ) : error ? (
        <div style={{ background: "#FDECEA", padding: "16px", borderRadius: "10px", color: "#E74C3C", textAlign: "center" }}>{error}</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {users.map(u => (
            <div key={u.id}
              style={{ background: "#fff", border: `1.5px solid ${u.isActive ? "#E5E7EB" : "#F0F0F0"}`, borderLeft: `4px solid ${ROLE_COLORS[u.role] || "#888"}`, borderRadius: "10px", padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", opacity: u.isActive ? 1 : 0.6 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "4px" }}>
                  <span style={{ fontWeight: "700", fontSize: "15px", color: "#222" }}>{u.fullName}</span>
                  <span style={{ background: ROLE_COLORS[u.role] + "20", color: ROLE_COLORS[u.role], padding: "2px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "bold" }}>
                    {ROLE_LABELS[u.role]}
                  </span>
                  {!u.isActive && <span style={{ background: "#F0F0F0", color: "#888", padding: "2px 8px", borderRadius: "10px", fontSize: "11px" }}>معطّل</span>}
                  {u.id === currentUser.id && <span style={{ background: "#E8F5E9", color: "#27AE60", padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: "bold" }}>أنت</span>}
                </div>
                <div style={{ fontSize: "12px", color: "#888" }}>
                  📧 {u.email} · 🏢 {u.companyName || "—"} · {LANG_FLAGS[u.language] || "🌐"} · 🗂 {u.projectId || "—"}
                </div>
                <div style={{ fontSize: "11px", color: "#aaa", marginTop: "3px" }}>
                  أُنشئ: {u.createdAt ? new Date(u.createdAt).toLocaleDateString("fr-FR") : "—"} · آخر دخول: {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString("fr-FR") : "لم يدخل بعد"}
                </div>
              </div>
              {/* Action buttons */}
              <div style={{ display: "flex", gap: "8px", flexShrink: 0, marginRight: "8px" }}>
                {/* Copy credentials */}
                <button onClick={() => copyCredentials(u)} title="نسخ بيانات الوصول"
                  style={{ background: copied === u.email ? "#27AE60" : "#F0F9F6", color: copied === u.email ? "#fff" : "#27AE60", border: `1.5px solid ${copied === u.email ? "#27AE60" : "#B7E4D0"}`, padding: "6px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "600", transition: "all 0.2s" }}>
                  {copied === u.email ? "✅ نُسخ" : "📋 مشاركة"}
                </button>
                {/* Toggle active */}
                {u.id !== currentUser.id && (
                  <button onClick={() => toggleActive(u)} title={u.isActive ? "تعطيل" : "تفعيل"}
                    style={{ background: u.isActive ? "#FEF9E7" : "#E8F5E9", color: u.isActive ? "#B7770D" : "#27AE60", border: `1.5px solid ${u.isActive ? "#F39C1240" : "#27AE6040"}`, padding: "6px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "13px" }}>
                    {u.isActive ? "⏸ تعطيل" : "▶️ تفعيل"}
                  </button>
                )}
                {/* Edit */}
                <button onClick={() => openEdit(u)}
                  style={{ background: "#EBF5FB", color: "#2E86DE", border: "1.5px solid #AED6F1", padding: "6px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "13px" }}>
                  ✏️ تعديل
                </button>
                {/* Delete */}
                {u.id !== currentUser.id && (
                  <button onClick={() => deleteUser(u.id)} disabled={deleteId === u.id}
                    style={{ background: "#FDECEA", color: "#E74C3C", border: "1.5px solid #F5B7B1", padding: "6px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "13px" }}>
                    {deleteId === u.id ? "⏳" : "🗑 حذف"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info box */}
      <div style={{ marginTop: "20px", background: "#EBF5FB", border: "1.5px solid #2E86DE30", borderRadius: "12px", padding: "14px 18px", fontSize: "12px", color: "#555", lineHeight: "1.8" }}>
        <strong style={{ color: "#1F4E79" }}>💡 كيف تشارك الوصول:</strong><br/>
        1. اضغط <strong>➕ إضافة مستخدم</strong> وأدخل بيانات الشخص<br/>
        2. اضغط <strong>📋 مشاركة</strong> على الحساب لنسخ رسالة تحتوي البريد والرابط<br/>
        3. أرسل الرسالة عبر WhatsApp أو Email مع كلمة المرور التي اخترتها<br/>
        4. يمكنك <strong>⏸ تعطيل</strong> الحساب في أي وقت دون حذفه
      </div>
    </div>
  );
}
