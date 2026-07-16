/**
 * ╔════════════════════════════════════════════════════════════════════╗
 * ║                      RAYGEO PHYSICS CORE v2.0                      ║
 * ║     THE ULTIMATE MULTI-PROJECT GEOTECHNICAL & STRUCTURAL ENGINE    ║
 * ╚════════════════════════════════════════════════════════════════════╝
 */

// التصنيفات السبع الدقيقة للمشاريع الهندسية في منصة RAYGEO
export type ProjectType = 'embankment' | 'road' | 'tunnel' | 'mine' | 'dam' | 'bridge' | 'railway';

export interface PhysicsInput {
  vertical_mm: number;          // الهبوط أو الانحناء العمودي المقاس (s)
  horizontal_mm: number;        // الإزاحة أو التقارب الأفقي الجانبي (δ)
  pore_pressure_kpa?: number;    // ضغط الماء المسامي (u) - خاص بالسدود
  total_stress_kpa?: number;     // الإجهاد الكلي العمودي (σ) - خاص بالسدود والمناجم
  traffic_cycles_n?: number;     // عدد دورات الأحمال المرورية التراكمية (N) - للطرق والسكك
  dynamic_frequency_hz?: number; // التردد الديناميكي المقاس (f) - للجسور والسكك
  geological_gsi?: number;       // مؤشر جودة الكتل الصخرية (GSI) - للمناجم والأنفاق
}

export interface PhysicsResult {
  riskRatio: number;                     // نسبة الخطر الفعلية (0.0 إلى 1.0+)
  status: 'SAFE' | 'CRITICAL' | 'DANGER'; // التقييم الأمني الثلاثي
  description: string;                   // التقرير الفني الفيزيائي التفصيلي
  criticalLimitValue: number;            // الحد الحرج الهندسي الأقصى المحسوب هندسياً
  physicsMetrics: Record<string, number>; // قيم المتغيرات الفيزيائية المساعدة للرسومات البيانية
}

/**
 * 1. الردميات (Embankments) 🏔️
 * تعتمد على معادلة الاستقرار اللوغاريتمية اليابانية (Matsuo & Kawamura 1977) للتنبؤ بالانهيار الجانبي للمنحدرات الترابية.
 */
export function calculateEmbankmentSafety(s: number, delta: number): PhysicsResult {
  const abs_s = Math.abs(s);
  const abs_delta = Math.abs(delta);

  if (abs_s === 0) {
    return {
      riskRatio: 0,
      status: 'SAFE',
      description: 'Stabilité initiale - Pas de mouvement vertical détecté.',
      criticalLimitValue: 0,
      physicsMetrics: { ratio_delta_s: 0, s_limit: 0 }
    };
  }

  const ratio = abs_delta / abs_s;
  
  // معادلة التنبؤ اليابانية بحد الهبوط الحرج المقابل للاستقرار الجانبي
  const s_limit = 5.93 * Math.exp(1.28 * ratio - 3.41 * ratio);
  const riskRatio = abs_s / (s_limit || 1);

  let status: 'SAFE' | 'CRITICAL' | 'DANGER' = 'SAFE';
  let description = 'Massif stable. Déformations dans les limites admissibles.';

  if (riskRatio >= 1.0 || ratio > 1.5) {
    status = 'DANGER';
    description = 'CRITICAL DANGER: Rupture par glissement imminente de l\'enrochement !';
  } else if (riskRatio >= 0.7 || ratio > 1.0) {
    status = 'CRITICAL';
    description = 'Alerte Orange: Accélération des déplacements latéraux par rapport au tassement.';
  }

  return { riskRatio, status, description, criticalLimitValue: s_limit, physicsMetrics: { ratio_delta_s: ratio, s_limit } };
}

/**
 * 2. الطرق السريعة (Roads & Highways) 🛣️
 * تعتمد على نموذج AASHTO للتنبؤ بعمق التخدد والتعب (Rut Depth Formation) لطبقات الأسفلت الأساسية.
 */
