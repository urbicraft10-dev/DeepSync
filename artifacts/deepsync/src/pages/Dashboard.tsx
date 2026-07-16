import { analyzeGeotechnicalRisk, Reading } from './aiEngine';
import { useState, useEffect, useRef } from "react";
import { AIButton } from './AIButton';
import { TwinEngine, SensorData, SensorPlacement } from '../lib/TwinEngine';
import { ControlPanel } from '@/components/ControlPanel';
import * as THREE from 'three';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ScatterChart,
  Scatter
} from "recharts";

// ============================================================
// 1. الأنواع (Types) والواجهات (Interfaces)
// ============================================================

export type ProjectType = 'embankment' | 'road' | 'tunnel' | 'mine' | 'dam' | 'bridge' | 'railway';

interface PhysicsInput {
  vertical_mm: number;
  horizontal_mm: number;
  pore_pressure_kpa?: number;
  total_stress_kpa?: number;
  traffic_cycles_n?: number;
  dynamic_frequency_hz?: number;
  geological_gsi?: number;
}

interface PhysicsOutput {
  riskRatio: number;
  status: 'safe' | 'warning' | 'danger' | 'critical';
  description: string;
  criticalLimitValue: number;
  physicsMetrics: Record<string, any>;
}

interface CustomSensor {
  id: string;
  type: 'V' | 'H';
  position: [number, number, number];
  color: string;
}

interface Props {
  deviceId?: string;
  projectId?: string;
}

// ============================================================
// 2. الثوابت (Constants)
// ============================================================

const STATUS_COLORS: Record<string, string> = {
  safe: "#27AE60",
  warning: "#F39C12",
  danger: "#E74C3C",
  critical: "#C0392B",
};

const ZONES = [
  { color: "#27AE60", emoji: "🟢", label: "Zone de Sécurité (SAFE)", desc: "Comportement normal." },
  { color: "#F39C12", emoji: "🟡", label: "Attention (WARNING)", desc: "Déformation mineure." },
  { color: "#E67E22", emoji: "🟠", label: "Alerte (DANGER)", desc: "Seuil critique dépassé." },
  { color: "#E74C3C", emoji: "🔴", label: "Effondrement (CRITICAL)", desc: "Évacuation immédiate." },
];

// ============================================================
// 3. الدوال المساعدة (Helper Functions)
// ============================================================

function evaluateGeotechnicalSafetyLocal(type: ProjectType, input: PhysicsInput): PhysicsOutput {
  const { vertical_mm, horizontal_mm } = input;
  let riskRatio = 0;
  let criticalLimitValue = 50;
  let details = "";
  let metrics: Record<string, any> = {};

  switch (type) {
    case "dam": {
      const porePressure = input.pore_pressure_kpa ?? 150;
      criticalLimitValue = 40;
      const settlementRisk = vertical_mm / criticalLimitValue;
      const poreRisk = porePressure / 300;
      riskRatio = Math.max(settlementRisk, poreRisk);
      metrics = { "Pore Pressure": `${porePressure} kPa` };
      details = `Barrage: Analyse de tassement et de pression interstitielle dans le massif rocheux.`;
      break;
    }
    case "tunnel": {
      const totalStress = input.total_stress_kpa ?? 200;
      criticalLimitValue = 30;
      const convRisk = horizontal_mm / criticalLimitValue;
      const stressRisk = totalStress / 500;
      riskRatio = Math.max(convRisk, stressRisk);
      metrics = { "Total Stress": `${totalStress} kPa` };
      details = `Tunnel: Convergence de la voûte sous la charge du montagne.`;
      break;
    }
    case "bridge": {
      const traffic = input.traffic_cycles_n ?? 5000;
      const freq = input.dynamic_frequency_hz ?? 2.5;
      criticalLimitValue = 25;
      const verticalRisk = vertical_mm / criticalLimitValue;
      const dynamicRisk = freq > 5.0 ? 1.2 : freq < 1.0 ? 0.8 : 0.5;
      riskRatio = Math.max(verticalRisk, dynamicRisk);
      metrics = { "Traffic Cycles": traffic, "Frequency": `${freq} Hz` };
      details = `Pont: Flèche verticale sous chargement dynamique routier.`;
      break;
    }
    case "mine": {
      const gsi = input.geological_gsi ?? 65;
      criticalLimitValue = 60;
      const lateralRisk = horizontal_mm / criticalLimitValue;
      const stabilityFactor = gsi < 40 ? 1.5 : 1.0;
      riskRatio = lateralRisk * stabilityFactor;
      metrics = { "GSI": gsi };
      details = `Mine: Stabilité des galeries d'excavation souterraines profondes.`;
      break;
    }
    case "railway": {
      const freq = input.dynamic_frequency_hz ?? 3.0;
      criticalLimitValue = 20;
      const verticalRisk = vertical_mm / criticalLimitValue;
      const trackVibrationRisk = freq / 8.0;
      riskRatio = Math.max(verticalRisk, trackVibrationRisk);
      metrics = { "Vibration Freq": `${freq} Hz` };
      details = `Voie Ferrée: Déformation de la plate-forme sous cycles ferroviaires rapides.`;
      break;
    }
    case "road": {
      const traffic = input.traffic_cycles_n ?? 12000;
      criticalLimitValue = 45;
      const ruttingRisk = vertical_mm / criticalLimitValue;
      const fatigueFactor = traffic > 20000 ? 1.3 : 1.0;
      riskRatio = ruttingRisk * fatigueFactor;
      metrics = { "Traffic Vol": traffic };
      details = `Route: Analyse de l'orniérage sur chaussée souple déformable.`;
      break;
    }
    case "embankment":
    default: {
      criticalLimitValue = 50;
      const ratio = vertical_mm > 0.1 ? horizontal_mm / vertical_mm : 0;
      const sCurve = 5.93 * Math.exp(1.28 * ratio * ratio - 3.41 * ratio);
      riskRatio = vertical_mm / sCurve;
      metrics = { "Matsuo Ratio": ratio.toFixed(3), "S-Curve Limit": sCurve.toFixed(2) };
      details = `Remblai: Méthode Matsuo-Kawamura standard pour l'évaluation de la rupture de pente.`;
      break;
    }
  }

  let status: 'safe' | 'warning' | 'danger' | 'critical' = 'safe';
  if (riskRatio >= 1.2) status = 'critical';
  else if (riskRatio >= 1.0) status = 'danger';
  else if (riskRatio >= 0.8) status = 'warning';

  return { riskRatio, status, description: details, criticalLimitValue, physicsMetrics: metrics };
}

