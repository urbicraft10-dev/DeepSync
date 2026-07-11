import { useState } from "react";
import { useTranslation } from "react-i18next";

const LANGS = [
  { code: "ar", label: "العربية", flag: "🇩🇿" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "en", label: "English", flag: "🇬🇧" },
];

const MOCK_TRANSLATIONS: Record<string, Record<string, string>> = {
  ar: { dashboard: "لوحة التحكم", alerts: "الإنذارات", settings: "الإعدادات", reports: "التقارير", safe: "آمن", warning: "تحذير", danger: "خطر", critical: "حرج", "vertical settlement": "الهبوط الرأسي", "horizontal displacement": "الإزاحة الأفقية", "stability curve": "منحنى الاستقرار", sensor: "الحساس", project: "المشروع", alert: "إنذار" },
  fr: { dashboard: "Tableau de bord", alerts: "Alertes", settings: "Paramètres", reports: "Rapports", safe: "Sûr", warning: "Avertissement", danger: "Danger", critical: "Critique", "vertical settlement": "Tassement vertical", "horizontal displacement": "Déplacement horizontal", "stability curve": "Courbe de stabilité", sensor: "Capteur", project: "Projet", alert: "Alerte" },
  en: { dashboard: "Dashboard", alerts: "Alerts", settings: "Settings", reports: "Reports", safe: "Safe", warning: "Warning", danger: "Danger", critical: "Critical", "vertical settlement": "Vertical settlement", "horizontal displacement": "Horizontal displacement", "stability curve": "Stability curve", sensor: "Sensor", project: "Project", alert: "Alert" },
};

export default function TranslatePanel() {
  const { t } = useTranslation();
  const [srcLang, setSrcLang] = useState("en");
  const [tgtLang, setTgtLang] = useState("ar");
  const [inputText, setInputText] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const translate = () => {
    setLoading(true);
    setTimeout(() => {
      const key = inputText.toLowerCase().trim();
      const dict = MOCK_TRANSLATIONS[tgtLang] || {};
      const translated = dict[key] || `[${tgtLang.toUpperCase()}] ${inputText}`;
      setResult(translated);
      setLoading(false);
    }, 800);
  };

  const swap = () => { setSrcLang(tgtLang); setTgtLang(srcLang); setInputText(result); setResult(""); };

  return (
    <div>
      <div style={{ marginBottom: "20px" }}>
        <div style={{ fontSize: "13px", color: "#888" }}>{t("translate.service")}</div>
        <div style={{ fontSize: "20px", fontWeight: "700", color: "#1F4E79" }}>{t("translate.title")}</div>
        <div style={{ fontSize: "13px", color: "#888", marginTop: "4px" }}>{t("translate.subtitle")}</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
        {/* Input */}
        <div style={{ background: "#fff", padding: "20px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <label style={{ fontSize: "13px", fontWeight: "700", color: "#555" }}>{t("translate.source_text")}</label>
            <select value={srcLang} onChange={e => setSrcLang(e.target.value)}
              style={{ padding: "6px 12px", borderRadius: "8px", border: "1.5px solid #E5E7EB", fontSize: "14px", background: "#FAFAFA" }}>
              {LANGS.map(l => <option key={l.code} value={l.code}>{l.flag} {l.label}</option>)}
            </select>
          </div>
          <textarea
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder={t("translate.examples")}
            style={{ width: "100%", minHeight: "140px", padding: "12px", borderRadius: "8px", border: "1.5px solid #E5E7EB", fontSize: "14px", resize: "vertical", outline: "none", fontFamily: "inherit", boxSizing: "border-box", direction: srcLang === "ar" ? "rtl" : "ltr" }}
          />
          <div style={{ fontSize: "12px", color: "#888", marginTop: "6px" }}>{t("translate.examples")}</div>
        </div>

        {/* Output */}
        <div style={{ background: "#fff", padding: "20px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <label style={{ fontSize: "13px", fontWeight: "700", color: "#555" }}>{t("translate.translation")}</label>
            <select value={tgtLang} onChange={e => setTgtLang(e.target.value)}
              style={{ padding: "6px 12px", borderRadius: "8px", border: "1.5px solid #E5E7EB", fontSize: "14px", background: "#FAFAFA" }}>
              {LANGS.map(l => <option key={l.code} value={l.code}>{l.flag} {l.label}</option>)}
            </select>
          </div>
          <div style={{ minHeight: "140px", padding: "12px", borderRadius: "8px", border: "1.5px solid #E5E7EB", background: "#FAFAFA", fontSize: "15px", color: result ? "#333" : "#aaa", direction: tgtLang === "ar" ? "rtl" : "ltr", fontWeight: result ? "500" : "400" }}>
            {loading ? t("translate.in_progress") : result || t("translate.appears_here")}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
        <button onClick={translate} disabled={!inputText.trim() || loading} style={{ background: !inputText.trim() ? "#E5E7EB" : "#1F4E79", color: !inputText.trim() ? "#888" : "#fff", border: "none", padding: "11px 28px", borderRadius: "10px", cursor: !inputText.trim() ? "not-allowed" : "pointer", fontSize: "15px", fontWeight: "bold" }}>
          {loading ? t("translate.translating") : t("translate.translate_btn")}
        </button>
        <button onClick={swap} style={{ background: "#F5F7FA", color: "#1F4E79", border: "1.5px solid #E5E7EB", padding: "11px 20px", borderRadius: "10px", cursor: "pointer", fontSize: "15px" }}>
          {t("translate.swap_btn")}
        </button>
        <button onClick={() => { setInputText(""); setResult(""); }} style={{ background: "#F5F7FA", color: "#888", border: "1.5px solid #E5E7EB", padding: "11px 16px", borderRadius: "10px", cursor: "pointer", fontSize: "15px" }}>
          {t("translate.clear_btn")}
        </button>
      </div>

      {/* Glossary */}
      <div style={{ background: "#fff", padding: "20px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }}>
        <h3 style={{ marginTop: 0, fontSize: "15px", color: "#1F4E79" }}>{t("translate.glossary_title")}</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#F5F7FA" }}>
                {[t("translate.technical_term"), "🇬🇧 English", "🇫🇷 Français", "🇩🇿 العربية"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: "700", color: "#555", borderBottom: "2px solid #E5E7EB" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.keys(MOCK_TRANSLATIONS.en).map((key, i) => (
                <tr key={key} style={{ background: i % 2 === 0 ? "#fff" : "#FAFAFA" }}>
                  <td style={{ padding: "10px 14px", fontFamily: "monospace", color: "#2E86DE", fontWeight: "600" }}>{key}</td>
                  <td style={{ padding: "10px 14px", color: "#333" }}>{MOCK_TRANSLATIONS.en[key]}</td>
                  <td style={{ padding: "10px 14px", color: "#333" }}>{MOCK_TRANSLATIONS.fr[key]}</td>
                  <td style={{ padding: "10px 14px", color: "#333", direction: "rtl" }}>{MOCK_TRANSLATIONS.ar[key]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: "14px", padding: "12px 16px", background: "#EBF5FB", borderRadius: "8px", fontSize: "12px", color: "#555" }}>
          {t("translate.backends")}
        </div>
      </div>
    </div>
  );
}
