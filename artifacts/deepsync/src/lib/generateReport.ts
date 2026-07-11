import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ── Matsuo-Kawamura simulation (same as Dashboard) ─────────────────────────
function sCurve(ratio: number): number {
  return 5.93 * Math.exp(1.28 * ratio * ratio - 3.41 * ratio);
}

function simulateReadings(count: number, seed = 1): Array<{
  time: string; node: string; s: number; sCurv: number; ratio: number; state: string; rate: number;
}> {
  const nodes = ["NODE_01", "NODE_02", "NODE_03"];
  const rows = [];
  let rng = seed;
  const rand = () => { rng = (rng * 9301 + 49297) % 233280; return rng / 233280; };

  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 2 * 60 * 60 * 1000);
    const timeStr = d.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    for (const node of nodes) {
      const ratio = 0.45 + rand() * 0.45;
      const sc = sCurve(ratio);
      const s = sc * (0.85 + rand() * 0.35);
      const rate = rand() * 8;
      let state = "safe";
      if (s > sc) state = rate > 5 ? "critical" : "danger";
      else if (s > sc * 0.9) state = "warning";
      rows.push({ time: timeStr, node, s: Math.round(s * 1000) / 1000, sCurv: Math.round(sc * 1000) / 1000, ratio: Math.round(ratio * 10000) / 10000, state, rate: Math.round(rate * 100) / 100 });
    }
  }
  return rows;
}

// ── Color helpers ────────────────────────────────────────────────────────────
const STATE_RGB: Record<string, [number, number, number]> = {
  safe: [39, 174, 96], warning: [243, 156, 18], danger: [231, 76, 60], critical: [192, 57, 43],
};
const BLUE_DARK: [number, number, number] = [31, 78, 121];
const BLUE_MID: [number, number, number] = [46, 134, 222];
const GREY_LIGHT: [number, number, number] = [248, 249, 250];

function hex(rgb: [number, number, number]) { return rgb; }

// ── Header band ──────────────────────────────────────────────────────────────
function drawHeader(doc: jsPDF, projectId: string, title: string) {
  const W = doc.internal.pageSize.getWidth();
  doc.setFillColor(...BLUE_DARK);
  doc.rect(0, 0, W, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text("DeepSync Platform", 14, 11);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("TerraSync + DeepSight | Surveillance géotechnique intelligente", 14, 17);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(title, 14, 24);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const meta = `Projet: ${projectId}  |  Généré le: ${new Date().toLocaleString("fr-FR", { timeZone: "Africa/Algiers" })}`;
  doc.text(meta, W - 14, 24, { align: "right" });
  doc.setTextColor(0, 0, 0);
}

// ── Footer ───────────────────────────────────────────────────────────────────
function drawFooter(doc: jsPDF, pageNum: number, total: number) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  doc.setFillColor(240, 244, 248);
  doc.rect(0, H - 10, W, 10, "F");
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text("DeepSync © 2026 | Matsuo-Kawamura (1977) | Confidentiel", 14, H - 3);
  doc.text(`Page ${pageNum} / ${total}`, W - 14, H - 3, { align: "right" });
  doc.setTextColor(0, 0, 0);
}