function getStabilityCurve(): Array<{ ratio: number; s: number }> {
  const points = [];
  for (let i = 0; i <= 100; i++) {
    const ratio = i / 100;
    const s = 5.93 * Math.exp(1.28 * ratio * ratio - 3.41 * ratio);
    points.push({ ratio: parseFloat(ratio.toFixed(3)), s: parseFloat(s.toFixed(3)) });
  }
  return points;
}

const stabilityCurve = getStabilityCurve();

function simulatePhysicsReading(prev: any, type: ProjectType, isFakeCollapse: boolean): any {
  const vertical_mm = prev?.vertical_mm ?? 3.2;
  const horizontal_mm = prev?.horizontal_mm ?? 1.8;

  let newVertical_mm = vertical_mm;
  let newHorizontal_mm = horizontal_mm;

  if (isFakeCollapse) {
    newVertical_mm += (Math.random() * 0.8) + 0.4;
    newHorizontal_mm += (Math.random() * 0.6) + 0.3;
  } else {
    newVertical_mm = Math.max(0.5, vertical_mm + (Math.random() - 0.45) * 0.2);
    newHorizontal_mm = Math.max(0.2, horizontal_mm + (Math.random() - 0.48) * 0.15);
  }

  const pore_pressure_kpa = type === "dam" ? Math.max(50, (prev?.pore_pressure_kpa ?? 140) + (Math.random() - 0.4) * 5) : undefined;
  const total_stress_kpa = type === "tunnel" ? Math.max(100, (prev?.total_stress_kpa ?? 190) + (Math.random() - 0.4) * 6) : undefined;
  const traffic_cycles_n = (type === "bridge" || type === "road") ? (prev?.traffic_cycles_n ?? 5000) + Math.floor(Math.random() * 5) : undefined;
  const dynamic_frequency_hz = (type === "bridge" || type === "railway") ? Math.max(0.5, Math.min(10, (prev?.dynamic_frequency_hz ?? 2.5) + (Math.random() - 0.5) * 0.1)) : undefined;
  const geological_gsi = type === "mine" ? Math.max(10, Math.min(100, (prev?.geological_gsi ?? 65) + (Math.random() > 0.9 ? (Math.random() > 0.5 ? 1 : -1) : 0))) : undefined;

  const evaluation = evaluateGeotechnicalSafetyLocal(type, {
    vertical_mm: newVertical_mm,
    horizontal_mm: newHorizontal_mm,
    pore_pressure_kpa,
    total_stress_kpa,
    traffic_cycles_n,
    dynamic_frequency_hz,
    geological_gsi
  });

  return {
    vertical_mm: newVertical_mm,
    horizontal_mm: newHorizontal_mm,
    pore_pressure_kpa,
    total_stress_kpa,
    traffic_cycles_n,
    dynamic_frequency_hz,
    geological_gsi,
    ...evaluation
  };
}

// ============================================================
// 4. المكون الرئيسي (Main Component)
// ============================================================