export function calculateRoadSafety(vertical_mm: number, traffic_cycles_n: number = 0): PhysicsResult {
  // الحد الأقصى لتخدد المسار المسموح به دولياً لمنع تخرب الطريق هو 20 ملم
  const maxAllowedRutMm = 20.0;
  
  // عامل التضخيم الناتج عن تراكم الأحمال المرورية الثقيلة
  const trafficFactor = traffic_cycles_n > 100000 ? Math.log10(traffic_cycles_n) / 5 : 1.0;
  const actualRutting = Math.abs(vertical_mm) * trafficFactor;
  const riskRatio = actualRutting / maxAllowedRutMm;

  let status: 'SAFE' | 'CRITICAL' | 'DANGER' = 'SAFE';
  let description = 'Chaussée en excellent état. Déformation structurelle minime.';

  if (riskRatio >= 1.0) {
    status = 'DANGER';
    description = 'DANGER: Orniérage profond détecté ! Risque d\'aquaplaning et de ruine de la chaussée.';
  } else if (riskRatio >= 0.75) {
    status = 'CRITICAL';
    description = 'Alerte: Fatigue accélérée de la structure de chaussée sous charge.';
  }

  return { riskRatio, status, description, criticalLimitValue: maxAllowedRutMm, physicsMetrics: { actualRutting, trafficFactor } };
}

/**
 * 3. الأنفاق (Tunnels) 🚇
 * تعتمد على معادلة تقارب جدران الأنفاق الدائرية (Radial Convergence / Peck 1969) وتشويه السقف الخرساني الداعم.
 */
export function calculateTunnelSafety(horizontal_mm: number, vertical_mm: number): PhysicsResult {
  // الحد الأقصى المسموح به لتقارب الجدران الخرسانية لحماية الأنفاق هو 15 ملم
  const maxAllowedConvergenceMm = 15.0;
  
  // حساب قيمة التقارب الشعاعي الكلي (Radial Convergence)
  const actualConvergence = Math.sqrt(Math.pow(horizontal_mm, 2) + Math.pow(vertical_mm, 2));
  const riskRatio = actualConvergence / maxAllowedConvergenceMm;

  let status: 'SAFE' | 'CRITICAL' | 'DANGER' = 'SAFE';
  let description = 'Coque du tunnel stable. Convergence sous tolérance.';

  if (riskRatio >= 1.0) {
    status = 'DANGER';
    description = 'RISQUE D\'EFFONDREMENT: Convergence critique de la voûte du tunnel !';
  } else if (riskRatio >= 0.7) {
    status = 'CRITICAL';
    description = 'Alerte Structurelle: Déformation de la membrane supérieure détectée. Inspecter les cintres.';
  }

  return { riskRatio, status, description, criticalLimitValue: maxAllowedConvergenceMm, physicsMetrics: { actualConvergence } };
}

/**
 * 4. المناجم والصخور (Mines & Rock Slopes) ⛏️
 * تطبيق جزئي لمعيار "هوك-براون" (Hoek-Brown Criterion) لحساب زحف وتفتت السقوف والكتل الصخرية تحت ضغط طبقات الأرض الجيولوجية.
 */
export function calculateMineSafety(total_stress_kpa: number = 0, geological_gsi: number = 50): PhysicsResult {
  // حساب مقاومة الكتلة الصخرية الحرجة بناءً على مؤشر جودة الصخر GSI (0-100)
  // كلما قل مؤشر GSI كلما ضعفت الصخور وتحملت إجهاداً أقل قبل الانهيار فجأة
  const baseRockStrengthKpa = 5000.0; // قوة الصخر السليم
  const criticalStressLimit = baseRockStrengthKpa * Math.exp((geological_gsi - 100) / 28);
  
  const riskRatio = total_stress_kpa / (criticalStressLimit || 1);

  let status: 'SAFE' | 'CRITICAL' | 'DANGER' = 'SAFE';
  let description = 'Massif rocheux stable. Équilibre des contraintes de confinement.';

  if (riskRatio >= 1.0) {
    status = 'DANGER';
    description = 'DANGER EXTRÊME: Contrainte supérieure à la rupture du massif ! Risque de coup de terrain (Rockburst).';
  } else if (riskRatio >= 0.8) {
    status = 'CRITICAL';
    description = 'Alerte Minière: Instabilité du toit ou des piliers de mine détectée.';
  }

  return { riskRatio, status, description, criticalLimitValue: criticalStressLimit, physicsMetrics: { rock_strength_limit: criticalStressLimit } };
}

