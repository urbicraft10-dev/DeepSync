import { Router, Request, Response } from "express";
import { evaluateGeotechnicalSafety, ProjectType } from "../physicsEngine";
import { db } from "@workspace/db"; // استيراد اتصال قاعدة البيانات الرئيسي للمشروع
import { telemetry } from "@workspace/db"; // استيراد جدول التيليميتري الذي أنشأناه للتو

const router = Router();

interface TelemetryPayload {
  project_id: string;
  project_type: ProjectType;
  gateway_id: string;
  sensor_id: string;
  vertical_mm: number;
  horizontal_mm: number;
  pore_pressure_kpa?: number;
  total_stress_kpa?: number;
  traffic_cycles_n?: number;
  dynamic_frequency_hz?: number;
  geological_gsi?: number;
  timestamp: number;
}

function verifySecureEdge(gatewayId: string): boolean {
  if (!gatewayId || !gatewayId.startsWith("RAYGEO_GW_")) {
    return false;
  }
  return true;
}

/**
 * استقبال القراءات وحفظها لحظياً في قاعدة البيانات بعد فحصها فيزيائياً
 * POST /api/telemetry
 */
router.post("/telemetry", async (req: Request, res: Response): Promise<void> => {
  try {
    const payload: TelemetryPayload = req.body;

    // 1. التحقق الأمني من جهاز الحافة
    if (!verifySecureEdge(payload.gateway_id)) {
      res.status(401).json({ 
        error: "Unauthorized Security Edge Device", 
        message: "Échec de l'authentification de la passerelle de terrain." 
      });
      return;
    }

    // 2. التحليل الفيزيائي السباعي الحصين لـ RAYGEO
    const physicsEvaluation = evaluateGeotechnicalSafety(payload.project_type, {
      vertical_mm: payload.vertical_mm,
      horizontal_mm: payload.horizontal_mm,
      pore_pressure_kpa: payload.pore_pressure_kpa,
      total_stress_kpa: payload.total_stress_kpa,
      traffic_cycles_n: payload.traffic_cycles_n,
      dynamic_frequency_hz: payload.dynamic_frequency_hz,
      geological_gsi: payload.geological_gsi
    });

    // 3. كتابة البيانات مباشرة بداخل قاعدة بيانات PostgreSQL باستخدام Drizzle ORM
    const [insertedRecord] = await db.insert(telemetry).values({
      projectId: payload.project_id,
      projectType: payload.project_type,
      gatewayId: payload.gateway_id,
      sensorId: payload.sensor_id,
      verticalMm: payload.vertical_mm,
      horizontalMm: payload.horizontal_mm,
      porePressureKpa: payload.pore_pressure_kpa,
      totalStressKpa: payload.total_stress_kpa,
      trafficCyclesN: payload.traffic_cycles_n,
      dynamicFrequencyHz: payload.dynamic_frequency_hz,
      geologicalGsi: payload.geological_gsi,
      riskRatio: physicsEvaluation.riskRatio,
      status: physicsEvaluation.status,
      description: physicsEvaluation.description,
      criticalLimitValue: physicsEvaluation.criticalLimitValue,
      physicsMetrics: physicsEvaluation.physicsMetrics
    }).returning();

    console.log(`[RAYGEO DB] Signal sauvegardé avec succès ID: ${insertedRecord.id} | Status: ${physicsEvaluation.status}`);

    // إرجاع النتيجة المحللة والمحفوظة بنجاح
    res.status(201).json({
      status: "synchronized",
      message: "Données reçues, analysées et sauvegardées avec succès.",
      data: insertedRecord
    });

  } catch (error: any) {
    console.error("[RAYGEO ERROR] Erreur lors de la sauvegarde du signal:", error);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});

export default router;