export default function Dashboard({ deviceId = "SENSOR-01", projectId = "PROJECT-DEFAULT" }: Props) {
  // ============================================================
  // 4.1. جميع الـ Hooks في المستوى الأعلى
  // ============================================================

  // حالات المشروع والبيانات
  const [projectType, setProjectType] = useState<ProjectType>("embankment");
  const [verticalData, setVerticalData] = useState<Array<{ time: string; s: number }>>([]);
  const [horizontalData, setHorizontalData] = useState<Array<{ time: string; sh: number }>>([]);
  const [scatterPoints, setScatterPoints] = useState<Array<{ ratio: number; s: number }>>([]);

  // حالات المصادر والوضع
  const [dataSource, setDataSource] = useState<'SIMULATION' | 'REAL'>('SIMULATION');
  const [isSimulation, setIsSimulation] = useState<boolean>(true);
  const [isLiveActive, setIsLiveActive] = useState<boolean>(false);
  const [isFakeSimulation, setIsFakeSimulation] = useState<boolean>(false);
  const [isSystemFrozen, setIsSystemFrozen] = useState<boolean>(false);
  const [isRealMode, setIsRealMode] = useState<boolean>(true);
  const [liveStatus, setLiveStatus] = useState<"connecting" | "live" | "offline">("connecting");

  // حالات البيانات
  const [realSensorData, setRealSensorData] = useState<SensorData[]>([]);
  const [allReadings, setAllReadings] = useState<Reading[]>([]);
  const [sensors, setSensors] = useState<SensorPlacement[]>([]);

  // حالات الحساسات اليدوية
  const [manualSensors, setManualSensors] = useState<CustomSensor[]>([]);
  const [activePlacementMode, setActivePlacementMode] = useState<'V' | 'H' | null>(null);
  const [showSensors, setShowSensors] = useState<boolean>(true);
  const [showStructures, setShowStructures] = useState<boolean>(true);

  // حالات الواجهة
  const [emailSentBanner, setEmailSentBanner] = useState<string>("");
  const [status, setStatus] = useState<'IDLE' | 'MOCK' | 'REAL'>('IDLE');

  // الحالة الحالية للقراءات
  const [current, setCurrent] = useState<{
    vertical_mm: number;
    horizontal_mm: number;
    pore_pressure_kpa?: number;
    total_stress_kpa?: number;
    traffic_cycles_n?: number;
    dynamic_frequency_hz?: number;
    geological_gsi?: number;
    riskRatio: number;
    status: 'safe' | 'warning' | 'danger' | 'critical';
    description: string;
    criticalLimitValue: number;
    physicsMetrics: Record<string, any>;
  }>({
    vertical_mm: 3.2,
    horizontal_mm: 1.8,
    pore_pressure_kpa: 145,
    total_stress_kpa: 180,
    traffic_cycles_n: 4500,
    dynamic_frequency_hz: 2.4,
    geological_gsi: 65,
    riskRatio: 0.56,
    status: "safe",
    description: "",
    criticalLimitValue: 50,
    physicsMetrics: {}
  });

  const [sensorHistory, setSensorHistory] = useState<any[]>([]);

  // الـ Refs
const prevRef = useRef(current);
const lastAlertRef = useRef<number>(0);
const mountRef = useRef<HTMLDivElement | null>(null);
const sceneRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const structuresGroupRef = useRef<any>(null);
  const sensorGroupRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);
  const clockRef = useRef<any>(new THREE.Clock());;

  // ============================================================
  // 4.2. useEffect للاتصال (Connection)
  // ============================================================

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLiveStatus("live");
    }, 1200);
    return () => clearTimeout(timeout);
  }, []);

  // ============================================================
  // 4.3. useEffect للمحاكاة الحية (Live Simulation)
  // ============================================================

  useEffect(() => {
    if (!isLiveActive) return;

    const interval = setInterval(() => {
      const fakeReading = {
        value: Math.random() * 10,
        timestamp: new Date().toLocaleTimeString()
      };
      setRealSensorData(prev => [...prev.slice(-9), fakeReading as any]);
    }, 3000);

    return () => clearInterval(interval);
  }, [isLiveActive]);

  // ============================================================
  // 4.4. useEffect للمحاكاة الفيزيائية (Physics Simulation)
  // ============================================================

  useEffect(() => {
    if (isSystemFrozen) return;
    const interval = setInterval(() => {
      const reading = simulatePhysicsReading(prevRef.current, projectType, isFakeSimulation);
      prevRef.current = reading;
      setCurrent(reading);

      const time = new Date().toLocaleTimeString("fr-FR");
      setVerticalData(prev => [...prev.slice(-40), { time, s: parseFloat(reading.vertical_mm.toFixed(3)) }]);
      setHorizontalData(prev => [...prev.slice(-40), { time, sh: parseFloat(reading.horizontal_mm.toFixed(3)) }]);

      const matsuoRatio = reading.vertical_mm > 0.1 ? reading.horizontal_mm / reading.vertical_mm : 0;
      setScatterPoints(prev => [...prev.slice(-20), {
        ratio: parseFloat(matsuoRatio.toFixed(4)),
        s: parseFloat(reading.vertical_mm.toFixed(3))
      }]);

      if (reading.status === "danger" || reading.status === "critical") {
        fireAlert(reading);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [projectType, isFakeSimulation, isSystemFrozen]);

  // ============================================================
  // 4.5. useEffect لـ Three.js (3D Scene)
  // ============================================================

  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = 400;

    // إنشاء المشهد
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#0B111E");
    sceneRef.current = scene;

    // إنشاء الكاميرا
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(0, 12, 18);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // إنشاء المُعَرِّض (Renderer)
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // ====== الإضاءة ======

    // إضاءة محيطية
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // إضاءة اتجاهية رئيسية
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    // إضاءة اتجاهية ثانوية
    const dirLight2 = new THREE.DirectionalLight(0x00E676, 0.3);
    dirLight2.position.set(-10, 5, -10);
    scene.add(dirLight2);

    // إضاءة نقطية
    const pointLight = new THREE.PointLight(0x00E676, 0.5, 30);
    pointLight.position.set(0, 5, 0);
    scene.add(pointLight);

    // ====== المجموعات ======

    // مجموعة المنشآت
    const structuresGroup = new THREE.Group();
    structuresGroupRef.current = structuresGroup;

    // مجموعة الحساسات
    const sensorGroup = new THREE.Group();
    sensorGroupRef.current = sensorGroup;

    // ====== 1. الجبل والنفق (Tunnel Mountain) ======

    const mountainMat = new THREE.MeshStandardMaterial({
      color: 0x8D6E63,
      roughness: 0.9,
      flatShading: true
    });

    // الجبل الرئيسي
    const mountainGeo = new THREE.ConeGeometry(5, 6, 4);
    const mountain = new THREE.Mesh(mountainGeo, mountainMat);
    mountain.position.set(-6, 3, -3);
    mountain.castShadow = true;
    mountain.receiveShadow = true;
    mountain.name = "tunnel_mountain";
    structuresGroup.add(mountain);

    // النفق
    const tunnelCylinderGeo = new THREE.CylinderGeometry(1.2, 1.2, 8, 16);
    const tunnelCylinderMat = new THREE.MeshStandardMaterial({
      color: 0x3E2723,
      side: THREE.DoubleSide,
      roughness: 0.8
    });
    const tunnelCylinder = new THREE.Mesh(tunnelCylinderGeo, tunnelCylinderMat);
    tunnelCylinder.rotation.z = Math.PI / 2;
    tunnelCylinder.position.set(-6, 1, -3);
    structuresGroup.add(tunnelCylinder);

    // ====== 2. السد المائي (Dam) ======

    const damMat = new THREE.MeshStandardMaterial({
      color: 0x7F8C8D,
      metalness: 0.2,
      roughness: 0.6
    });

    // جسم السد
    const damGeo = new THREE.BoxGeometry(1, 4, 6);
    const dam = new THREE.Mesh(damGeo, damMat);
    dam.position.set(6, 2, -3);
    dam.castShadow = true;
    dam.receiveShadow = true;
    dam.name = "dam";
    structuresGroup.add(dam);

    // البحيرة
    const lakeGeo = new THREE.BoxGeometry(4, 0.5, 5.8);
    const lakeMat = new THREE.MeshStandardMaterial({
      color: 0x2980B9,
      transparent: true,
      opacity: 0.8,
      roughness: 0.2,
      metalness: 0.1
    });
    const lake = new THREE.Mesh(lakeGeo, lakeMat);
    lake.position.set(8.5, 0.25, -3);
    structuresGroup.add(lake);

    // جبال حماية السد
    const damMountain1 = new THREE.Mesh(new THREE.ConeGeometry(3, 5, 4), mountainMat);
    damMountain1.position.set(6, 2.5, -6.5);
    damMountain1.castShadow = true;
    structuresGroup.add(damMountain1);

    const damMountain2 = new THREE.Mesh(new THREE.ConeGeometry(3, 5, 4), mountainMat);
    damMountain2.position.set(6, 2.5, 0.5);
    damMountain2.castShadow = true;
    structuresGroup.add(damMountain2);

    // ====== 3. الطريق (Road) ======

    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x2C3E50,
      roughness: 0.8
    });
    const roadGeo = new THREE.BoxGeometry(22, 0.1, 2);
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.position.set(0, 0.05, 3);
    road.receiveShadow = true;
    road.name = "road";
    structuresGroup.add(road);

    // خطوط الطريق
    const lineMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
    for (let i = -10; i <= 10; i += 2) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.02, 0.05), lineMat);
      line.position.set(i, 0.11, 3);
      structuresGroup.add(line);
    }

    // ====== 4. السكة الحديدية (Railway) ======

    const trackMat = new THREE.MeshStandardMaterial({
      color: 0x7F8C8D,
      metalness: 0.8,
      roughness: 0.3
    });
    const trackGeo = new THREE.BoxGeometry(22, 0.1, 1.2);
    const track = new THREE.Mesh(trackGeo, trackMat);
    track.position.set(0, 0.05, 5.5);
    track.receiveShadow = true;
    track.name = "railway";
    structuresGroup.add(track);

    // عوارض خشبية للسكة
    const sleeperMat = new THREE.MeshStandardMaterial({ color: 0x5D4037 });
    for (let i = -10; i <= 10; i += 0.8) {
      const sleeper = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.05, 1.6), sleeperMat);
      sleeper.position.set(i, 0.06, 5.5);
      structuresGroup.add(sleeper);
    }

    // ====== 5. الجسر (Bridge) ======

    const bridgeMat = new THREE.MeshStandardMaterial({
      color: 0xBDC3C7,
      metalness: 0.3,
      roughness: 0.5
    });
    const bridgeGeo = new THREE.BoxGeometry(8, 0.2, 2.2);
    const bridge = new THREE.Mesh(bridgeGeo, bridgeMat);
    bridge.position.set(0, 2, -3);
    bridge.castShadow = true;
    bridge.receiveShadow = true;
    bridge.name = "bridge";
    structuresGroup.add(bridge);

    // دعامات الجسر
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x7F8C8D,
      roughness: 0.7
    });
    const pillarLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 2), pillarMat);
    pillarLeft.position.set(-3.5, 1, -3);
    pillarLeft.castShadow = true;
    structuresGroup.add(pillarLeft);

    const pillarRight = pillarLeft.clone();
    pillarRight.position.set(3.5, 1, -3);
    structuresGroup.add(pillarRight);

    // كابلات الجسر المعلق
    for (let i = -3; i <= 3; i += 0.5) {
      if (Math.abs(i) < 0.1) continue;
      const points = [
        new THREE.Vector3(i, 2.1, -3),
        new THREE.Vector3(i * 0.3, 4, -3),
        new THREE.Vector3(i * 0.1, 4.5, -3)
      ];
      const curve = new THREE.CatmullRomCurve3(points);
      const geometry = new THREE.TubeGeometry(curve, 20, 0.02, 8, false);
      const cable = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0x7F8C8D }));
      structuresGroup.add(cable);
    }

    // ====== 6. المباني الحضرية (Buildings) ======

    const bldMat1 = new THREE.MeshStandardMaterial({
      color: 0x34495E,
      roughness: 0.5
    });
    const bld1 = new THREE.Mesh(new THREE.BoxGeometry(1.5, 3.5, 1.5), bldMat1);
    bld1.position.set(-10, 1.75, 1);
    bld1.castShadow = true;
    structuresGroup.add(bld1);

    const bldMat2 = new THREE.MeshStandardMaterial({
      color: 0x16A085,
      roughness: 0.4
    });
    const bld2 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 5, 1.2), bldMat2);
    bld2.position.set(-8, 2.5, 1);
    bld2.castShadow = true;
    structuresGroup.add(bld2);

    const bldMat3 = new THREE.MeshStandardMaterial({
      color: 0xE67E22,
      roughness: 0.6
    });
    const bld3 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.5, 1.8), bldMat3);
    bld3.position.set(-10, 1.25, -0.5);
    bld3.castShadow = true;
    structuresGroup.add(bld3);

    // ====== 7. المنجم (Mine) ======

    const mineMat = new THREE.MeshStandardMaterial({
      color: 0x1A252F,
      wireframe: true,
      roughness: 0.8
    });
    const mineGeo = new THREE.BoxGeometry(3, 1.8, 3);
    const mine = new THREE.Mesh(mineGeo, mineMat);
    mine.position.set(0, -2, 0);
    mine.name = "mine";
    structuresGroup.add(mine);

    // ====== 8. أشجار وزينة (Trees & Decoration) ======

    const treeMat = new THREE.MeshStandardMaterial({ color: 0x2ECC71 });
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x795548 });

    const treePositions = [
      [-8, 0, 6.5],
      [-6, 0, 6.8],
      [8, 0, 6.5],
      [10, 0, 6.2],
      [-8, 0, -0.5],
      [8, 0, -0.5]
    ];

    treePositions.forEach(pos => {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.5), trunkMat);
      trunk.position.set(pos[0], 0.25, pos[2]);
      structuresGroup.add(trunk);

      const leaves = new THREE.Mesh(new THREE.SphereGeometry(0.3, 6), treeMat);
      leaves.position.set(pos[0], 0.6, pos[2]);
      structuresGroup.add(leaves);
    });

    // إضافة المجموعات إلى المشهد
    scene.add(structuresGroup);
    scene.add(sensorGroup);

    // ====== حلقة الأنيميشن ======

    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      // دوران بطيء للمشهد
      if (!isSystemFrozen) {
        structuresGroup.rotation.y = Math.sin(clock.getElapsedTime() * 0.05) * 0.1;
        sensorGroup.rotation.y = structuresGroup.rotation.y;
      }

      // تحريك الكاميرا بسلاسة
      let targetX = 0, targetY = 12, targetZ = 18;
      if (projectType === "tunnel") { targetX = -6; targetY = 6; targetZ = 8; }
      else if (projectType === "dam") { targetX = 6; targetY = 6; targetZ = 8; }
      else if (projectType === "bridge") { targetX = 0; targetY = 4; targetZ = 6; }
      else if (projectType === "road") { targetX = 0; targetY = 3; targetZ = 9; }
      else if (projectType === "railway") { targetX = 0; targetY = 3; targetZ = 12; }
      else if (projectType === "mine") { targetX = 0; targetY = -1; targetZ = 8; }

      camera.position.x += (targetX - camera.position.x) * 0.05;
      camera.position.y += (targetY - camera.position.y) * 0.05;
      camera.position.z += (targetZ - camera.position.z) * 0.05;
      camera.lookAt(targetX, targetY - 3, targetZ - 10);

      renderer.render(scene, camera);
    };

    animate();

    // ====== معالج تغيير حجم النافذة ======

    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const newWidth = mountRef.current.clientWidth;
      const newHeight = 400;
      cameraRef.current.aspect = newWidth / newHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    // ====== التنظيف ======

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      scene.clear();
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [projectType, isSystemFrozen]);

  // ============================================================
  // 4.6. useEffect للتحكم في إظهار/إخفاء الحساسات
  // ============================================================

  useEffect(() => {
    if (!sensorGroupRef.current) return;

    // تنظيف الحساسات القديمة
    while (sensorGroupRef.current.children.length > 0) {
      const child = sensorGroupRef.current.children[0];
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
      sensorGroupRef.current.remove(child);
    }

    if (!showSensors) return;

    // إضافة الحساسات اليدوية
    manualSensors.forEach(s => {
      if (!sensorGroupRef.current) return;
      const geo = s.type === 'V'
        ? new THREE.BoxGeometry(0.35, 0.6, 0.35)
        : new THREE.CylinderGeometry(0.2, 0.2, 0.6, 8);
      const mat = new THREE.MeshBasicMaterial({
        color: s.color,
        transparent: true,
        opacity: 0.9
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(s.position[0], s.position[1], s.position[2]);
      mesh.name = `sensor-${s.id}`;

      // إضافة كرة مضيئة حول الحساس
      const glowGeo = new THREE.SphereGeometry(0.15, 8, 8);
      const glowMat = new THREE.MeshBasicMaterial({
        color: s.color,
        transparent: true,
        opacity: 0.3
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.position.set(s.position[0], s.position[1], s.position[2]);
      sensorGroupRef.current.add(glow);
      sensorGroupRef.current.add(mesh);
    });
  }, [manualSensors, showSensors]);

  // ============================================================
  // 4.7. useEffect للتحكم في إظهار/إخفاء الهياكل
  // ============================================================

  useEffect(() => {
    if (structuresGroupRef.current) {
      structuresGroupRef.current.visible = showStructures;
    }
  }, [showStructures]);

  // ============================================================
  // 4.8. دوال المساعدة (Helper Functions)
  // ============================================================

  const fireAlert = async (reading: any): Promise<void> => {
    const email = localStorage.getItem("deepsync_alert_email") || "";
    const phone = localStorage.getItem("deepsync_alert_phone") || "";
    if (!email && !phone) return;

    const now = Date.now();
    if (now - lastAlertRef.current < 300000) return;
    lastAlertRef.current = now;

    try {
      const apiUrl = (import.meta as any).env?.VITE_API_URL || "";
      if (!apiUrl) {
        console.warn("⚠️ API URL non configurée");
        setEmailSentBanner(`⚠️ Configuration API manquante`);
        setTimeout(() => setEmailSentBanner(""), 6000);
        return;
      }

      const response = await fetch(`${apiUrl}/api/alerts/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: email || undefined,
          phone: phone || undefined,
          severity: reading.status,
          sValue: reading.vertical_mm,
          sCurve: reading.criticalLimitValue,
          ratio: reading.riskRatio,
          sensor: deviceId,
          projectId,
          rate: reading.riskRatio * 100,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setEmailSentBanner(`🚨 Alerte envoyée avec succès!`);
      setTimeout(() => setEmailSentBanner(""), 6000);
    } catch (error) {
      console.error("❌ Erreur d'envoi d'alerte:", error);
      setEmailSentBanner(`⚠️ Échec d'envoi: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      setTimeout(() => setEmailSentBanner(""), 6000);
    }
  };

  const handleAnalyzeSensors = (): void => {
    try {
      const points = TwinEngine.calculateOptimalSensorPlacement({
        type: projectType,
        length: 500,
        height: 100,
        geology: 'hard-rock',
        waterTableDepth: 10
      });
      console.log("النقاط المقترحة:", points);
      setSensors(points);
      setEmailSentBanner(`✅ Analyse terminée: ${points.length} capteurs recommandés`);
      setTimeout(() => setEmailSentBanner(""), 6000);
    } catch (error) {
      console.error("❌ Erreur d'analyse:", error);
      setEmailSentBanner(`⚠️ Erreur d'analyse: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      setTimeout(() => setEmailSentBanner(""), 6000);
    }
  };

  const handleUndo = (): void => {
    setManualSensors(prev => prev.slice(0, -1));
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLDivElement>): void => {
    if (!activePlacementMode || !mountRef.current || !cameraRef.current || !sceneRef.current) return;

    const rect = mountRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);

    const intersects = raycaster.intersectObjects(sceneRef.current.children, true);

    if (intersects.length > 0) {
      const intersectPoint = intersects[0].point;
      const newSensor: CustomSensor = {
        id: `sensor-${Date.now()}`,
        type: activePlacementMode,
        position: [intersectPoint.x, intersectPoint.y, intersectPoint.z],
        color: activePlacementMode === 'V' ? "#00E676" : "#FFD600"
      };

      setManualSensors(prev => [...prev, newSensor]);
      setActivePlacementMode(null);
    }
  };

  const toggleMode = (): void => {
    setIsSimulation(!isSimulation);
    setIsRealMode(!isRealMode);
  };

  const handleStartMock = (): void => {
    setStatus('MOCK');
    setIsFakeSimulation(true);
  };

  const handleStop = (): void => {
    setStatus('IDLE');
    setIsFakeSimulation(false);
    setIsLiveActive(false);
  };

  // ============================================================
  // 4.9. المتغيرات المحسوبة (Computed Values)
  // ============================================================

  const statusColor = STATUS_COLORS[current.status] || "#95A5A6";
  const statusLabel = (current.status || "safe").toUpperCase();
  const liveColors: Record<string, string> = {
    connecting: "#F39C12",
    live: "#27AE60",
    offline: "#E74C3C"
  };
  const currentRatio = current.vertical_mm > 0.1 ? current.horizontal_mm / current.vertical_mm : 0;

  const activeKPIs = [
    { label: "Déplacement Vertical (S)", value: `${current.vertical_mm.toFixed(2)} mm`, color: "#2E86DE", icon: "📉" },
    { label: "Déplacement Horizontal (Sh)", value: `${current.horizontal_mm.toFixed(2)} mm`, color: "#F39C12", icon: "📏" },
    { label: "Rapport de Risque", value: `${(current.riskRatio * 100).toFixed(1)}%`, color: "#8E44AD", icon: "📐" },
    { label: "Seuil Critique Limite", value: `${current.criticalLimitValue.toFixed(1)} mm`, color: "#E74C3C", icon: "〰️" },
  ];

  if (projectType === "dam") {
    activeKPIs.push({
      label: "Pression Interstitielle (U)",
      value: `${current.pore_pressure_kpa?.toFixed(1)} kPa`,
      color: "#1ABC9C",
      icon: "💧"
    });
  } else if (projectType === "tunnel") {
    activeKPIs.push({
      label: "Contrainte Totale (σ)",
      value: `${current.total_stress_kpa?.toFixed(1)} kPa`,
      color: "#34495E",
      icon: "🧱"
    });
  }

  // ============================================================
  // 4.10. الـ Render (JSX)
  // ============================================================

  return (
    <div style={{
      padding: "10px",
      background: "#0B111E",
      minHeight: "100vh",
      color: "#fff",
      fontFamily: "'Segoe UI', system-ui, sans-serif"
    }}>
      {/* ====== بانر الإشعارات ====== */}
      {emailSentBanner && (
        <div style={{
          background: "#1F2A38",
          border: "1.5px solid #27AE60",
          borderRadius: "10px",
          padding: "10px 18px",
          marginBottom: "14px",
          color: "#27AE60",
          fontWeight: "bold",
          fontSize: "14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          <span>{emailSentBanner}</span>
          <button
            onClick={() => setEmailSentBanner("")}
            style={{
              background: "transparent",
              border: "none",
              color: "#888",
              cursor: "pointer",
              fontSize: "18px"
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ====== الهيدر ====== */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "20px",
        flexWrap: "wrap",
        gap: "12px"
      }}>
        <div>
          <div style={{ fontSize: "13px", color: "#888", marginBottom: "2px" }}>
            {deviceId} · PROJET: {projectId}
          </div>
          <div style={{ fontSize: "22px", fontWeight: "700", color: "#00E676" }}>
            RAYGEO - Surveillance Géotechnique Multimodale
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: "#1F2A38",
            border: "1.5px solid #374151",
            padding: "6px 12px",
            borderRadius: "10px"
          }}>
            <span style={{ fontSize: "13px", color: "#9CA3AF", fontWeight: "bold" }}>🏗️ Ouvrage:</span>
            <select
              value={projectType}
              onChange={e => {
                setProjectType(e.target.value as ProjectType);
                setVerticalData([]);
                setHorizontalData([]);
                setScatterPoints([]);
              }}
              style={{
                background: "transparent",
                border: "none",
                fontSize: "13px",
                fontWeight: "bold",
                color: "#00E676",
                outline: "none",
                cursor: "pointer"
              }}
            >
              <option value="embankment">Remblai (Embankment)</option>
              <option value="road">Route (Road)</option>
              <option value="tunnel">Tunnel (Tunnel)</option>
              <option value="mine">Mine & Galerie (Mine)</option>
              <option value="dam">Barrage (Dam)</option>
              <option value="bridge">Pont (Bridge)</option>
              <option value="railway">Voie Ferrée (Railway)</option>
            </select>
          </div>

          <div style={{
            background: liveColors[liveStatus],
            color: "#fff",
            padding: "6px 16px",
            borderRadius: "20px",
            fontSize: "12px",
            fontWeight: "bold"
          }}>
            {liveStatus === "live" ? "📡 LIVE" : "⏳ RECONNEXION"}
          </div>

          <div style={{
            background: statusColor,
            color: "#fff",
            padding: "10px 24px",
            borderRadius: "30px",
            fontSize: "18px",
            fontWeight: "bold"
          }}>
            {statusLabel}
          </div>
        </div>
      </div>

      {/* ====== لوحة التحكم المركزية ====== */}
      <div style={{
        background: "#151F32",
        border: "1px solid #2A3B50",
        borderRadius: "12px",
        padding: "15px",
        marginBottom: "20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "12px"
      }}>
        <div>
          <h4 style={{ margin: 0, color: "#fff", fontSize: "14px" }}>
            🔧 Système de Pilotage Centralisé
          </h4>
          <p style={{ margin: 0, color: "#888", fontSize: "11px" }}>
            Interconnexion en temps réel des simulations et des modes de capture.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            onClick={() => setIsLiveActive(!isLiveActive)}
            style={{
              background: isLiveActive ? "#C0392B" : "#27AE60",
              color: "#fff",
              border: "none",
              padding: "10px 16px",
              borderRadius: "8px",
              fontWeight: "bold",
              cursor: "pointer",
              fontSize: "12px"
            }}
          >
            {isLiveActive ? "🔴 إيقاف المحاكاة" : "🟢 تشغيل المحاكاة"}
          </button>

          <button
            onClick={() => setIsSystemFrozen(!isSystemFrozen)}
            style={{
              background: isSystemFrozen ? "#D35400" : "#2C3E50",
              color: "#fff",
              border: "none",
              padding: "10px 16px",
              borderRadius: "8px",
              fontWeight: "bold",
              cursor: "pointer",
              fontSize: "12px"
            }}
          >
            ⚠️ {isSystemFrozen ? "DÉGELER" : "FREEZE GLOBAL"}
          </button>

          <button
            onClick={() => {
              setIsRealMode(true);
              setIsFakeSimulation(false);
            }}
            style={{
              background: isRealMode ? "#27AE60" : "#2C3E50",
              color: "#fff",
              border: "none",
              padding: "10px 16px",
              borderRadius: "8px",
              fontWeight: "bold",
              cursor: "pointer",
              fontSize: "12px"
            }}
          >
            🟢 MODE RÉEL
          </button>

          <button
            onClick={() => {
              setIsRealMode(false);
              setIsFakeSimulation(!isFakeSimulation);
            }}
            style={{
              background: isFakeSimulation ? "#C0392B" : "#2C3E50",
              color: "#fff",
              border: "none",
              padding: "10px 16px",
              borderRadius: "8px",
              fontWeight: "bold",
              cursor: "pointer",
              fontSize: "12px"
            }}
          >
            🔥 SIMULATION
          </button>
        </div>
      </div>

      {/* ====== التوأم الرقمي ونظام الحساسات ====== */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1.3fr 0.7fr",
        gap: "16px",
        marginBottom: "20px"
      }}>
        {/* شاشة الـ 3D */}
        <div style={{
          background: "#111A2E",
          border: "1px solid #233149",
          padding: "20px",
          borderRadius: "12px",
          position: "relative"
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "12px",
            flexWrap: "wrap",
            gap: "8px"
          }}>
            <h3 style={{ color: "#00E676", margin: 0, fontSize: "16px" }}>
              🧬 Jumeau Numérique Unifié (Multi-Infrastructures 3D Engine)
            </h3>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button
                onClick={() => setActivePlacementMode('V')}
                style={{
                  background: activePlacementMode === 'V' ? "#00E676" : "#1F2A38",
                  color: activePlacementMode === 'V' ? "#000" : "#fff",
                  border: "1px solid #374151",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  fontSize: "11px",
                  cursor: "pointer",
                  fontWeight: "bold"
                }}
              >
                ➕ Sensor V (عمودي)
              </button>
              <button
                onClick={() => setActivePlacementMode('H')}
                style={{
                  background: activePlacementMode === 'H' ? "#FFD600" : "#1F2A38",
                  color: activePlacementMode === 'H' ? "#000" : "#fff",
                  border: "1px solid #374151",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  fontSize: "11px",
                  cursor: "pointer",
                  fontWeight: "bold"
                }}
              >
                ➕ Sensor H (أفقي)
              </button>
              <button
                onClick={handleUndo}
                style={{
                  background: "#C0392B",
                  color: "#fff",
                  border: "none",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  fontSize: "11px",
                  cursor: "pointer",
                  fontWeight: "bold"
                }}
              >
                ⏮️ التراجع (Undo)
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
            <button
              onClick={() => setShowSensors(!showSensors)}
              style={{
                background: "#1F2A38",
                color: "#fff",
                border: "none",
                padding: "4px 8px",
                borderRadius: "4px",
                fontSize: "10px",
                cursor: "pointer"
              }}
            >
              {showSensors ? "👁️ Masquer Capteurs" : "👁️ Afficher Capteurs"}
            </button>
            <button
              onClick={() => setShowStructures(!showStructures)}
              style={{
                background: "#1F2A38",
                color: "#fff",
                border: "none",
                padding: "4px 8px",
                borderRadius: "4px",
                fontSize: "10px",
                cursor: "pointer"
              }}
            >
              {showStructures ? "🏗️ Masquer Ouvrage" : "🏗️ Afficher Ouvrage"}
            </button>
          </div>

          <div
            ref={mountRef}
            onClick={handleCanvasClick}
            style={{
              width: "100%",
              height: 400,
              borderRadius: "10px",
              overflow: "hidden",
              position: "relative",
              cursor: activePlacementMode ? "crosshair" : "default",
              border: activePlacementMode ? "2px dashed #00E676" : "none"
            }}
          >
            {activePlacementMode && (
              <div style={{
                position: "absolute",
                top: "10px",
                left: "10px",
                background: "rgba(0, 230, 118, 0.9)",
                color: "#000",
                padding: "6px 12px",
                borderRadius: "4px",
                fontSize: "11px",
                fontWeight: "bold",
                zIndex: 10
              }}>
                وضع التموضع نشط: انقر الآن في أي مكان بالمجسم لوضع الحساس اليدوي
              </div>
            )}
          </div>
        </div>

        {/* قائمة الحساسات والمعلومات */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{
            background: "#111A2E",
            border: "1px solid #233149",
            padding: "16px",
            borderRadius: "12px"
          }}>
            <h4 style={{ margin: "0 0 10px", color: "#00E676", fontSize: "14px" }}>
              📍 Liste des Capteurs Déployés
            </h4>
            <div style={{
              maxHeight: "200px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "6px"
            }}>
              {manualSensors.length === 0 ? (
                <span style={{ fontSize: "11px", color: "#888" }}>
                  Aucun capteur posé manuellement.
                </span>
              ) : (
                manualSensors.map(s => (
                  <div key={s.id} style={{
                    background: "#1A263B",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}>
                    <span>📡 Capteur {s.type}</span>
                    <span style={{ color: s.color }}>
                      [{s.position.map(p => p.toFixed(1)).join(", ")}]
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* زر تحليل الحساسات */}
            <div style={{ marginTop: "15px", paddingTop: "15px", borderTop: "1px solid #2A3B50" }}>
              <button
                onClick={handleAnalyzeSensors}
                style={{
                  background: "#2980B9",
                  color: "#fff",
                  border: "none",
                  padding: "10px 16px",
                  borderRadius: "8px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  fontSize: "12px",
                  width: "100%"
                }}
              >
                🔍 ANALYSER: Générer le meilleur emplacement des capteurs
              </button>
            </div>
          </div>

          <div style={{
            background: "#111A2E",
            border: "1px solid #233149",
            padding: "16px",
            borderRadius: "12px",
            flex: 1
          }}>
            <h4 style={{ margin: "0 0 10px", color: "#00E676", fontSize: "13px" }}>
              💡 Analyse Globale
            </h4>
            <p style={{ fontSize: "11px", color: "#aaa", margin: 0 }}>
              تم دمج كافة الوحدات الإنشائية (الجبل، النفق، السد، السكة الحديدية، الطريق، المباني والمنجم) في مساحة موحدة لضمان الفهم الشامل للعلاقات الجيوميكانيكية المتبادلة.
            </p>
          </div>
        </div>
      </div>

      {/* ====== بطاقات KPI ====== */}
      <div style={{
        display: "grid",
        gridTemplateColumns: `repeat(${activeKPIs.length}, 1fr)`,
        gap: "12px",
        marginBottom: "20px"
      }}>
        {activeKPIs.map(({ label, value, color, icon }) => (
          <div key={label} style={{
            background: "#111A2E",
            padding: "14px 12px",
            borderRadius: "12px",
            border: "1px solid #233149",
            textAlign: "center",
            borderTop: `3px solid ${color}`
          }}>
            <div style={{ fontSize: "18px", marginBottom: "4px" }}>{icon}</div>
            <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>{label}</div>
            <div style={{ fontSize: "19px", fontWeight: "bold", color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* ====== الرسوم البيانية ====== */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "16px",
        marginBottom: "16px"
      }}>
        <div style={{
          background: "#111A2E",
          border: "1px solid #233149",
          padding: "20px",
          borderRadius: "12px"
        }}>
          <h3 style={{ color: "#2E86DE", marginTop: 0, marginBottom: "16px", fontSize: "14px" }}>
            Tassement Vertical (S) - Historique Récent
          </h3>
          <div style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={verticalData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#233149" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#aaa" }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: "#aaa" }} unit=" mm" />
                <Tooltip contentStyle={{ background: "#111A2E", border: "1px solid #233149" }} />
                <Line type="monotone" dataKey="s" stroke="#2E86DE" strokeWidth={2} dot={false} isAnimationActive={false} />
                <ReferenceLine y={current.criticalLimitValue} stroke="#E74C3C" strokeDasharray="4 4" label="Seuil" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{
          background: "#111A2E",
          border: "1px solid #233149",
          padding: "20px",
          borderRadius: "12px"
        }}>
          <h3 style={{ color: "#F39C12", marginTop: 0, marginBottom: "16px", fontSize: "14px" }}>
            Déplacement Horizontal / Convergence (Sh)
          </h3>
          <div style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={horizontalData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#233149" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#aaa" }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: "#aaa" }} unit=" mm" />
                <Tooltip contentStyle={{ background: "#111A2E", border: "1px solid #233149" }} />
                <Line type="monotone" dataKey="sh" stroke="#F39C12" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ====== منحنى Matsuo-Kawamura ====== */}
      <div style={{
        background: "#111A2E",
        border: "1px solid #233149",
        padding: "20px",
        borderRadius: "12px",
        marginBottom: "16px"
      }}>
        <h3 style={{ color: "#E74C3C", marginTop: 0, marginBottom: "4px", fontSize: "14px" }}>
          Graphe de Stabilité Géotechnique (Méthode de Matsuo-Kawamura)
        </h3>
        <p style={{ color: "#888", fontSize: "11px", margin: "0 0 16px" }}>
          Analyse de stabilité basée sur l'évolution du rapport (δ/s) et l'affaissement cumulé (s).
        </p>
        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#233149" />
              <XAxis type="number" dataKey="ratio" name="δ/s" domain={[0, 1]} tick={{ fontSize: 10, fill: "#aaa" }} />
              <YAxis type="number" dataKey="s" name="s" domain={[0, 12]} tick={{ fontSize: 10, fill: "#aaa" }} />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={{ background: "#111A2E", border: "1px solid #233149" }} />
              <Legend />
              <Scatter
                name="Ligne Limite"
                data={stabilityCurve}
                fill="#E74C3C"
                opacity={0.6}
                line={{ stroke: "#E74C3C", strokeWidth: 2.5 }}
              />
              <Scatter name="Trajectoire" data={scatterPoints} fill="#2E86DE" opacity={0.5} />
              <Scatter
                name="Point Actuel"
                data={[{
                  ratio: parseFloat(currentRatio.toFixed(4)),
                  s: parseFloat(current.vertical_mm.toFixed(3))
                }]}
                fill={statusColor}
                shape="circle"
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ====== مناطق الحالة ====== */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "12px"
      }}>
        {ZONES.map(z => (
          <div key={z.label} style={{
            background: z.color,
            color: "#fff",
            padding: "12px 16px",
            borderRadius: "10px",
            textAlign: "center"
          }}>
            <div style={{ fontSize: "18px" }}>{z.emoji}</div>
            <div style={{ fontWeight: "bold", fontSize: "13px" }}>{z.label}</div>
            <div style={{ fontSize: "11px", opacity: 0.9, marginTop: "2px" }}>{z.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}