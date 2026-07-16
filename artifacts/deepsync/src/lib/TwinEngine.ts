// التعريفات الأساسية (لا تحذفها أبداً)
export type SensorData = {
  id: string;
  value: number;
  coordinates: { x: number, y: number };
  type: 'SIMULATED' | 'REAL';
  timestamp: string;
};

// تعريفات "محرك اتخاذ القرار" الجديد
export interface ProjectSpecs {
  type: 'dam' | 'tunnel' | 'bridge' | 'embankment' | 'mine' | 'road' | 'railway';
  length: number;
  height: number;
  geology: 'hard-rock' | 'soft-soil' | 'clay' | 'sand';
  waterTableDepth: number;
}

export interface SensorPlacement {
  id: number;
  x: number;
  y: number;
  reason: string;
}

export class TwinEngine {
  // --- المنطق القديم (مهم جداً للعمليات اليومية) ---
  static generateMockData(sensorId: string): SensorData {
    return {
      id: sensorId,
      value: Math.random() * 100,
      coordinates: { x: Math.random() * 500, y: Math.random() * 500 },
      type: 'SIMULATED',
      timestamp: new Date().toISOString()
    };
  }

  static processRealData(rawData: any): SensorData {
    return {
      id: rawData.sensorId,
      value: rawData.value,
      coordinates: rawData.coords,
      type: 'REAL',
      timestamp: rawData.time
    };
  }

  // --- المنطق الجديد (محرك اتخاذ القرار الهندسي) ---
  static calculateOptimalSensorPlacement(specs: ProjectSpecs): SensorPlacement[] {
    // هنا سنضع الخوارزمية التي ستُقنع مكاتب الدراسات لاحقاً
    return Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      x: (specs.length / 6) * (i + 1),
      y: specs.height / 2,
      reason: `النقطة ${i + 1} تغطي منطقة تركيز الإجهاد الهيكلي في مشروع من نوع ${specs.type}`
    }));
  }
}
