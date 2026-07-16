import { defineConfig } from "drizzle-kit";

// هذا هو الكود النهائي المباشر
export default defineConfig({
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});