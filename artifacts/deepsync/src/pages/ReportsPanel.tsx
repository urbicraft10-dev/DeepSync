import { useState } from "react";
import { useTranslation } from "react-i18next";
import { generatePDF, type ReportType } from "../lib/generateReport";

interface Props { projectId: string; }

const TYPE_COLORS: Record<string, string> = {
  mensuel: "#1F4E79", hebdomadaire: "#2E86DE", alerte: "#E74C3C", analyse: "#8E44AD",
};

const REPORTS = [
  { id: 1, name: "Rapport Mensuel — Juin 2026",       type: "mensuel" as ReportType,      size: "~2.4 MB", date: "2026-06-17", sensors: 3, readings: 4320 },
  { id: 2, name: "Rapport Hebdomadaire — S23 2026",   type: "hebdomadaire" as ReportType, size: "~890 KB", date: "2026-06-10", sensors: 3, readings: 1008 },
  { id: 3, name: "Rapport d'Alertes — DANGER 14/06",  type: "alerte" as ReportType,       size: "~340 KB", date: "2026-06-14", sensors: 1, readings: 12   },
  { id: 4, name: "Rapport Mensuel — Mai 2026",        type: "mensuel" as ReportType,      size: "~2.1 MB", date: "2026-05-31", sensors: 3, readings: 4464 },
  { id: 5, name: "Analyse de Stabilité — Juin 2026",  type: "analyse" as ReportType,      size: "~1.8 MB", date: "2026-06-17", sensors: 3, readings: 8640 },
];

