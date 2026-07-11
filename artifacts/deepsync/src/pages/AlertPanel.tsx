import { useState } from "react";
import { useTranslation } from "react-i18next";

const MOCK_ALERTS = [
  { id: 1, severity: "danger", status: "active", title: "DANGER – PROJ_001", message: "s=5.82mm > s_ref=4.31mm (ratio=0.7142, consec=2)", sensor: "NODE_01", value: 5.82, ref: 4.31, time: "14:32:05", channels: ["SMS", "Email", "Push"] },
  { id: 2, severity: "warning", status: "acknowledged", title: "WARNING – PROJ_001", message: "Taux=6.4mm/h > 5mm/h. s=3.21mm, s_ref=4.18mm", sensor: "NODE_01", value: 3.21, ref: 4.18, time: "13:15:22", channels: ["Email", "Push"] },
  { id: 3, severity: "warning", status: "resolved", title: "WARNING – PROJ_001", message: "Taux=5.2mm/h > 5mm/h. s=2.98mm, s_ref=4.03mm", sensor: "NODE_01", value: 2.98, ref: 4.03, time: "11:48:01", channels: ["Email"] },
  { id: 4, severity: "info", status: "resolved", title: "INFO – Node reconnected", message: "NODE_01 reconnected after 4 minutes of interruption", sensor: "NODE_01", value: null, ref: null, time: "10:05:33", channels: ["Push"] },
  { id: 5, severity: "danger", status: "resolved", title: "DANGER – PROJ_001", message: "s=6.01mm > s_ref=4.29mm (ratio=0.7280, consec=3)", sensor: "NODE_02", value: 6.01, ref: 4.29, time: "08:22:17", channels: ["SMS", "Email", "Push"] },
];

const SEV_COLORS: Record<string, string> = { danger: "#E74C3C", warning: "#F39C12", info: "#2E86DE", critical: "#C0392B" };
const SEV_BG: Record<string, string> = { danger: "#FDECEA", warning: "#FEF9E7", info: "#EBF5FB", critical: "#FDECEA" };
const STATUS_COLORS: Record<string, string> = { active: "#E74C3C", acknowledged: "#F39C12", resolved: "#27AE60" };
const CHAN_COLORS: Record<string, string> = { SMS: "#8E44AD", Email: "#2E86DE", Push: "#27AE60" };

interface Props { projectId: string; }

export default function AlertPanel({ projectId }: Props) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState("all");
  const [alerts, setAlerts] = useState(MOCK_ALERTS);

  const filtered = filter === "all" ? alerts : alerts.filter(a => a.status === filter);
  const counts = {
    active: alerts.filter(a => a.status === "active").length,
    acknowledged: alerts.filter(a => a.status === "acknowledged").length,
    resolved: alerts.filter(a => a.status === "resolved").length,
  };

  const acknowledge = (id: number) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: "acknowledged" } : a));
  };

  const filterLabels: Record<string, string> = {
    all: t("alerts.all"),
    active: t("alerts.active_tab"),
    acknowledged: t("alerts.acknowledged_tab"),
    resolved: t("alerts.resolved_tab"),
  };

  const statusBadges: Record<string, string> = {
    active: t("alerts.active_badge"),
    acknowledged: t("alerts.acknowledged_badge"),
    resolved: t("alerts.resolved_badge"),
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div style={{ fontSize: "13px", color: "#888" }}>{t("dashboard.project")} {projectId}</div>
          <div style={{ fontSize: "20px", fontWeight: "700", color: "#1F4E79" }}>{t("alerts.title")}</div>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {["all", "active", "acknowledged", "resolved"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: "7px 16px", borderRadius: "8px", border: "1.5px solid",
              borderColor: filter === f ? "#1F4E79" : "#E5E7EB",
              background: filter === f ? "#1F4E79" : "#fff",
              color: filter === f ? "#fff" : "#555",
              cursor: "pointer", fontSize: "13px", fontWeight: filter === f ? "600" : "400"
            }}>
              {filterLabels[f]}
              {f !== "all" && (
                <span style={{ marginLeft: "6px", background: STATUS_COLORS[f] + "30", color: STATUS_COLORS[f], borderRadius: "10px", padding: "1px 7px", fontSize: "11px", fontWeight: "bold" }}>
                  {counts[f as keyof typeof counts]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "20px" }}>
        {[
          { key: "active", label: t("alerts.active_label"), count: counts.active, color: "#E74C3C", icon: "🔴" },
          { key: "acknowledged", label: t("alerts.acknowledged_label"), count: counts.acknowledged, color: "#F39C12", icon: "🟡" },
          { key: "resolved", label: t("alerts.resolved_label"), count: counts.resolved, color: "#27AE60", icon: "🟢" },
        ].map(s => (
          <div key={s.key} style={{ background: "#fff", padding: "18px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ fontSize: "32px" }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: "28px", fontWeight: "800", color: s.color }}>{s.count}</div>
              <div style={{ fontSize: "13px", color: "#888" }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {filtered.map(alert => (
          <div key={alert.id} style={{
            background: SEV_BG[alert.severity] || "#fff",
            border: `1.5px solid ${SEV_COLORS[alert.severity] || "#ccc"}30`,
            borderLeft: `4px solid ${SEV_COLORS[alert.severity] || "#ccc"}`,
            borderRadius: "10px", padding: "16px 20px",
            display: "flex", justifyContent: "space-between", alignItems: "flex-start",
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px", flexWrap: "wrap" }}>
                <span style={{ background: SEV_COLORS[alert.severity], color: "#fff", padding: "2px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold", textTransform: "uppercase" }}>
                  {alert.severity}
                </span>
                <span style={{ fontWeight: "700", fontSize: "15px", color: "#1F4E79" }}>{alert.title}</span>
                <span style={{ fontSize: "12px", color: "#888" }}>🕐 {alert.time}</span>
                <span style={{ fontSize: "12px", color: "#888" }}>📡 {alert.sensor}</span>
              </div>
              <div style={{ fontSize: "13px", color: "#555", marginBottom: "8px" }}>{alert.message}</div>
              {alert.value !== null && (
                <div style={{ fontSize: "12px", color: "#888", marginBottom: "8px" }}>
                  {t("alerts.s_measured")}: <strong>{alert.value} mm</strong> · {t("alerts.s_ref")}: <strong>{alert.ref} mm</strong>
                </div>
              )}
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {alert.channels.map(ch => (
                  <span key={ch} style={{ background: CHAN_COLORS[ch] + "20", color: CHAN_COLORS[ch], padding: "2px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: "bold" }}>
                    {ch === "SMS" ? "📱" : ch === "Email" ? "📧" : "🔔"} {ch}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px", marginLeft: "16px" }}>
              <span style={{ background: STATUS_COLORS[alert.status] + "20", color: STATUS_COLORS[alert.status], padding: "4px 12px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold" }}>
                {statusBadges[alert.status]}
              </span>
              {alert.status === "active" && (
                <button onClick={() => acknowledge(alert.id)} style={{ background: "#F39C12", color: "#fff", border: "none", padding: "6px 14px", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}>
                  {t("alerts.acknowledge_btn")}
                </button>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px", color: "#888", background: "#fff", borderRadius: "12px" }}>
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>🟢</div>
            <div style={{ fontSize: "18px", fontWeight: "bold" }}>{t("alerts.no_alerts_title")}</div>
            <div style={{ fontSize: "14px" }}>{t("alerts.no_alerts_desc")} {projectId}</div>
          </div>
        )}
      </div>
    </div>
  );
}