// ── Summary cards ────────────────────────────────────────────────────────────
function drawSummaryCards(doc: jsPDF, y: number, rows: ReturnType<typeof simulateReadings>) {
  const W = doc.internal.pageSize.getWidth();
  const total = rows.length;
  const alerts = rows.filter(r => r.state === "danger" || r.state === "critical").length;
  const warnings = rows.filter(r => r.state === "warning").length;
  const avgRatio = rows.reduce((a, r) => a + r.ratio, 0) / total;
  const maxS = Math.max(...rows.map(r => r.s));

  const cards = [
    { label: "Lectures totales", value: String(total), rgb: BLUE_MID },
    { label: "Alertes danger", value: String(alerts), rgb: [231, 76, 60] as [number,number,number] },
    { label: "Avertissements", value: String(warnings), rgb: [243, 156, 18] as [number,number,number] },
    { label: "δ/s moyen", value: avgRatio.toFixed(4), rgb: [142, 68, 173] as [number,number,number] },
    { label: "s max (mm)", value: maxS.toFixed(3), rgb: [39, 174, 96] as [number,number,number] },
  ];

  const cardW = (W - 28 - 8 * 4) / 5;
  cards.forEach((c, i) => {
    const x = 14 + i * (cardW + 8);
    doc.setFillColor(...c.rgb);
    doc.roundedRect(x, y, cardW, 20, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(c.value, x + cardW / 2, y + 11, { align: "center" });
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.text(c.label, x + cardW / 2, y + 17, { align: "center" });
  });
  doc.setTextColor(0, 0, 0);
  return y + 26;
}

// ── Matsuo-Kawamura formula box ───────────────────────────────────────────────
function drawFormula(doc: jsPDF, y: number) {
  const W = doc.internal.pageSize.getWidth();
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(14, y, W - 28, 14, 2, 2, "F");
  doc.setDrawColor(200, 200, 200);
  doc.roundedRect(14, y, W - 28, 14, 2, 2, "S");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(80, 80, 80);
  doc.text("Modèle Matsuo-Kawamura (1977):", 18, y + 6);
  doc.setFont("courier", "normal");
  doc.text("s = 5.93 × exp(1.28 × (δ/s)² − 3.41 × (δ/s))", 18, y + 11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  return y + 18;
}

// ── Main generator ───────────────────────────────────────────────────────────
export type ReportType = "mensuel" | "hebdomadaire" | "alerte" | "analyse";

export function generatePDF(opts: {
  type: ReportType; projectId: string; lang: string;
}) {
  const { type, projectId } = opts;

  const TITLES: Record<ReportType, string> = {
    mensuel: "Rapport Mensuel — Juin 2026",
    hebdomadaire: "Rapport Hebdomadaire — S25 2026",
    alerte: "Rapport d'Alertes — Juin 2026",
    analyse: "Analyse de Stabilité — Juin 2026",
  };

  const rowCounts: Record<ReportType, number> = { mensuel: 12, hebdomadaire: 6, alerte: 4, analyse: 10 };
  const rows = simulateReadings(rowCounts[type], 42);
  const alertRows = rows.filter(r => r.state === "danger" || r.state === "critical");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  let y = 32;

  // ── Page 1 ─────────────────────────────────────────────────────────────────
  drawHeader(doc, projectId, TITLES[type]);

  // Summary title
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BLUE_DARK);
  doc.text("Résumé exécutif", 14, y);
  doc.setTextColor(0, 0, 0);
  y += 6;

  y = drawSummaryCards(doc, y, rows);
  y = drawFormula(doc, y);

  // Sensor status table
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BLUE_DARK);
  doc.text("État des capteurs", 14, y);
  doc.setTextColor(0, 0, 0);
  y += 4;

  const nodeStats = ["NODE_01", "NODE_02", "NODE_03"].map(n => {
    const nr = rows.filter(r => r.node === n);
    const alerts = nr.filter(r => r.state !== "safe" && r.state !== "warning").length;
    const avgS = nr.reduce((a, r) => a + r.s, 0) / nr.length;
    const maxR = Math.max(...nr.map(r => r.rate));
    return [n, `${avgS.toFixed(3)} mm`, `${maxR.toFixed(2)} mm/h`, `${alerts} alertes`, nr[0]?.state === "safe" ? "✓ Normal" : "⚠ Surveiller"];
  });

  autoTable(doc, {
    startY: y,
    head: [["Capteur", "s moyen", "Taux max", "Alertes", "Statut"]],
    body: nodeStats,
    theme: "grid",
    headStyles: { fillColor: BLUE_DARK, fontSize: 9, fontStyle: "bold" },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: GREY_LIGHT },
    columnStyles: { 4: { fontStyle: "bold" } },
    margin: { left: 14, right: 14 },
  });

  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // Readings table (first page — latest readings)
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BLUE_DARK);
  doc.text("Dernières lectures (extrait)", 14, y);
  doc.setTextColor(0, 0, 0);
  y += 4;

  const latest = rows.slice(-15);
  autoTable(doc, {
    startY: y,
    head: [["Horodatage", "Capteur", "s (mm)", "s_ref (mm)", "δ/s", "Taux mm/h", "État"]],
    body: latest.map(r => [
      r.time, r.node,
      r.s.toFixed(3), r.sCurv.toFixed(3),
      r.ratio.toFixed(4),
      r.rate.toFixed(2),
      r.state.toUpperCase(),
    ]),
    theme: "grid",
    headStyles: { fillColor: BLUE_DARK, fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: GREY_LIGHT },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 6) {
        const st = String(data.cell.raw).toLowerCase();
        const rgb = STATE_RGB[st] || [100, 100, 100];
        data.cell.styles.textColor = hex(rgb);
        data.cell.styles.fontStyle = "bold";
      }
    },
    margin: { left: 14, right: 14 },
  });

  drawFooter(doc, 1, type === "analyse" ? 2 : 1);

  // ── Page 2 (for analyse type — detailed readings) ──────────────────────────
  if (type === "analyse" || type === "mensuel") {
    doc.addPage();
    drawHeader(doc, projectId, TITLES[type] + " — Détail complet");
    y = 34;

    if (alertRows.length > 0) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(192, 57, 43);
      doc.text(`⚠ Alertes critiques détectées: ${alertRows.length}`, 14, y);
      doc.setTextColor(0, 0, 0);
      y += 4;

      autoTable(doc, {
        startY: y,
        head: [["Horodatage", "Capteur", "s (mm)", "s_ref (mm)", "δ/s", "Taux mm/h", "État"]],
        body: alertRows.map(r => [r.time, r.node, r.s.toFixed(3), r.sCurv.toFixed(3), r.ratio.toFixed(4), r.rate.toFixed(2), r.state.toUpperCase()]),
        theme: "grid",
        headStyles: { fillColor: [192, 57, 43] as [number, number, number], fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index === 6) {
            const rgb = STATE_RGB[String(data.cell.raw).toLowerCase()] || [100, 100, 100];
            data.cell.styles.textColor = hex(rgb);
            data.cell.styles.fontStyle = "bold";
          }
        },
        margin: { left: 14, right: 14 },
      });
      y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
    }

    // Recommendations box
    doc.setFillColor(235, 245, 251);
    doc.roundedRect(14, y, W - 28, 40, 3, 3, "F");
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BLUE_DARK);
    doc.text("Recommandations", 18, y + 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    const recs = [
      "• Maintenir une surveillance continue sur NODE_01 (taux de déformation le plus élevé)",
      "• Vérifier la calibration des inclinomètres après tout événement pluvieux > 20mm/j",
      "• Déclencher une inspection terrain si δ/s dépasse 0.85 sur 3 mesures consécutives",
      "• Rapport suivant prévu le " + new Date(Date.now() + 7 * 86400000).toLocaleDateString("fr-FR"),
    ];
    recs.forEach((r, i) => doc.text(r, 18, y + 16 + i * 6));
    doc.setTextColor(0, 0, 0);

    drawFooter(doc, 2, 2);
  }

  // ── Download ───────────────────────────────────────────────────────────────
  const fileName = `DeepSync_${type}_${projectId}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}
