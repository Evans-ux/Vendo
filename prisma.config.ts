import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Load .env.local file
config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Use DIRECT_URL for CLI commands (push/migrate/pull)
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || "",
  },
});
