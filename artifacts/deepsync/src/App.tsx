import "./i18n";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import Dashboard from "@/pages/Dashboard";
import AlertPanel from "@/pages/AlertPanel";
import SettingsPanel from "@/pages/SettingsPanel";
import ReportsPanel from "@/pages/ReportsPanel";
import TranslatePanel from "@/pages/TranslatePanel";
import UsersPanel from "@/pages/UsersPanel";
import LoginPage from "@/pages/LoginPage";
import LanguageSwitcher from "@/components/LanguageSwitcher";

interface AuthUser {
  id: number; email: string; full_name: string;
  role: "admin" | "engineer" | "viewer";
  company_name: string; language: string; max_projects: number;
}

const ROLE_COLORS: Record<string, string> = { admin: "#E74C3C", engineer: "#2E86DE", viewer: "#27AE60" };
const ROLE_LABELS: Record<string, string> = { admin: "Admin", engineer: "Ingénieur", viewer: "Viewer" };

export default function App() {
  const { t, i18n } = useTranslation();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [deviceId, setDeviceId] = useState("NODE_01");
  const [projectId, setProjectId] = useState("PROJ_001");

  const isRTL = i18n.language === "ar";

  if (!user) return <LoginPage onLogin={u => setUser(u)} />;

  const tabs = [
    { id: "dashboard",  label: t("nav.dashboard"),  roles: ["admin","engineer","viewer"] },
    { id: "alerts",     label: t("nav.alerts"),      roles: ["admin","engineer","viewer"] },
    { id: "reports",    label: t("nav.reports"),     roles: ["admin","engineer","viewer"] },
    { id: "settings",   label: t("nav.settings"),    roles: ["admin","engineer","viewer"] },
    { id: "users",      label: "👥 " + t("nav.users", { defaultValue: "المستخدمون" }), roles: ["admin"] },
    { id: "translate",  label: t("nav.translate"),   roles: ["admin","engineer","viewer"] },
  ].filter(tab => tab.roles.includes(user.role));

  return (
    <div style={{ background: "#F5F7FA", minHeight: "100vh", fontFamily: "Inter, sans-serif", direction: isRTL ? "rtl" : "ltr" }}>
      {/* Header */}
      <header style={{ background: "linear-gradient(135deg, #1F4E79 0%, #2E86DE 100%)", color: "#fff", padding: "12px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.18)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ fontSize: "26px" }}>🏗️</div>
          <div>
            <div style={{ fontSize: "20px", fontWeight: "bold", letterSpacing: "-0.4px" }}>DeepSync Platform</div>
            <div style={{ fontSize: "11px", opacity: 0.75 }}>Surveillance Géotechnique Intelligente v1.0.0</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          {/* Device */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(255,255,255,0.15)", padding: "6px 12px", borderRadius: "8px" }}>
            <span style={{ fontSize: "11px", opacity: 0.8 }}>📡 {t("dashboard.device")}:</span>
            <input value={deviceId} onChange={e => setDeviceId(e.target.value)}
              style={{ background: "transparent", border: "none", color: "#fff", fontSize: "13px", fontWeight: "bold", width: "72px", outline: "none" }} />
          </div>
          {/* Project */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(255,255,255,0.15)", padding: "6px 12px", borderRadius: "8px" }}>
            <span style={{ fontSize: "11px", opacity: 0.8 }}>🗂 {t("dashboard.project")}:</span>
            <input value={projectId} onChange={e => setProjectId(e.target.value)}
              style={{ background: "transparent", border: "none", color: "#fff", fontSize: "13px", fontWeight: "bold", width: "72px", outline: "none" }} />
          </div>

          <LanguageSwitcher />

          {/* User badge */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(255,255,255,0.15)", padding: "6px 12px", borderRadius: "8px", fontSize: "13px" }}>
            <span>👤</span>
            <div>
             <div style={{ fontWeight: "700", fontSize: "13px" }}>{user.full_name?.split(" ")?.[0] || "User"}</div>
              <div style={{ fontSize: "10px", opacity: 0.8 }}>{user.company_name}</div>
            </div>
            <span style={{ background: ROLE_COLORS[user.role], color: "#fff", padding: "2px 8px", borderRadius: "10px", fontSize: "10px", fontWeight: "bold" }}>
              {ROLE_LABELS[user.role]}
            </span>
          </div>

          {/* Logout */}
          <button onClick={() => setUser(null)} title={t("nav.logout")}
            style={{ background: "rgba(231,76,60,0.25)", border: "1.5px solid rgba(231,76,60,0.5)", color: "#fff", padding: "6px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "13px" }}>
            🚪
          </button>
        </div>
      </header>

      {/* Nav */}
      <nav style={{ background: "#fff", padding: "0 28px", display: "flex", gap: "4px", borderBottom: "2px solid #E5E7EB", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ padding: "13px 20px", border: "none", background: "transparent", color: activeTab === tab.id ? "#1F4E79" : "#6B7280", fontWeight: activeTab === tab.id ? "700" : "400", borderBottom: activeTab === tab.id ? "3px solid #1F4E79" : "3px solid transparent", cursor: "pointer", fontSize: "14px", transition: "all 0.15s", marginBottom: "-2px", whiteSpace: "nowrap" }}>
            {tab.label}
          </button>
        ))}
        {user.role === "admin" && (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#E74C3C", fontWeight: "600" }}>
            🔑 Admin — {user.email}
          </div>
        )}
      </nav>

      {/* Viewer banner */}
      {user.role === "viewer" && (
        <div style={{ background: "#FEF9E7", borderBottom: "1px solid #F39C12", padding: "8px 28px", fontSize: "13px", color: "#B7770D", display: "flex", alignItems: "center", gap: "8px" }}>
          👁️ {t("settings.viewer")} — Lecture seule / Read-only / للقراءة فقط
        </div>
      )}

      {/* Main */}
      <main style={{ padding: "24px", maxWidth: "1440px", margin: "0 auto" }}>
        {activeTab === "dashboard"  && <Dashboard deviceId={deviceId} projectId={projectId} />}
        {activeTab === "alerts"     && <AlertPanel projectId={projectId} />}
        {activeTab === "reports"    && <ReportsPanel projectId={projectId} />}
        {activeTab === "settings"   && <SettingsPanel projectId={projectId} currentUser={{ id: user.id, email: user.email, role: user.role }} />}
        {activeTab === "users"      && user.role === "admin"  && <UsersPanel currentUser={{ id: user.id, email: user.email, role: user.role }} />}
        {activeTab === "translate"  && <TranslatePanel />}
      </main>
    </div>
  );
}
