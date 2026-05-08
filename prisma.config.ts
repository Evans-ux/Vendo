import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Standard setup for Supabase + Prisma 7:
    // Use DIRECT_URL for CLI commands (push/migrate/pull)
    url: process.env["DIRECT_URL"] || process.env["DATABASE_URL"],
  },
});
