import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq, and, isNotNull } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();
const RESEND_API = "https://api.resend.com/emails";

// ── Email helpers ──────────────────────────────────────────────────────────

function buildAlertEmail(data: {
  severity: string; sValue: number; sCurve: number; ratio: number;
  sensor: string; projectId: string; timestamp: string; rate?: number;
}) {
  const sevColor: Record<string, string> = { danger: "#E74C3C", warning: "#F39C12", critical: "#C0392B", info: "#2E86DE" };
  const color = sevColor[data.severity] || "#555";
  const emoji = data.severity === "danger" || data.severity === "critical" ? "🚨" : data.severity === "warning" ? "⚠️" : "ℹ️";

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F0F4F8;font-family:Arial,sans-serif;direction:rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F4F8;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">
        <tr><td style="background:${color};padding:28px 32px;text-align:center;">
          <div style="font-size:40px;margin-bottom:8px;">${emoji}</div>
          <div style="color:#fff;font-size:24px;font-weight:bold;">إنذار DeepSync</div>
          <div style="color:#fff;opacity:0.85;font-size:15px;margin-top:4px;">منصة المراقبة الجيوتقنية الذكية</div>
        </td></tr>
        <tr><td style="padding:24px 32px 0;text-align:center;">
          <span style="display:inline-block;background:${color}15;color:${color};border:2px solid ${color};padding:8px 28px;border-radius:30px;font-size:18px;font-weight:bold;">
            ${data.severity.toUpperCase()} — ${data.projectId}
          </span>
        </td></tr>
        <tr><td style="padding:24px 32px;">
          <table width="100%" cellpadding="0" cellspacing="8">
            <tr>
              <td style="background:#F8F9FA;border-radius:10px;padding:16px;text-align:center;width:33%;">
                <div style="font-size:11px;color:#888;margin-bottom:4px;">التسامت الرأسي S</div>
                <div style="font-size:22px;font-weight:bold;color:${color};">${data.sValue.toFixed(3)} mm</div>
              </td>
              <td width="8"></td>
              <td style="background:#F8F9FA;border-radius:10px;padding:16px;text-align:center;width:33%;">
                <div style="font-size:11px;color:#888;margin-bottom:4px;">s_curve (Matsuo-Kawamura)</div>
                <div style="font-size:22px;font-weight:bold;color:#555;">${data.sCurve.toFixed(3)} mm</div>
              </td>
              <td width="8"></td>
              <td style="background:#F8F9FA;border-radius:10px;padding:16px;text-align:center;width:33%;">
                <div style="font-size:11px;color:#888;margin-bottom:4px;">النسبة δ/s</div>
                <div style="font-size:22px;font-weight:bold;color:#8E44AD;">${data.ratio.toFixed(4)}</div>
              </td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:0 32px 20px;">
          <div style="background:${color}10;border-right:4px solid ${color};border-radius:8px;padding:14px 16px;font-size:14px;color:#444;">
            <strong>الحساس:</strong> ${data.sensor} &nbsp;·&nbsp; <strong>الوقت:</strong> ${data.timestamp}<br>
            <span style="margin-top:6px;display:block;">s = ${data.sValue.toFixed(3)} mm &gt; s_ref = ${data.sCurve.toFixed(3)} mm${data.rate !== undefined ? ` &nbsp;·&nbsp; المعدل = ${data.rate.toFixed(2)} mm/h` : ""}</span>
          </div>
        </td></tr>
        <tr><td style="padding:0 32px 20px;">
          <div style="background:#F5F7FA;border-radius:8px;padding:12px 16px;font-size:12px;color:#888;text-align:center;font-family:monospace;">
            Matsuo-Kawamura (1977): s = 5.93 · exp(1.28·(δ/s)² − 3.41·(δ/s))
          </div>
        </td></tr>
        <tr><td style="background:#F8F9FA;padding:16px 32px;text-align:center;border-top:1px solid #E5E7EB;">
          <div style="font-size:12px;color:#aaa;">DeepSync Platform — TerraSync + DeepSight © 2026</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY not configured" };
  try {
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "DeepSync Alerts <onboarding@resend.dev>", to: [opts.to], subject: opts.subject, html: opts.html }),
    });
    const json = (await res.json()) as { id?: string; message?: string; name?: string };
    if (!res.ok) return { ok: false, error: json.message || json.name || "Resend error" };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

