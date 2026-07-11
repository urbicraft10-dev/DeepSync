import { pgTable, serial, text, varchar, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: varchar("role", { length: 20 }).notNull().default("viewer"),
  companyName: text("company_name").notNull().default(""),
  language: varchar("language", { length: 10 }).notNull().default("fr"),
  maxProjects: integer("max_projects").notNull().default(5),
  isActive: boolean("is_active").notNull().default(true),
  projectId: varchar("project_id", { length: 50 }).default("PROJ_001"),
  alertEmail: text("alert_email"),
  alertPhone: varchar("alert_phone", { length: 30 }),
  createdAt: timestamp("created_at").defaultNow(),
  lastLoginAt: timestamp("last_login_at"),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, passwordHash: true, createdAt: true, lastLoginAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
