import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ScatterChart, Scatter, ResponsiveContainer, ReferenceLine
} from "recharts";

const API_URL = import.meta.env.VITE_API_URL;

function getStabilityCurve() {
  const points = [];
  for (let i = 0; i <= 100; i++) {
    const ratio = i / 100;
    const s = 5.93 * Math.exp(1.28 * ratio * ratio - 3.41 * ratio);
    points.push({ ratio: parseFloat(ratio.toFixed(3)), s: parseFloat(s.toFixed(3)) });
  }
  return points;
}
const stabilityCurve = getStabilityCurve();

function simulateReading(prev: { s1: number; sh: number; piezo: number }) {
  const s1 = Math.max(0, prev.s1 + (Math.random() - 0.45) * 0.25);
  const sh = Math.max(0, prev.sh + (Math.random() - 0.48) * 0.15);
  const piezo = Math.max(0, prev.piezo + (Math.random() - 0.5) * 2);
  const ratio = s1 > 0.1 ? sh / s1 : 0;
  const sCurve = 5.93 * Math.exp(1.28 * ratio * ratio - 3.41 * ratio);
  const sfFinal = 200;
  const uPercent = Math.min(100, (s1 / sfFinal) * 100);
  const state = s1 > sCurve ? "danger" : sh > 20 ? "critical" : s1 > 0.85 * sCurve ? "warning" : "safe";
  return { s1, sh, piezo, ratio, sCurve, uPercent, state };
}

const STATUS_COLORS: Record<string, string> = {
  safe: "#27AE60", warning: "#F39C12", danger: "#E74C3C", critical: "#C0392B",
};

function getAlertEmail(): string {
  return localStorage.getItem("deepsync_alert_email") || "";
}
function getAlertPhone(): string {
  return localStorage.getItem("deepsync_alert_phone") || "";
}

interface Props { deviceId: string; projectId: string; }

