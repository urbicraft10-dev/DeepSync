import { useEffect, useState, type ComponentType, createContext, useContext } from "react";
import { modules as discoveredModules } from "./.generated/mockup-components";

// 1. إنشاء سياق مشترك (React Context) لتمرير اللغة والوحدة والحساب المسجل لكل شاشات المنصة
interface GlobalConfigContextType {
  language: "ar" | "fr" | "en";
  setLanguage: (lang: "ar" | "fr" | "en") => void;
  unit: "mm" | "cm" | "dm";
  setUnit: (unit: "mm" | "cm" | "dm") => void;
  user: any;
  setUser: (user: any) => void;
}

export const GlobalConfigContext = createContext<GlobalConfigContextType | undefined>(undefined);

type ModuleMap = Record<string, () => Promise<Record<string, unknown>>>;

function _resolveComponent(
  mod: Record<string, unknown>,
  name: string,
): ComponentType | undefined {
  const fns = Object.values(mod).filter(
    (v) => typeof v === "function",
  ) as ComponentType[];
  return (
    (mod.default as ComponentType) ||
    (mod.Preview as ComponentType) ||
    (mod[name] as ComponentType) ||
    fns[fns.length - 1]
  );
}

function PreviewRenderer({
  componentPath,
  modules,
}: {
  componentPath: string;
  modules: ModuleMap;
}) {
  const [Component, setComponent] = useState<ComponentType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setComponent(null);
    setError(null);

    async function loadComponent(): Promise<void> {
      const key = `./components/mockups/${componentPath}.tsx`;
      const loader = modules[key];
      if (!loader) {
        setError(`No component found at ${componentPath}.tsx`);
        return;
      }

      try {
        const mod = await loader();
        if (cancelled) return;
        
        const name = componentPath.split("/").pop()!;
        const comp = _resolveComponent(mod, name);
        if (!comp) {
          setError(
            `No exported React component found in ${componentPath}.tsx\n\nMake sure the file has at least one exported function component.`,
          );
          return;
        }
        setComponent(() => comp);
      } catch (e) {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : String(e);
        setError(`Failed to load preview.\n${message}`);
      }
    }

    void loadComponent();

    return () => {
      cancelled = true;
    };
  }, [componentPath, modules]);

  if (error) {
    return (
      <pre style={{ color: "#FF1744", padding: "2rem", fontFamily: "monospace", background: "#0B111E" }}>
        {error}
      </pre>
    );
  }

  if (!Component) return null;

  return <Component />;
}

function getBasePath(): string {
  return import.meta.env.BASE_URL.replace(/\/$/, "");
}

