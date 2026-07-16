import { Router, type IRouter, Request, Response, NextFunction } from "express"; // 1. أضفنا استيراد الأنواع
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// 2. تحديث تعريف الدالة باستخدام الأنواع الصريحة (Request, Response, NextFunction)
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const role = req.headers["x-user-role"];
  if (role !== "admin") {
    res.status(403).json({ error: "Accès réservé aux administrateurs" });
    return;
  }
  next();
}

// GET /api/users — list all users (admin only)
router.get("/users", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await db.select({
      id: usersTable.id,
      fullName: usersTable.fullName,
      email: usersTable.email,
      role: usersTable.role,
      companyName: usersTable.companyName,
      language: usersTable.language,
      maxProjects: usersTable.maxProjects,
      isActive: usersTable.isActive,
      projectId: usersTable.projectId,
      createdAt: usersTable.createdAt,
      lastLoginAt: usersTable.lastLoginAt,
    }).from(usersTable).orderBy(usersTable.createdAt);
    res.json({ ok: true, users });
  } catch (err) {
    // استخدم أي وسيلة تسجيل أخطاء متاحة لديك
    console.error("List users error:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /api/users — create user (admin only)
router.post("/users", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { fullName, email, password, role, companyName, language, maxProjects, projectId } = req.body as {
    fullName: string; email: string; password: string; role: string;
    companyName?: string; language?: string; maxProjects?: number; projectId?: string;
  };
  
  if (!fullName || !email || !password || !role) {
    res.status(400).json({ error: "Les champs fullName, email, password et role sont requis." });
    return;
  }
  
  if (!["admin", "engineer", "viewer"].includes(role)) {
    res.status(400).json({ error: "Rôle non valide." });
    return;
  }
  
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const [user] = await db.insert(usersTable).values({
      fullName, email: email.toLowerCase().trim(), passwordHash,
      role, companyName: companyName || "", language: language || "fr",
      maxProjects: maxProjects ?? 5, projectId: projectId || "PROJ_001",
    }).returning({ id: usersTable.id, fullName: usersTable.fullName, email: usersTable.email, role: usersTable.role });
    res.status(201).json({ ok: true, user });
  } catch (err: unknown) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// PUT /api/users/:id — update user (admin only)
router.put("/users/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  const { fullName, email, password, role, companyName, language, maxProjects, isActive, projectId } = req.body as any;
  
  try {
    const updates: any = {};
    if (fullName) updates.fullName = fullName;
    if (email) updates.email = email.toLowerCase().trim();
    if (role) updates.role = role;
    if (password && password.length >= 4) updates.passwordHash = await bcrypt.hash(password, 10);
    
    const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning({ id: usersTable.id });
    if (!updated) { res.status(404).json({ error: "Utilisateur non trouvé" }); return; }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// DELETE /api/users/:id — delete user (admin only)
router.delete("/users/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  try {
    const [deleted] = await db.delete(usersTable).where(eq(usersTable.id, id)).returning({ id: usersTable.id });
    if (!deleted) { res.status(404).json({ error: "Utilisateur non trouvé" }); return; }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// PUT /api/users/:id/contacts — each user saves their own alert email+phone
router.put("/users/:id/contacts", async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  const requesterId = Number(req.headers["x-user-id"]);
  const requesterRole = req.headers["x-user-role"] as string;

  if (requesterRole !== "admin" && requesterId !== id) {
    res.status(403).json({ error: "Non autorisé" });
    return;
  }

  const { alertEmail, alertPhone } = req.body as { alertEmail?: string; alertPhone?: string };
  try {
    await db.update(usersTable)
      .set({ alertEmail: alertEmail || null, alertPhone: alertPhone || null })
      .where(eq(usersTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;