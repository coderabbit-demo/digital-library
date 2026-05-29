import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit config (DL-14). `generate` produces SQL migrations offline from
 * the schema; `migrate`/`push` use DATABASE_URL (wired in DL-15/DL-17).
 */
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://localhost:5432/libraryloop",
  },
  strict: true,
  verbose: true,
});