/**
 * 5. السدود المائية (Dams) 🌊
 * تعتمد على قانون تيرزاغي للإجهادات الفعالة (Terzaghi's Effective Stress Principle) وحساب تسرب وضغط الماء المسامي الداخلي.
 */
export function calculateDamSafety(pore_pressure_kpa: number = 0, total_stress_kpa: number = 300): PhysicsResult {
  // الإجهاد الفعال = الإجهاد الكلي لوزن السد - ضغط الماء المسامي (Sigma' = Sigma - u)
  // إذا اقترب ضغط الماء من الإجهاد الكلي، ينهار السد هيدروليكياً وتتحرك جزيئات التربة كالسائل
  const effectiveStress = total_stress_kpa - pore_pressure_kpa;
  
  // نسبة الخطر الهيدروليكي (عندما تقترب النسبة u/total_stress من 0.85+)
  const riskRatio = pore_pressure_kpa / (total_stress_kpa || 1);

  let status: 'SAFE' | 'CRITICAL' | 'DANGER' = 'SAFE';
  let description = 'Pression hydrostatique équilibrée. Noyau étanche.';

  if (riskRatio >= 0.85 || effectiveStress <= 40) {
    status = 'DANGER';
    description = 'DANGER DE SUBMERSION/RENAUDEMENT: Pression interstitielle critique ! Risque de renard hydraulique.';
  } else if (riskRatio >= 0.65 || effectiveStress <= 100) {
    status = 'CRITICAL';
    description = 'Alerte Hydraulique: Gradient hydraulique élevé. Augmentation anormale des infiltrations d\'eau.';
  }

  return { riskRatio, status, description, criticalLimitValue: total_stress_kpa * 0.85, physicsMetrics: { effectiveStress, stress_ratio: riskRatio } };
}

/**
 * 6. الجسور (Bridges) 🌉
 * تعتمد على معادلة Euler-Bernoulli للانحناء والتردد مع حساب معامل التضخيم الديناميكي (Dynamic Amplification Factor) لمنع حدوث الرنين التدميري.
 */
export function calculateBridgeSafety(vertical_mm: number, dynamic_frequency_hz: number = 0): PhysicsResult {
  const maxAllowedDeflectionMm = 25.0; // الحد الأقصى لانحناء رافدة الجسر المسموح به لتجنب انهيار البنية الأساسية
  
  // تردد الرنين الطبيعي للجسر الافتراضي هو 3.0 هرتز. إذا اقترب التردد الخارجي منه يتضخم الانحناء ديناميكياً
  let daf = 1.0;
  if (dynamic_frequency_hz > 0) {
    const frequencyRatio = dynamic_frequency_hz / 3.0;
    // حساب تقريبي لمعامل التضخيم الديناميكي لتجسيد أثر الاهتزازات
    daf = 1 / Math.sqrt(Math.pow(1 - Math.pow(frequencyRatio, 2), 2) + 0.04);
  }

  const dynamicDeflection = Math.abs(vertical_mm) * daf;
  const riskRatio = dynamicDeflection / maxAllowedDeflectionMm;

  let status: 'SAFE' | 'CRITICAL' | 'DANGER' = 'SAFE';
  let description = 'Tablier stable. Flexion dynamique dans l\'enveloppe élastique.';

  if (riskRatio >= 1.0) {
    status = 'DANGER';
    description = 'ALERTE DE FATIGUE DE STRUCTURE: Flexion dynamique critique de la travée principale !';
  } else if (riskRatio >= 0.75) {
    status = 'CRITICAL';
    description = 'Alerte Dynamique: Vibrations périodiques anormales. Risque de fatigue harmonique du béton.';
  }

  return { riskRatio, status, description, criticalLimitValue: maxAllowedDeflectionMm, physicsMetrics: { dynamicDeflection, daf } };
}