export default function ReportsPanel({ projectId }: Props) {
  const { t } = useTranslation();
  const [generating, setGenerating] = useState(false);
  const [genType, setGenType] = useState<ReportType>("mensuel");
  const [genLang, setGenLang] = useState("fr");
  const [genProgress, setGenProgress] = useState(0);
  const [genDone, setGenDone] = useState(false);
  const [downloading, setDownloading] = useState<number | null>(null);

  const TYPE_LABELS: Record<string, string> = {
    mensuel:      t("reports.monthly_pdf").replace(" (PDF)", ""),
    hebdomadaire: t("reports.weekly_pdf").replace(" (PDF)", ""),
    alerte:       t("reports.alert_pdf").replace(" (PDF)", ""),
    analyse:      t("reports.analysis_pdf").replace(" (PDF)", ""),
  };

  const generateReport = () => {
    setGenerating(true);
    setGenProgress(0);
    setGenDone(false);
    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 15 + 6;
      if (p >= 100) {
        clearInterval(interval);
        setGenProgress(100);
        // actually generate the PDF
        setTimeout(() => {
          generatePDF({ type: genType, projectId, lang: genLang });
          setGenerating(false);
          setGenDone(true);
        }, 200);
      } else {
        setGenProgress(p);
      }
    }, 280);
  };

  const downloadReport = (report: typeof REPORTS[0]) => {
    setDownloading(report.id);
    setTimeout(() => {
      generatePDF({ type: report.type, projectId, lang: genLang });
      setDownloading(null);
    }, 600);
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <div style={{ fontSize: "13px", color: "#888" }}>{t("dashboard.project")} {projectId}</div>
          <div style={{ fontSize: "20px", fontWeight: "700", color: "#1F4E79" }}>{t("reports.title")}</div>
        </div>
        <div style={{ background: "#E8F5E9", border: "1.5px solid #27AE6040", borderRadius: "10px", padding: "8px 18px", fontSize: "12px", color: "#27AE60", fontWeight: "700" }}>
          📄 PDF حقيقي — يتنزّل مباشرة
        </div>
      </div>

      {/* Generate new */}
      <div style={{ background: "#fff", padding: "24px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", marginBottom: "20px" }}>
        <h3 style={{ marginTop: 0, fontSize: "16px", color: "#1F4E79" }}>{t("reports.generate_new")}</h3>
        <div style={{ display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" }}>
          {/* Type */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "12px", color: "#888", fontWeight: "600" }}>{t("reports.report_type")}</label>
            <select value={genType} onChange={e => { setGenType(e.target.value as ReportType); setGenDone(false); }}
              style={{ padding: "9px 16px", borderRadius: "8px", border: "1.5px solid #E5E7EB", fontSize: "14px", background: "#FAFAFA", minWidth: "200px" }}>
              <option value="mensuel">{t("reports.monthly_pdf")}</option>
              <option value="hebdomadaire">{t("reports.weekly_pdf")}</option>
              <option value="alerte">{t("reports.alert_pdf")}</option>
              <option value="analyse">{t("reports.analysis_pdf")}</option>
            </select>
          </div>
          {/* Lang */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "12px", color: "#888", fontWeight: "600" }}>{t("reports.lang_label")}</label>
            <select value={genLang} onChange={e => setGenLang(e.target.value)}
              style={{ padding: "9px 16px", borderRadius: "8px", border: "1.5px solid #E5E7EB", fontSize: "14px", background: "#FAFAFA" }}>
              <option value="fr">🇫🇷 Français</option>
              <option value="ar">🇩🇿 العربية</option>
              <option value="en">🇬🇧 English</option>
            </select>
          </div>
          <button onClick={generateReport} disabled={generating}
            style={{ background: generating ? "#CBD5E1" : "#1F4E79", color: generating ? "#666" : "#fff", border: "none", padding: "10px 28px", borderRadius: "10px", cursor: generating ? "not-allowed" : "pointer", fontSize: "14px", fontWeight: "bold", transition: "background 0.2s" }}>
            {generating ? t("reports.generating") : `⬇️ ${t("reports.generate_btn")}`}
          </button>
        </div>

        {/* Progress bar */}
        {generating && (
          <div style={{ marginTop: "16px" }}>
            <div style={{ fontSize: "12px", color: "#888", marginBottom: "6px" }}>{t("reports.progress_msg")}</div>
            <div style={{ background: "#F0F0F0", borderRadius: "8px", height: "10px", overflow: "hidden" }}>
              <div style={{ background: "linear-gradient(90deg,#1F4E79,#2E86DE)", height: "100%", width: `${Math.min(genProgress, 100)}%`, transition: "width 0.3s", borderRadius: "8px" }} />
            </div>
            <div style={{ fontSize: "12px", color: "#555", marginTop: "4px", fontWeight: "600" }}>{Math.min(Math.round(genProgress), 100)}%</div>
          </div>
        )}

        {/* Success */}
        {genDone && !generating && (
          <div style={{ marginTop: "16px", background: "#E8F5E9", padding: "12px 18px", borderRadius: "10px", color: "#27AE60", fontWeight: "bold", fontSize: "14px", display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "22px" }}>✅</span>
            <span>{t("reports.success_msg")} — PDF نزّل تلقائياً على جهازك</span>
          </div>
        )}
      </div>

      {/* Reports list */}
      <div style={{ fontSize: "13px", fontWeight: "700", color: "#1F4E79", marginBottom: "10px" }}>
        📁 التقارير المتاحة — اضغط تنزيل لتحميل PDF حقيقي
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {REPORTS.map(report => (
          <div key={report.id}
            style={{ background: "#fff", border: "1.5px solid #F0F0F0", borderLeft: `4px solid ${TYPE_COLORS[report.type] || "#1F4E79"}`, borderRadius: "10px", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "box-shadow 0.2s" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px", flexWrap: "wrap" }}>
                <span style={{ background: TYPE_COLORS[report.type] + "20", color: TYPE_COLORS[report.type], padding: "2px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: "bold" }}>
                  {TYPE_LABELS[report.type]}
                </span>
                <span style={{ fontWeight: "700", fontSize: "15px", color: "#333" }}>{report.name}</span>
              </div>
              <div style={{ fontSize: "12px", color: "#888" }}>
                📅 {report.date} · 📡 {report.sensors} {t("reports.sensors_label")} · 📋 {report.readings.toLocaleString()} {t("reports.readings_label")} · 📦 {report.size}
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
              <button
                onClick={() => downloadReport(report)}
                disabled={downloading === report.id}
                style={{ background: downloading === report.id ? "#27AE60" : "#1F4E79", color: "#fff", border: "none", padding: "8px 18px", borderRadius: "8px", cursor: downloading === report.id ? "not-allowed" : "pointer", fontSize: "13px", fontWeight: "600", transition: "background 0.2s", display: "flex", alignItems: "center", gap: "6px" }}>
                {downloading === report.id ? "⏳ جارٍ..." : `⬇️ ${t("reports.download_btn")}`}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginTop: "20px" }}>
        {[
          { label: t("reports.total"),        value: "18",      icon: "📄", color: "#1F4E79" },
          { label: t("reports.this_month"),    value: "5",       icon: "📅", color: "#2E86DE" },
          { label: t("reports.alert_reports"), value: "3",       icon: "🚨", color: "#E74C3C" },
          { label: t("reports.total_volume"),  value: "24.7 MB", icon: "💾", color: "#27AE60" },
        ].map(s => (
          <div key={s.label} style={{ background: "#fff", padding: "16px", borderRadius: "10px", boxShadow: "0 2px 6px rgba(0,0,0,0.06)", textAlign: "center" }}>
            <div style={{ fontSize: "24px" }}>{s.icon}</div>
            <div style={{ fontSize: "22px", fontWeight: "bold", color: s.color }}>{s.value}</div>
            <div style={{ fontSize: "12px", color: "#888" }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
