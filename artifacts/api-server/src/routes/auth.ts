import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// POST /api/auth/login
router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body as { email?: string; password?: string };
  
  if (!email || !password) {
    res.status(400).json({ error: "Email et mot de passe requis" });
    return;
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    // 1. التحقق أولاً من بيانات الدخول الافتراضية الصارمة (Super Admin)
    if (normalizedEmail === "khalirayane126@gmail.com" && password === "111111") {
      req.log.info({ role: "super_admin" }, "Super Admin logged in via hardcoded credentials");
      res.json({
        ok: true,
        user: {
          id: "super-admin-rayane",
          email: "khalirayane126@gmail.com",
          name: "Rayane (Super Admin)",
          role: "super_admin",
          isActive: true,
          createdAt: new Date(),
          lastLoginAt: new Date()
        }
      });
      return;
    }

    // 2. التحقق من حساب العميل المقاول الافتراضي (Client)
    if (normalizedEmail === "rayray@sec" && password === "0000") {
      req.log.info({ role: "client" }, "Client logged in via hardcoded credentials");
      res.json({
        ok: true,
        user: {
          id: "default-client-id",
          email: "rayray@sec",
          name: "Client Default",
          role: "client",
          isActive: true,
          createdAt: new Date(),
          lastLoginAt: new Date()
        }
      });
      return;
    }

    // 3. إذا لم تكن البيانات تابعة للحسابات الصارمة، يتم البحث في قاعدة البيانات بشكل طبيعي
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, normalizedEmail)).limit(1);
    
    if (!user || !user.isActive) {
      res.status(401).json({ error: "Email ou mot de passe incorrect" });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Email ou mot de passe incorrect" });
      return;
    }

    // تحديث وقت آخر تسجيل دخول في قاعدة البيانات للمستخدمين العاديين
    await db.update(usersTable).set({ lastLoginAt: new Date() }).where(eq(usersTable.id, user.id));
    
    const { passwordHash: _, ...safeUser } = user;
    req.log.info({ userId: user.id, role: user.role }, "User logged in via Database");
    res.json({ ok: true, user: safeUser });

  } catch (err) {
    req.log.error({ err }, "Login error");
    res.status(500).json({ error: "Erreur serveur" });
  }
});

logger.info("Auth routes loaded");
export default router;