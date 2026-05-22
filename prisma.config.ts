import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Load environment files
config({ path: [".env.local", ".env"] }); // Load .env.local first, then .env (local takes precedence)
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
