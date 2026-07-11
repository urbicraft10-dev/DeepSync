import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

const API_URL = import.meta.env.VITE_API_URL;

interface CurrentUser { id: number; email: string; role: string; }
interface Props { projectId: string; currentUser: CurrentUser; }
type TestStatus = "idle" | "sending" | "ok" | "error";

async function saveContactsToDb(userId: number, userRole: string, alertEmail: string, alertPhone: string) {
  await fetch(`${API_URL}/api/users/${userId}/contacts`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "x-user-id": String(userId), "x-user-role": userRole },
    body: JSON.stringify({ alertEmail: alertEmail || null, alertPhone: alertPhone || null }),
  });
}

// Per-user localStorage keys
function userKey(email: string, field: string) { return `deepsync_${email}_${field}`; }

export default function SettingsPanel({ projectId, currentUser }: Props) {
  const { t } = useTranslation();
  const isAdmin = currentUser.role === "admin" || currentUser.role === "engineer";

  // ── Personal contact info (all roles) ─────────────────────────────────────
  const [myEmail, setMyEmail] = useState(() => localStorage.getItem(userKey(currentUser.email, "alert_email")) || currentUser.email);
  const [myPhone, setMyPhone] = useState(() => localStorage.getItem(userKey(currentUser.email, "alert_phone")) || "");
  const [personalSaved, setPersonalSaved] = useState(false);
  const [emailStatus, setEmailStatus] = useState<TestStatus>("idle");
  const [emailMsg, setEmailMsg] = useState("");
  const [smsStatus, setSmsStatus] = useState<TestStatus>("idle");
  const [smsMsg, setSmsMsg] = useState("");

  // ── Platform settings (admin/engineer only) ────────────────────────────────
  const [cfg, setCfg] = useState({
    sfFinal: 200.0, dangerRateMmH: 5.0, consecutiveThreshold: 2, cooldownMinutes: 10,
    enableSms: true, enableEmail: true, enablePush: true,
    smsProvider: "twilio", mqttHost: "mosquitto", mqttPort: 1883,
    readInterval: 30, sendInterval: 60,
  });
  const [platformSaved, setPlatformSaved] = useState(false);

  // Sync global alert contact to localStorage on load
  useEffect(() => {
    if (myEmail) localStorage.setItem("deepsync_alert_email", myEmail);
    if (myPhone) localStorage.setItem("deepsync_alert_phone", myPhone);
  }, []);

  const savePersonal = async () => {
    // Save to localStorage (local session)
    localStorage.setItem(userKey(currentUser.email, "alert_email"), myEmail);
    localStorage.setItem(userKey(currentUser.email, "alert_phone"), myPhone);
    localStorage.setItem("deepsync_alert_email", myEmail);
    localStorage.setItem("deepsync_alert_phone", myPhone);
    // Save to DB (broadcast alerts will use this)
    await saveContactsToDb(currentUser.id, currentUser.role, myEmail, myPhone);
    setPersonalSaved(true);
    setTimeout(() => setPersonalSaved(false), 2500);
  };

  const savePlatform = () => {
    setPlatformSaved(true);
    setTimeout(() => setPlatformSaved(false), 2500);
  };

  const testEmail = async () => {
    if (!myEmail || !myEmail.includes("@")) { setEmailMsg("أدخل بريداً صحيحاً أولاً"); setEmailStatus("error"); return; }
    setEmailStatus("sending"); setEmailMsg("");
    try {
      const res = await fetch(`${API_URL}/api/alerts/test-email`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to: myEmail }) });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (res.ok && data.ok) { setEmailStatus("ok"); setEmailMsg(`✅ أُرسل إلى ${myEmail}`); }
      else { setEmailStatus("error"); setEmailMsg(`❌ ${data.error || "فشل"}`); }
    } catch { setEmailStatus("error"); setEmailMsg("❌ خطأ في الاتصال"); }
    setTimeout(() => { setEmailStatus("idle"); setEmailMsg(""); }, 6000);
  };

  const testSms = async () => {
    if (!myPhone || !myPhone.startsWith("+")) { setSmsMsg("الرقم يجب أن يبدأ بـ + مثال: +213555001122"); setSmsStatus("error"); return; }
    setSmsStatus("sending"); setSmsMsg("");
    try {
      const res = await fetch(`${API_URL}/api/alerts/test-sms`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: myPhone }) });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (res.ok && data.ok) { setSmsStatus("ok"); setSmsMsg(`✅ SMS أُرسل إلى ${myPhone}`); }
      else { setSmsStatus("error"); setSmsMsg(`❌ ${data.error || "فشل"}`); }
    } catch { setSmsStatus("error"); setSmsMsg("❌ خطأ في الاتصال"); }
    setTimeout(() => { setSmsStatus("idle"); setSmsMsg(""); }, 6000);
  };

  const testBtn = (label: string, status: TestStatus, onClick: () => void, color: string) => (
    <button onClick={onClick} disabled={status === "sending"}
      style={{ background: status === "ok" ? "#27AE60" : status === "error" ? "#E74C3C" : status === "sending" ? "#CBD5E1" : color, color: "#fff", border: "none", padding: "8px 14px", borderRadius: "8px", cursor: status === "sending" ? "not-allowed" : "pointer", fontSize: "13px", fontWeight: "bold", whiteSpace: "nowrap", transition: "background 0.3s", flexShrink: 0 }}>
      {status === "sending" ? "⏳" : status === "ok" ? "✅" : status === "error" ? "❌" : label}
    </button>
  );

  const pField = (label: string, key: keyof typeof cfg, type = "text", unit = "") => (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <label style={{ fontSize: "12px", color: "#888", fontWeight: "600" }}>{label}</label>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <input type={type} value={cfg[key] as string | number}
          onChange={e => setCfg(p => ({ ...p, [key]: type === "number" ? Number(e.target.value) : e.target.value }))}
          style={{ padding: "8px 12px", borderRadius: "8px", border: "1.5px solid #E5E7EB", fontSize: "14px", flex: 1, outline: "none", background: "#FAFAFA" }} />
        {unit && <span style={{ fontSize: "12px", color: "#888", whiteSpace: "nowrap" }}>{unit}</span>}
      </div>
    </div>
  );

  const toggle = (label: string, key: "enableSms" | "enableEmail" | "enablePush", desc: string) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #F0F0F0" }}>
      <div>
        <div style={{ fontSize: "14px", fontWeight: "600", color: "#333" }}>{label}</div>
        <div style={{ fontSize: "12px", color: "#888" }}>{desc}</div>
      </div>
      <div onClick={() => setCfg(p => ({ ...p, [key]: !p[key] }))}
        style={{ width: "44px", height: "24px", borderRadius: "12px", background: cfg[key] ? "#27AE60" : "#CBD5E1", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
        <div style={{ position: "absolute", top: "3px", left: cfg[key] ? "22px" : "3px", width: "18px", height: "18px", borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }} />
      </div>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <div style={{ fontSize: "13px", color: "#888" }}>{t("dashboard.project")} {projectId} · {currentUser.email}</div>
          <div style={{ fontSize: "20px", fontWeight: "700", color: "#1F4E79" }}>{t("settings.title")}</div>
        </div>
      </div>

      {/* ── Personal notifications (ALL roles) ──────────────────────────────── */}
      <div style={{ background: "#fff", padding: "22px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", marginBottom: "16px", border: "2px solid #EBF5FB" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <h3 style={{ color: "#1F4E79", marginTop: 0, marginBottom: "4px", fontSize: "16px" }}>🔔 إنذاراتي الشخصية</h3>
            <div style={{ fontSize: "12px", color: "#888" }}>بريدك ورقمك الخاص — ستتلقى الإنذارات مباشرة عليهما</div>
          </div>
          <button onClick={savePersonal}
            style={{ background: personalSaved ? "#27AE60" : "#1F4E79", color: "#fff", border: "none", padding: "9px 20px", borderRadius: "10px", cursor: "pointer", fontSize: "13px", fontWeight: "bold", transition: "background 0.2s" }}>
            {personalSaved ? "✅ تم الحفظ" : "💾 حفظ بياناتي"}
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Email */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "12px", color: "#888", fontWeight: "600" }}>📧 بريدي الإلكتروني للإنذارات</label>
            <div style={{ display: "flex", gap: "8px" }}>
              <input type="email" value={myEmail} onChange={e => setMyEmail(e.target.value)}
                placeholder="email@example.com"
                style={{ padding: "9px 12px", borderRadius: "8px", border: "1.5px solid #E5E7EB", fontSize: "14px", flex: 1, outline: "none", background: "#FAFAFA" }} />
              {testBtn("📧 اختبار", emailStatus, testEmail, "#8E44AD")}
            </div>
            {emailMsg && <div style={{ fontSize: "12px", color: emailStatus === "ok" ? "#27AE60" : "#E74C3C", padding: "6px 10px", background: emailStatus === "ok" ? "#E8F5E9" : "#FDECEA", borderRadius: "6px" }}>{emailMsg}</div>}
          </div>

          {/* Phone */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "12px", color: "#888", fontWeight: "600" }}>📱 رقم هاتفي للرسائل القصيرة (SMS)</label>
            <div style={{ display: "flex", gap: "8px" }}>
              <input type="tel" value={myPhone} onChange={e => setMyPhone(e.target.value)}
                placeholder="+213555001122"
                style={{ padding: "9px 12px", borderRadius: "8px", border: "1.5px solid #E5E7EB", fontSize: "14px", flex: 1, outline: "none", background: "#FAFAFA" }} />
              {testBtn("📱 اختبار", smsStatus, testSms, "#2E86DE")}
            </div>
            {smsMsg && <div style={{ fontSize: "12px", color: smsStatus === "ok" ? "#27AE60" : "#E74C3C", padding: "6px 10px", background: smsStatus === "ok" ? "#E8F5E9" : "#FDECEA", borderRadius: "6px" }}>{smsMsg}</div>}
            <div style={{ fontSize: "11px", color: "#aaa" }}>يجب أن يبدأ بـ + متبوعاً برمز الدولة · مثال: +213 للجزائر</div>
          </div>
        </div>

        {/* Status badges */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "16px" }}>
          <div style={{ background: "#E8F5E9", border: "1.5px solid #27AE6030", borderRadius: "10px", padding: "10px 14px", display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "22px" }}>📧</span>
            <div>
              <div style={{ fontWeight: "700", color: "#1F4E79", fontSize: "12px" }}>Email — Resend API ✅</div>
              <div style={{ fontSize: "11px", color: "#555" }}>إنذار تلقائي عند الخطر</div>
            </div>
          </div>
          <div style={{ background: "#E8F5E9", border: "1.5px solid #27AE6030", borderRadius: "10px", padding: "10px 14px", display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "22px" }}>📱</span>
            <div>
              <div style={{ fontWeight: "700", color: "#1F4E79", fontSize: "12px" }}>SMS — Twilio API ✅</div>
              <div style={{ fontSize: "11px", color: "#555" }}>رسالة فورية للرقم أعلاه</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Platform settings (admin / engineer only) ─────────────────────── */}
      {isAdmin && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <div style={{ fontSize: "14px", fontWeight: "700", color: "#1F4E79" }}>⚙️ إعدادات المنصة</div>
            <button onClick={savePlatform}
              style={{ background: platformSaved ? "#27AE60" : "#1F4E79", color: "#fff", border: "none", padding: "9px 20px", borderRadius: "10px", cursor: "pointer", fontSize: "13px", fontWeight: "bold", transition: "background 0.2s" }}>
              {platformSaved ? "✅ تم الحفظ" : t("settings.save_btn")}
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            {/* Thresholds */}
            <div style={{ background: "#fff", padding: "20px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }}>
              <h3 style={{ color: "#E74C3C", marginTop: 0, fontSize: "14px", borderBottom: "2px solid #FDECEA", paddingBottom: "8px" }}>{t("settings.thresholds")}</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {pField(t("settings.sf_final"), "sfFinal", "number", "mm")}
                {pField(t("settings.danger_rate"), "dangerRateMmH", "number", "mm/h")}
                {pField(t("settings.consecutive"), "consecutiveThreshold", "number", t("settings.times"))}
                {pField(t("settings.cooldown"), "cooldownMinutes", "number", t("settings.minutes"))}
              </div>
            </div>

            {/* Notification channels */}
            <div style={{ background: "#fff", padding: "20px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }}>
              <h3 style={{ color: "#8E44AD", marginTop: 0, fontSize: "14px", borderBottom: "2px solid #F5EFF7", paddingBottom: "8px" }}>{t("settings.notif_channels")}</h3>
              {toggle("📱 SMS", "enableSms", t("settings.sms_desc"))}
              {toggle("📧 Email", "enableEmail", t("settings.email_desc"))}
              {toggle("🔔 Push (FCM)", "enablePush", t("settings.push_desc"))}
              <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "12px", color: "#888", fontWeight: "600" }}>{t("settings.sms_provider")}</label>
                <select value={cfg.smsProvider} onChange={e => setCfg(p => ({ ...p, smsProvider: e.target.value }))}
                  style={{ padding: "8px 12px", borderRadius: "8px", border: "1.5px solid #E5E7EB", fontSize: "14px", background: "#FAFAFA" }}>
                  <option value="twilio">Twilio (International)</option>
                  <option value="ooredoo">Ooredoo (Algérie)</option>
                  <option value="djezzy">Djezzy (Algérie)</option>
                </select>
              </div>
            </div>

            {/* MQTT */}
            <div style={{ background: "#fff", padding: "20px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }}>
              <h3 style={{ color: "#2E86DE", marginTop: 0, fontSize: "14px", borderBottom: "2px solid #EBF5FB", paddingBottom: "8px" }}>{t("settings.mqtt_config")}</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {pField(t("settings.mqtt_host"), "mqttHost")}
                {pField(t("settings.mqtt_port"), "mqttPort", "number")}
              </div>
            </div>

            {/* Intervals */}
            <div style={{ background: "#fff", padding: "20px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }}>
              <h3 style={{ color: "#1ABC9C", marginTop: 0, fontSize: "14px", borderBottom: "2px solid #E8FAF7", paddingBottom: "8px" }}>{t("settings.sensor_intervals")}</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {pField(t("settings.read_interval"), "readInterval", "number", t("settings.seconds"))}
                {pField(t("settings.send_interval"), "sendInterval", "number", t("settings.seconds"))}
              </div>
              <div style={{ marginTop: "12px", background: "#F0F9F6", padding: "10px", borderRadius: "8px", fontSize: "11px", color: "#555" }}>
                <strong>{t("settings.active_firmware")}:</strong> WiFi (NODE_01) · GPRS (NODE_02) · LoRa (NODE_03)
              </div>
            </div>
          </div>
        </>
      )}

      {/* Viewer info box */}
      {!isAdmin && (
        <div style={{ background: "#FEF9E7", border: "1.5px solid #F39C1240", borderRadius: "12px", padding: "14px 18px", fontSize: "13px", color: "#B7770D", display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "22px" }}>👁️</span>
          <span>أنت في وضع المشاهد — يمكنك فقط ضبط بريدك ورقمك الخاصين لتلقي الإنذارات. إعدادات المنصة تُدار من قِبل المهندس أو المدير.</span>
        </div>
      )}
    </div>
  );
}