// شريط الإعدادات العالمي العلوي لمنصة RAYGEO
function GlobalTopNavBar() {
  const context = useContext(GlobalConfigContext);
  if (!context) return null;

  const { language, setLanguage, unit, setUnit, user, setUser } = context;

  // نصوص الترجمة الخاصة بالبار العلوي للغات الثلاث
  const labels = {
    ar: { title: "منصة RAYGEO السيبرانية", unitLabel: "الوحدة الحركية", logout: "خروج" },
    fr: { title: "Plateforme RAYGEO", unitLabel: "Unité", logout: "Déconnexion" },
    en: { title: "RAYGEO Platform", unitLabel: "Unit", logout: "Logout" }
  };

  const t = labels[language];

  return (
    <div style={{
      width: "100%",
      backgroundColor: "#0B111E",
      borderBottom: "1px solid rgba(0, 230, 118, 0.3)",
      padding: "12px 24px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      boxSizing: "border-box",
      color: "#fff",
      boxShadow: "0 4px 20px rgba(0, 230, 118, 0.1)",
      zIndex: 1000,
      position: "relative"
    }}>
      {/* العنوان والشعار المتوهج */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <span style={{
          color: "#00E676",
          fontWeight: "900",
          fontSize: "22px",
          textShadow: "0 0 10px #00E676",
          letterSpacing: "1px"
        }}>
          RAYGEO
        </span>
        <span style={{ fontSize: "12px", color: "#8fa0bc", borderLeft: "1px solid rgba(255,255,255,0.2)", paddingLeft: "10px" }}>
          {t.title}
        </span>
      </div>

      {/* أزرار التحكم: مبدل اللغات ومبدل الوحدات */}
      <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
        
        {/* مبدل اللغات الثلاث اللحظي */}
        <div style={{ display: "flex", background: "rgba(255,255,255,0.05)", borderRadius: "6px", padding: "2px" }}>
          {(["ar", "fr", "en"] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              style={{
                background: language === lang ? "linear-gradient(90deg, #00B0FF, #00E676)" : "transparent",
                border: "none",
                color: language === lang ? "#fff" : "#8fa0bc",
                padding: "6px 12px",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "12px",
                transition: "0.3s"
              }}
            >
              {lang.toUpperCase()}
            </button>
          ))}
        </div>

        {/* مبدل الوحدات الحركي المنزلق */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "12px", color: "#8fa0bc" }}>{t.unitLabel}:</span>
          <div style={{ display: "flex", background: "rgba(255,255,255,0.05)", borderRadius: "6px", padding: "2px" }}>
            {(["mm", "cm", "dm"] as const).map((u) => (
              <button
                key={u}
                onClick={() => setUnit(u)}
                style={{
                  background: unit === u ? "#00E676" : "transparent",
                  border: "none",
                  color: unit === u ? "#000" : "#fff",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  fontSize: "11px",
                  transition: "0.3s"
                }}
              >
                {u}
              </button>
            ))}
          </div>
        </div>

        {/* معلومات المستخدم وزر تسجيل الخروج */}
        {user && (
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "12px", color: "#00E676", fontWeight: "bold" }}>
              👤 {user.name}
            </span>
            <button
              onClick={() => setUser(null)}
              style={{
                background: "rgba(255, 23, 68, 0.2)",
                border: "1px solid #FF1744",
                color: "#FF1744",
                padding: "6px 12px",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "bold",
                transition: "0.3s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#FF1744"}
              onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255, 23, 68, 0.2)"}
            >
              {t.logout}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Gallery() {
  const context = useContext(GlobalConfigContext);
  const language = context?.language || "ar";

  const labels = {
    ar: {
      welcome: "مرحباً بك في لوحة تحكم RAYGEO",
      desc: "هذا الخادم يقوم بتشغيل ومعاينة لوحات التحكم والتوائم الرقمية الحركية ثلاثية الأبعاد للمشاريع."
    },
    fr: {
      welcome: "Bienvenue sur le tableau de bord RAYGEO",
      desc: "Ce serveur gère et prévisualise les tableaux de bord et les jumeaux numériques 3D."
    },
    en: {
      welcome: "Welcome to RAYGEO Dashboard",
      desc: "This server runs and previews the interactive dashboards and 3D digital twins."
    }
  };

  const t = labels[language];

  return (
    <div style={{
      minHeight: "calc(100vh - 60px)",
      backgroundColor: "#0B111E",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px"
    }}>
      <div style={{
        textAlign: "center",
        maxWidth: "500px",
        background: "rgba(255,255,255,0.03)",
        padding: "40px",
        borderRadius: "16px",
        border: "1px solid rgba(0, 230, 118, 0.2)"
      }}>
        <h1 style={{ color: "#00E676", fontSize: "28px", fontWeight: "900", marginBottom: "15px", textShadow: "0 0 15px rgba(0,230,118,0.4)" }}>
          {t.welcome}
        </h1>
        <p style={{ color: "#8fa0bc", fontSize: "14px", lineHeight: "1.6", marginBottom: "20px" }}>
          {t.desc}
        </p>
        <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
          <a
            href="?preview=Dashboard"
            style={{
              background: "linear-gradient(90deg, #00B0FF, #00E676)",
              color: "#fff",
              padding: "12px 24px",
              borderRadius: "8px",
              textDecoration: "none",
              fontWeight: "bold",
              fontSize: "14px"
            }}
          >
            Open Dashboard / افتح لوحة التحكم
          </a>
        </div>
      </div>
    </div>
  );
}

function getPreviewPath(): string | null {
  const basePath = getBasePath();
  const { pathname, search } = window.location;
  
  // فحص إذا كان مسار المعاينة ممرر كـ query parameter (?preview=Dashboard) لسهولة التوجيه
  const params = new URLSearchParams(search);
  const previewParam = params.get("preview");
  if (previewParam) return previewParam;

  const local =
    basePath && pathname.startsWith(basePath)
      ? pathname.slice(basePath.length) || "/"
      : pathname;
  const match = local.match(/^\/preview\/(.+)$/);
  return match ? match[1] : null;
}

function App() {
  const [language, setLanguage] = useState<"ar" | "fr" | "en">("ar");
  const [unit, setUnit] = useState<"mm" | "cm" | "dm">("mm");
  const [user, setUser] = useState<any>(null); // حفظ بيانات تسجيل الدخول

  const previewPath = getPreviewPath();

  // ضبط اتجاه الصفحة تلقائياً حسب اللغة لحظياً (RTL للعربية و LTR للغات الأخرى)
  useEffect(() => {
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = language;
  }, [language]);

  return (
    <GlobalConfigContext.Provider value={{ language, setLanguage, unit, setUnit, user, setUser }}>
      <div style={{ 
        minHeight: "100vh", 
        backgroundColor: "#0B111E", 
        fontFamily: language === "ar" ? "Cairo, sans-serif" : "sans-serif"
      }}>
        {/* شريط الإعدادات العالمي بالأعلى */}
        <GlobalTopNavBar />

        {/* عرض الصفحة المطلوبة بناء على وجود المسار */}
        {previewPath ? (
          <PreviewRenderer
            componentPath={previewPath}
            modules={discoveredModules}
          />
        ) : (
          <Gallery />
        )}
      </div>
    </GlobalConfigContext.Provider>
  );
}

export default App;