export default function Dashboard({ deviceId, projectId }: Props) {
  const { t } = useTranslation();
  const [verticalData, setVerticalData] = useState<{ time: string; s: number }[]>([]);
  const [horizontalData, setHorizontalData] = useState<{ time: string; sh: number }[]>([]);
  const [scatterPoints, setScatterPoints] = useState<{ ratio: number; s: number }[]>([]);
  const [current, setCurrent] = useState({ s1: 3.2, sh: 1.8, piezo: 45, ratio: 0.56, sCurve: 4.1, uPercent: 1.6, state: "safe" });
  const [rateHistory, setRateHistory] = useState<number[]>([]);
  const prevRef = useRef(current);
  const [liveStatus, setLiveStatus] = useState<"connecting" | "live" | "offline">("connecting");
  const lastAlertRef = useRef<number>(0);
  const [emailSentBanner, setEmailSentBanner] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => setLiveStatus("live"), 1200);
    return () => clearTimeout(timeout);
  }, []);

  const fireAlert = async (reading: typeof current, rate: number) => {
    const email = getAlertEmail();
    const phone = getAlertPhone();
    if (!email && !phone) return;

    const now = Date.now();
    const cooldownMs = 5 * 60 * 1000;
    if (now - lastAlertRef.current < cooldownMs) return;
    lastAlertRef.current = now;

    try {
      await fetch(`${API_URL}/api/alerts/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: email || undefined,
          phone: phone || undefined,
          severity: reading.state,
          sValue: reading.s1,
          sCurve: reading.sCurve,
          ratio: reading.ratio,
          sensor: "NODE_01",
          projectId,
          rate,
        }),
      });
      const parts = [];
      if (email) parts.push(`📧 ${email}`);
      if (phone) parts.push(`📱 ${phone}`);
      setEmailSentBanner(`🚨 إنذار أُرسل: ${parts.join(" · ")}`);
      setTimeout(() => setEmailSentBanner(""), 6000);
    } catch {
      // silent
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const reading = simulateReading(prevRef.current);
      prevRef.current = reading;
      setCurrent(reading);
      const time = new Date().toLocaleTimeString("fr-FR");
      setVerticalData(prev => [...prev.slice(-60), { time, s: parseFloat(reading.s1.toFixed(3)) }]);
      setHorizontalData(prev => [...prev.slice(-60), { time, sh: parseFloat(reading.sh.toFixed(3)) }]);
      setScatterPoints(prev => [...prev.slice(-30), { ratio: parseFloat(reading.ratio.toFixed(4)), s: parseFloat(reading.s1.toFixed(3)) }]);
      setRateHistory(prev => {
        const updated = [...prev.slice(-10), reading.s1];
        const rate = updated.length >= 2
          ? Math.abs(updated[updated.length - 1] - updated[updated.length - 2]) * 1800
          : 0;
        if (reading.state === "danger" || reading.state === "critical") {
          fireAlert(reading, rate);
        }
        return updated;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [projectId]);

  const rate = rateHistory.length >= 2 ? Math.abs(rateHistory[rateHistory.length - 1] - rateHistory[rateHistory.length - 2]) * 1800 : 0;
  const statusColor = STATUS_COLORS[current.state] || "#95A5A6";
  const statusKey = current.state as "safe" | "warning" | "danger" | "critical";
  const statusLabel = t(`dashboard.${statusKey}`);

  const liveColors: Record<string, string> = { connecting: "#F39C12", live: "#27AE60", offline: "#E74C3C" };
  const liveText: Record<string, string> = {
    connecting: t("dashboard.connecting"),
    live: t("dashboard.live"),
    offline: t("dashboard.offline"),
  };

  const zones = [
    { color: "#27AE60", emoji: "🟢", label: t("dashboard.zone_safe"), desc: t("dashboard.zone_safe_desc") },
    { color: "#F39C12", emoji: "🟡", label: t("dashboard.zone_warning"), desc: t("dashboard.zone_warning_desc") },
    { color: "#E67E22", emoji: "🟠", label: t("dashboard.zone_alert"), desc: t("dashboard.zone_alert_desc") },
    { color: "#E74C3C", emoji: "🔴", label: t("dashboard.zone_danger"), desc: t("dashboard.zone_danger_desc") },
  ];

  return (
    <div>
      {/* Email sent banner */}
      {emailSentBanner && (
        <div style={{ background: "#E8F5E9", border: "1.5px solid #27AE60", borderRadius: "10px", padding: "10px 18px", marginBottom: "14px", color: "#27AE60", fontWeight: "bold", fontSize: "14px", display: "flex", alignItems: "center", gap: "10px" }}>
          {emailSentBanner}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div style={{ fontSize: "13px", color: "#888", marginBottom: "2px" }}>
            {deviceId} · {t("dashboard.project")} {projectId}
          </div>
          <div style={{ fontSize: "20px", fontWeight: "700", color: "#1F4E79" }}>
            {t("dashboard.title")}
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <div style={{ background: liveColors[liveStatus], color: "#fff", padding: "6px 16px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold" }}>
            {liveText[liveStatus]}
          </div>
          <div style={{ background: statusColor, color: "#fff", padding: "10px 24px", borderRadius: "30px", fontSize: "18px", fontWeight: "bold", boxShadow: `0 4px 16px ${statusColor}55` }}>
            {statusLabel}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "12px", marginBottom: "20px" }}>
        {[
          { label: t("dashboard.kpi_s"), value: `${current.s1.toFixed(2)} mm`, color: "#2E86DE", icon: "📉" },
          { label: t("dashboard.kpi_sh"), value: `${current.sh.toFixed(2)} mm`, color: "#F39C12", icon: "📏" },
          { label: t("dashboard.kpi_ratio"), value: current.ratio.toFixed(4), color: "#8E44AD", icon: "📐" },
          { label: t("dashboard.kpi_scurve"), value: `${current.sCurve.toFixed(2)} mm`, color: "#E74C3C", icon: "〰️" },
          { label: t("dashboard.kpi_u"), value: `${current.uPercent.toFixed(1)}%`, color: "#1ABC9C", icon: "💧" },
          { label: t("dashboard.kpi_rate"), value: `${rate.toFixed(2)}`, color: rate > 5 ? "#E74C3C" : "#27AE60", icon: "⚡" },
        ].map(({ label, value, color, icon }) => (
          <div key={label} style={{ background: "#fff", padding: "14px 12px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", textAlign: "center", borderTop: `3px solid ${color}` }}>
            <div style={{ fontSize: "18px", marginBottom: "4px" }}>{icon}</div>
            <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>{label}</div>
            <div style={{ fontSize: "20px", fontWeight: "bold", color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
        <div style={{ background: "#fff", padding: "20px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }}>
          <h3 style={{ color: "#2E86DE", marginTop: 0, marginBottom: "16px", fontSize: "15px" }}>
            {t("dashboard.settlement")}
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={verticalData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} unit=" mm" domain={["auto", "auto"]} />
              <Tooltip formatter={(v: number) => [`${v.toFixed(3)} mm`, "S"]} />
              <Line type="monotone" dataKey="s" stroke="#2E86DE" strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: "#fff", padding: "20px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }}>
          <h3 style={{ color: "#F39C12", marginTop: 0, marginBottom: "16px", fontSize: "15px" }}>
            {t("dashboard.displacement")}
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={horizontalData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} unit=" mm" domain={["auto", "auto"]} />
              <Tooltip formatter={(v: number) => [`${v.toFixed(3)} mm`, "Sh"]} />
              <Line type="monotone" dataKey="sh" stroke="#F39C12" strokeWidth={2} dot={false} isAnimationActive={false} />
              <ReferenceLine y={20} stroke="#E74C3C" strokeDasharray="4 4" label={{ value: "⚠️ 20mm", fontSize: 10 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Matsuo-Kawamura */}
      <div style={{ background: "#fff", padding: "20px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", marginBottom: "16px" }}>
        <h3 style={{ color: "#E74C3C", marginTop: 0, marginBottom: "4px", fontSize: "15px" }}>
          {t("dashboard.stability")}
        </h3>
        <p style={{ color: "#888", fontSize: "11px", margin: "0 0 16px" }}>
          {t("dashboard.equation")}
        </p>
        <ResponsiveContainer width="100%" height={280}>
          <ScatterChart margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis type="number" dataKey="ratio" name="δ/s" domain={[0, 1]} tick={{ fontSize: 10 }} label={{ value: t("dashboard.ratio_label"), position: "insideBottom", offset: -8, fontSize: 11 }} />
            <YAxis type="number" dataKey="s" name="s" domain={[0, 12]} tick={{ fontSize: 10 }} label={{ value: "s (mm)", angle: -90, position: "insideLeft", fontSize: 11 }} />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} formatter={(v: number, name: string) => [v.toFixed(3), name === "ratio" ? "δ/s" : "s (mm)"]} />
            <Legend />
            <Scatter name={t("dashboard.scatter_curve")} data={stabilityCurve} fill="#E74C3C" opacity={0.6} line={{ stroke: "#E74C3C", strokeWidth: 2.5 }} shape={() => null} />
            <Scatter name={t("dashboard.scatter_history")} data={scatterPoints} fill="#2E86DE" opacity={0.5} r={4} />
            <Scatter name={t("dashboard.scatter_current")} data={[{ ratio: parseFloat(current.ratio.toFixed(4)), s: parseFloat(current.s1.toFixed(3)) }]} fill={statusColor} r={10} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Status zones */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
        {zones.map(z => (
          <div key={z.label} style={{ background: z.color, color: "#fff", padding: "12px 16px", borderRadius: "10px", textAlign: "center" }}>
            <div style={{ fontSize: "18px" }}>{z.emoji}</div>
            <div style={{ fontWeight: "bold", fontSize: "14px" }}>{z.label}</div>
            <div style={{ fontSize: "11px", opacity: 0.9, marginTop: "2px" }}>{z.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
