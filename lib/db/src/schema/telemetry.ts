import { pgTable, uuid, varchar, doublePrecision, integer, timestamp, jsonb } from "drizzle-orm/pg-core";

// تعريف جدول استقبال وتحليل القراءات الحقلية لـ RAYGEO
export const telemetry = pgTable("telemetry", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: varchar("project_id", { length: 100 }).notNull(),
  projectType: varchar("project_type", { length: 50 }).notNull(), // 'embankment' | 'road' | 'tunnel' | 'mine' | 'dam' | 'bridge' | 'railway'
  gatewayId: varchar("gateway_id", { length: 100 }).notNull(),
  sensorId: varchar("sensor_id", { length: 100 }).notNull(),
  
  // المقاييس الفيزيائية الأساسية المشتركة
  verticalMm: doublePrecision("vertical_mm").notNull(),
  horizontalMm: doublePrecision("horizontal_mm").notNull(),
  
  // مقاييس فيزيائية اختيارية متخصصة حسب نوع المنشأة
  porePressureKpa: doublePrecision("pore_pressure_kpa"),
  totalStressKpa: doublePrecision("total_stress_kpa"),
  trafficCyclesN: integer("traffic_cycles_n"),
  dynamicFrequencyHz: doublePrecision("dynamic_frequency_hz"),
  geologicalGsi: integer("geological_gsi"),

  // نتائج تقييم المحرك الفيزيائي السباعي (Physics Engine Outputs)
  riskRatio: doublePrecision("risk_ratio").notNull(),
  status: varchar("status", { length: 20 }).notNull(), // 'SAFE' | 'CRITICAL' | 'DANGER'
  description: varchar("description", { length: 500 }).notNull(),
  criticalLimitValue: doublePrecision("critical_limit_value").notNull(),
  physicsMetrics: jsonb("physics_metrics").notNull(), // تخزين القيم المساعدة للرسومات البيانية

  createdAt: timestamp("created_at").defaultNow().notNull()
});