/**
 * 7. السكك الحديدية (Railways) 🚊
 * تعتمد على نموذج الهبوط التراكمي لطبقة البلاست الحصوية (Alva-Hurtado & Selig 1981) نتيجة الأحمال والاهتزازات الدورية المستمرة للقطارات.
 */
export function calculateRailwaySafety(vertical_mm: number, traffic_cycles_n: number = 0): PhysicsResult {
  // الحد الأقصى المسموح به لهبوط السكة الحديدية لمنع خروج القطارات السريعة عن السكة هو 12 ملم
  const maxAllowedSettlementMm = 12.0;

  // قانون الهبوط التراكمي لطبقة البلاست
  const logCycles = traffic_cycles_n > 0 ? Math.log10(traffic_cycles_n) : 0;
  const ballastDeformationFactor = 1 + 0.2 * logCycles;
  const simulatedSettlement = Math.abs(vertical_mm) * ballastDeformationFactor;

  const riskRatio = simulatedSettlement / maxAllowedSettlementMm;

  let status: 'SAFE' | 'CRITICAL' | 'DANGER' = 'SAFE';
  let description = 'Géométrie de la voie conforme. Assise de ballast stable.';

  if (riskRatio >= 1.0) {
    status = 'DANGER';
    description = 'DANGER DE DÉRAILLEMENT: Affaissement critique de la voie ! Trafic ferroviaire à stopper.';
  } else if (riskRatio >= 0.7) {
    status = 'CRITICAL';
    description = 'Alerte Voie: Déformation de l\'assise du ballast. Planifier un bourrage de voie.';
  }

  return { riskRatio, status, description, criticalLimitValue: maxAllowedSettlementMm, physicsMetrics: { simulatedSettlement, ballastDeformationFactor } };
}

/**
 * ═════════════════════════════════════════════════════════════════════════
 * دالة التوزيع الماستر والذكية لتوجيه القراءات فورياً حسب نوع المنشأة المحدد بدقة
 * ═════════════════════════════════════════════════════════════════════════
 */
export function evaluateGeotechnicalSafety(
  projectType: ProjectType,
  inputs: PhysicsInput
): PhysicsResult {
  switch (projectType) {
    case 'embankment':
      return calculateEmbankmentSafety(inputs.vertical_mm, inputs.horizontal_mm);
    
    case 'road':
      return calculateRoadSafety(inputs.vertical_mm, inputs.traffic_cycles_n || 0);
    
    case 'tunnel':
      return calculateTunnelSafety(inputs.horizontal_mm, inputs.vertical_mm);
    
    case 'mine':
      return calculateMineSafety(inputs.total_stress_kpa || 0, inputs.geological_gsi || 50);
    
    case 'dam':
      return calculateDamSafety(inputs.pore_pressure_kpa || 0, inputs.total_stress_kpa || 300);
    
    case 'bridge':
      return calculateBridgeSafety(inputs.vertical_mm, inputs.dynamic_frequency_hz || 0);
    
    case 'railway':
      return calculateRailwaySafety(inputs.vertical_mm, inputs.traffic_cycles_n || 0);

    default:
      return {
        riskRatio: 0,
        status: 'SAFE',
        description: 'Type de projet non configuré dans l\'algorithme de RAYGEO.',
        criticalLimitValue: 0,
        physicsMetrics: {}
      };
  }
}