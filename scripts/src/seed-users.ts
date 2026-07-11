import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";

const DEMO_USERS = [
  { fullName: "Mohammed Amine Bensalem", email: "admin@deepsync.dz",      password: "admin123", role: "admin",    companyName: "DeepSync DZ",              language: "ar", maxProjects: 999, projectId: "PROJ_001" },
  { fullName: "Karim Boudiaf",           email: "ingenieur@chantier.dz",  password: "eng123",   role: "engineer", companyName: "Géotechnique Algérie SARL", language: "fr", maxProjects: 10,  projectId: "PROJ_001" },
  { fullName: "Sara Mansouri",           email: "viewer@site.dz",         password: "view123",  role: "viewer",   companyName: "BTP Corp",                  language: "en", maxProjects: 0,   projectId: "PROJ_001" },
];

async function seed() {
  console.log("Seeding users...");
  for (const u of DEMO_USERS) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await db.insert(usersTable).values({ ...u, passwordHash }).onConflictDoNothing();
    console.log(`  ✓ ${u.email} (${u.role})`);
  }
  console.log("Done.");
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
