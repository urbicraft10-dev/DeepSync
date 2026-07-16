export interface Reading {
  timestamp: string;
  s: number;
  taux: number; // Taux mm/h
  status: string;
}

// تعريف أنواع المشاريع
export type ProjectType = 'TUNNEL' | 'ROAD' | 'BRIDGE' | 'MINE' | 'BUILDING' | 'RAILWAY';

export const analyzeGeotechnicalRisk = (history: Reading[], type: ProjectType) => {
  // مصفوفة المعايير: كل مشروع له حساسية مختلفة للانهيار
  const thresholds: Record<ProjectType, number> = {
    TUNNEL: 0.70,   // الأنفاق حساسة جداً
    ROAD: 0.85,     // الطرقات تتحمل أكثر
    BRIDGE: 0.60,   // الجسور تتطلب دقة عالية جداً
    MINE: 0.50,     // المناجم هي الأكثر خطورة
    BUILDING: 0.75,
    RAILWAY: 0.65
  };

  const limit = thresholds[type];
  const recentThree = history.slice(-3);
  const exceedsThreshold = recentThree.every(r => r.taux > limit);
  
  const dangerCount = history.filter(h => h.status === 'CRITICAL' || h.status === 'DANGER').length;
  const score = (dangerCount / Math.max(history.length, 1)) * 100;

  return {
    isCritical: exceedsThreshold || score > 70,
    probability: `${Math.min(score, 100).toFixed(1)}%`,
    recommendation: exceedsThreshold ? `فحص ميداني فوري مطلوب لـ ${type}` : "مراقبة دورية"
  };
};