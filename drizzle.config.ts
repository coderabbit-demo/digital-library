import "./src/db/load-env";
import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit config (DL-14). `generate` produces SQL migrations offline from
 * the schema; `migrate`/`push` use DATABASE_URL (loaded from .env(.local) by the
 * import above, or injected by the platform on deploy).
 */
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env and set it (see README → Local development).",
  );
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: { url: databaseUrl },
  strict: true,
  verbose: true,
});