// ── SMS helpers ────────────────────────────────────────────────────────────

function buildSmsBody(data: {
  severity: string; sValue: number; sCurve: number; ratio: number;
  sensor: string; projectId: string; timestamp: string; rate?: number;
}): string {
  const emoji = data.severity === "danger" || data.severity === "critical" ? "🚨" : "⚠️";
  return [
    `${emoji} DeepSync ALERT`,
    `${data.severity.toUpperCase()} — ${data.projectId}`,
    `Capteur: ${data.sensor}`,
    `s = ${data.sValue.toFixed(3)} mm > s_ref = ${data.sCurve.toFixed(3)} mm`,
    `δ/s = ${data.ratio.toFixed(4)}${data.rate !== undefined ? ` | Taux: ${data.rate.toFixed(2)} mm/h` : ""}`,
    `${data.timestamp}`,
  ].join("\n");
}

async function sendSms(to: string, body: string): Promise<{ ok: boolean; error?: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!sid || !token || !from) return { ok: false, error: "Twilio credentials not configured" };

  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const creds = Buffer.from(`${sid}:${token}`).toString("base64");

  try {
    const params = new URLSearchParams({ From: from, To: to, Body: body });
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Basic ${creds}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const json = (await res.json()) as { sid?: string; message?: string; code?: number };
    if (!res.ok) return { ok: false, error: json.message || `Twilio error ${res.status}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

// ── Routes ─────────────────────────────────────────────────────────────────

// POST /api/alerts/notify — triggered automatically by sensor threshold crossing
// Sends to: (a) all active DB users who have alert_email/alert_phone set
//           (b) optional explicit to/phone from request body (legacy)
router.post("/alerts/notify", async (req, res): Promise<void> => {
  const { to, phone, severity, sValue, sCurve, ratio, sensor, projectId, rate } = req.body as {
    to?: string; phone?: string; severity: string; sValue: number; sCurve: number;
    ratio: number; sensor: string; projectId: string; rate?: number;
  };

  if (!severity || sValue == null || sCurve == null) {
    res.status(400).json({ error: "Missing required fields: severity, sValue, sCurve" });
    return;
  }

  const timestamp = new Date().toLocaleString("fr-FR", { timeZone: "Africa/Algiers" });
  const emoji = severity === "danger" || severity === "critical" ? "🚨" : "⚠️";
  const subject = `${emoji} [DeepSync] ${severity.toUpperCase()} — ${projectId} — ${sensor}`;
  const html = buildAlertEmail({ severity, sValue, sCurve, ratio, sensor, projectId, timestamp, rate });
  const smsBody = buildSmsBody({ severity, sValue, sCurve, ratio, sensor, projectId, timestamp, rate });

  // ── Collect all recipients from DB ──────────────────────────────────────
  let dbUsers: { email: string | null; alertEmail: string | null; alertPhone: string | null }[] = [];
  try {
    dbUsers = await db
      .select({ email: usersTable.email, alertEmail: usersTable.alertEmail, alertPhone: usersTable.alertPhone })
      .from(usersTable)
      .where(eq(usersTable.isActive, true));
  } catch (err) {
    req.log.warn({ err }, "Could not query users for broadcast, falling back to explicit recipients");
  }

  // Build unique recipient sets
  const emailSet = new Set<string>();
  const phoneSet = new Set<string>();

  // From DB users: use alertEmail if set, otherwise fall back to login email
  for (const u of dbUsers) {
    const mail = u.alertEmail || u.email;
    if (mail && mail.includes("@")) emailSet.add(mail);
    if (u.alertPhone && u.alertPhone.startsWith("+")) phoneSet.add(u.alertPhone);
  }

  // Explicit overrides from request body (legacy / fallback)
  if (to && to.includes("@")) emailSet.add(to);
  if (phone && phone.startsWith("+")) phoneSet.add(phone);

  const emailResults: Record<string, unknown> = {};
  const smsResults: Record<string, unknown> = {};

  // ── Send emails ──────────────────────────────────────────────────────────
  await Promise.all([...emailSet].map(async (mail) => {
    const r = await sendEmail({ to: mail, subject, html });
    emailResults[mail] = r;
    if (r.ok) req.log.info({ to: mail, severity }, "Alert email sent");
    else req.log.warn({ to: mail, error: r.error }, "Alert email failed");
  }));

  // ── Send SMS ─────────────────────────────────────────────────────────────
  await Promise.all([...phoneSet].map(async (ph) => {
    const r = await sendSms(ph, smsBody);
    smsResults[ph] = r;
    if (r.ok) req.log.info({ phone: ph, severity }, "Alert SMS sent");
    else req.log.warn({ phone: ph, error: r.error }, "Alert SMS failed");
  }));

  req.log.info({ emailCount: emailSet.size, smsCount: phoneSet.size, severity }, "Alert broadcast complete");
  res.json({ ok: true, emailCount: emailSet.size, smsCount: phoneSet.size, emailResults, smsResults });
});

// POST /api/alerts/test-email — send test email
router.post("/alerts/test-email", async (req, res): Promise<void> => {
  const { to } = req.body as { to: string };
  if (!to || !to.includes("@")) {
    res.status(400).json({ error: "Valid email address required" });
    return;
  }
  const timestamp = new Date().toLocaleString("fr-FR", { timeZone: "Africa/Algiers" });
  const html = buildAlertEmail({ severity: "warning", sValue: 3.82, sCurve: 4.31, ratio: 0.6142, sensor: "NODE_01", projectId: "PROJ_001", timestamp, rate: 6.4 });
  const result = await sendEmail({ to, subject: "🧪 [DeepSync] إيميل تجريبي — اختبار نظام الإنذار", html });
  if (!result.ok) { res.status(500).json({ error: result.error }); return; }
  req.log.info({ to }, "Test email sent");
  res.json({ ok: true, message: `Email sent to ${to}` });
});

// POST /api/alerts/test-sms — send test SMS
router.post("/alerts/test-sms", async (req, res): Promise<void> => {
  const { phone } = req.body as { phone: string };
  if (!phone || !phone.startsWith("+")) {
    res.status(400).json({ error: "Phone number must start with + (e.g. +213555000001)" });
    return;
  }
  const body = [
    "🧪 DeepSync — SMS Test",
    "⚠️ WARNING — PROJ_001",
    "Capteur: NODE_01",
    "s = 3.820 mm > s_ref = 4.310 mm",
    "δ/s = 0.6142 | Taux: 6.40 mm/h",
    new Date().toLocaleString("fr-FR", { timeZone: "Africa/Algiers" }),
  ].join("\n");
  const result = await sendSms(phone, body);
  if (!result.ok) { res.status(500).json({ error: result.error }); return; }
  req.log.info({ phone }, "Test SMS sent");
  res.json({ ok: true, message: `SMS sent to ${phone}` });
});

// Keep backward compat with old /api/alerts/test route
router.post("/alerts/test", async (req, res): Promise<void> => {
  const { to } = req.body as { to: string };
  if (!to || !to.includes("@")) { res.status(400).json({ error: "Valid email required" }); return; }
  const timestamp = new Date().toLocaleString("fr-FR", { timeZone: "Africa/Algiers" });
  const html = buildAlertEmail({ severity: "warning", sValue: 3.82, sCurve: 4.31, ratio: 0.6142, sensor: "NODE_01", projectId: "PROJ_001", timestamp, rate: 6.4 });
  const result = await sendEmail({ to, subject: "🧪 [DeepSync] إيميل تجريبي — اختبار نظام الإنذار", html });
  if (!result.ok) { res.status(500).json({ error: result.error }); return; }
  req.log.info({ to }, "Test email sent");
  res.json({ ok: true, message: `Email sent to ${to}` });
});

logger.info("Alerts routes loaded (Email + SMS)");
export default router;
