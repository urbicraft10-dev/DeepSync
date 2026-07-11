import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// Simple admin check middleware (checks x-user-role header set by frontend)
function requireAdmin(req: Parameters<Parameters<IRouter["use"]>[0]>[0], res: Parameters<Parameters<IRouter["use"]>[0]>[1], next: Parameters<Parameters<IRouter["use"]>[0]>[2]) {
  const role = req.headers["x-user-role"];
  if (role !== "admin") {
    res.status(403).json({ error: "Accès réservé aux administrateurs" });
    return;
  }
  next();
}

// GET /api/users — list all users (admin only)
router.get("/users", requireAdmin, async (req, res): Promise<void> => {
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
    req.log.error({ err }, "List users error");
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /api/users — create user (admin only)
router.post("/users", requireAdmin, async (req, res): Promise<void> => {
  const { fullName, email, password, role, companyName, language, maxProjects, projectId } = req.body as {
    fullName: string; email: string; password: string; role: string;
    companyName?: string; language?: string; maxProjects?: number; projectId?: string;
  };
  if (!fullName || !email || !password || !role) {
    res.status(400).json({ error: "fullName, email, password, role requis" });
    return;
  }
  if (!["admin", "engineer", "viewer"].includes(role)) {
    res.status(400).json({ error: "Rôle invalide" });
    return;
  }
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const [user] = await db.insert(usersTable).values({
      fullName, email: email.toLowerCase().trim(), passwordHash,
      role, companyName: companyName || "", language: language || "fr",
      maxProjects: maxProjects ?? 5, projectId: projectId || "PROJ_001",
    }).returning({ id: usersTable.id, fullName: usersTable.fullName, email: usersTable.email, role: usersTable.role });
    req.log.info({ userId: user.id, email: user.email }, "User created");
    res.status(201).json({ ok: true, user });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("unique")) {
      res.status(409).json({ error: "Cet email est déjà utilisé" });
    } else {
      req.log.error({ err }, "Create user error");
      res.status(500).json({ error: "Erreur serveur" });
    }
  }
});

// PUT /api/users/:id — update user (admin only)
router.put("/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const { fullName, email, password, role, companyName, language, maxProjects, isActive, projectId } = req.body as {
    fullName?: string; email?: string; password?: string; role?: string;
    companyName?: string; language?: string; maxProjects?: number; isActive?: boolean; projectId?: string;
  };
  try {
    const updates: Partial<typeof usersTable.$inferInsert> = {};
    if (fullName) updates.fullName = fullName;
    if (email) updates.email = email.toLowerCase().trim();
    if (role) updates.role = role;
    if (companyName !== undefined) updates.companyName = companyName;
    if (language) updates.language = language;
    if (maxProjects !== undefined) updates.maxProjects = maxProjects;
    if (isActive !== undefined) updates.isActive = isActive;
    if (projectId) updates.projectId = projectId;
    if (password && password.length >= 4) updates.passwordHash = await bcrypt.hash(password, 10);
    const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning({ id: usersTable.id });
    if (!updated) { res.status(404).json({ error: "Utilisateur non trouvé" }); return; }
    req.log.info({ userId: id }, "User updated");
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Update user error");
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// DELETE /api/users/:id — delete user (admin only)
router.delete("/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  try {
    const [deleted] = await db.delete(usersTable).where(eq(usersTable.id, id)).returning({ id: usersTable.id });
    if (!deleted) { res.status(404).json({ error: "Utilisateur non trouvé" }); return; }
    req.log.info({ userId: id }, "User deleted");
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Delete user error");
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// PUT /api/users/:id/contacts — each user saves their own alert email+phone
router.put("/users/:id/contacts", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const requesterId = Number(req.headers["x-user-id"]);
  const requesterRole = req.headers["x-user-role"] as string;

  // Users can only update their own contacts (admins can update anyone's)
  if (requesterRole !== "admin" && requesterId !== id) {
    res.status(403).json({ error: "Non autorisé" });
    return;
  }

  const { alertEmail, alertPhone } = req.body as { alertEmail?: string; alertPhone?: string };
  try {
    await db.update(usersTable)
      .set({ alertEmail: alertEmail || null, alertPhone: alertPhone || null })
      .where(eq(usersTable.id, id));
    req.log.info({ userId: id }, "User contacts updated");
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Update contacts error");
    res.status(500).json({ error: "Erreur serveur" });
  }
});

logger.info("Users routes loaded");
export default router;
